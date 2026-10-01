import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import { buildReportSnapshot } from "@/lib/reports/reportCardLifecycle"

function endOfAcademicPeriod(value: Date) {
  const end = new Date(value)
  end.setUTCHours(23, 59, 59, 999)
  return end
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SUPER_ADMIN", "SCHOOL_ADMIN"])
    if (!access.ok) return access.response
    const actorId = access.user.id
    if (!actorId) return NextResponse.json({ error: "Authenticated user required" }, { status: 401 })
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const reason = typeof body?.reason === "string" ? body.reason.trim() : ""
    if (reason.length < 10 || reason.length > 2000) return NextResponse.json({ error: "Provide an amendment reason between 10 and 2,000 characters" }, { status: 400 })

    const source = await prisma.reportCard.findFirst({
      where: { id, ...(access.role === "SCHOOL_ADMIN" ? { schoolId: access.user.schoolId || "" } : {}) },
      include: {
        student: { select: { id: true, schoolId: true, classId: true } },
        academicPeriod: { include: { academicYear: { select: { id: true, schoolId: true } } } },
        template: { include: { sections: { orderBy: { sequence: "asc" } } } },
      },
    })
    if (!source) return NextResponse.json({ error: "Report card not found" }, { status: 404 })
    if (source.status !== "PUBLISHED") return NextResponse.json({ error: "Only the current published version can be amended" }, { status: 409 })
    if (source.student.schoolId !== source.schoolId || source.academicPeriod.academicYear.schoolId !== source.schoolId || source.template.schoolId !== source.schoolId) {
      return NextResponse.json({ error: "Report-card school relationships are inconsistent; contact an administrator" }, { status: 409 })
    }
    if (!source.template.curriculumVersionId) return NextResponse.json({ error: "The report template is not bound to a curriculum version" }, { status: 409 })

    const latest = await prisma.reportCard.findFirst({
      where: { studentId: source.studentId, academicPeriodId: source.academicPeriodId, templateId: source.templateId },
      orderBy: { version: "desc" },
      select: { id: true, version: true },
    })
    if (!latest || latest.id !== source.id) return NextResponse.json({ error: "Only the latest report-card version can be amended" }, { status: 409 })
    if (!source.template.sections.some((section) => section.isEnabled && section.code === "CBC_EVIDENCE")) {
      return NextResponse.json({ error: "The report template has no enabled CBC evidence section" }, { status: 409 })
    }

    const periodEnd = endOfAcademicPeriod(source.academicPeriod.endsOn)
    const student = await prisma.student.findUnique({
      where: { id: source.studentId },
      include: {
        school: { select: { id: true, name: true } },
        class: { select: { id: true, name: true, grade: true } },
        assessments: {
          where: { assessment: { date: { gte: source.academicPeriod.startsOn, lte: periodEnd } } },
          include: { assessment: { include: { subject: { select: { name: true } } } } },
          orderBy: { assessment: { date: "asc" } },
        },
      },
    })
    if (!student) return NextResponse.json({ error: "Learner not found" }, { status: 404 })

    const assignment = await prisma.classCurriculumAssignment.findFirst({
      where: { schoolId: source.schoolId, classId: student.classId, academicYearId: source.academicPeriod.academicYearId, periodId: source.academicPeriodId, status: { in: ["ACTIVE", "COMPLETED"] }, offering: { curriculumVersionId: source.template.curriculumVersionId } },
      select: { id: true },
    })
    const yearAssignment = assignment || await prisma.classCurriculumAssignment.findFirst({
      where: { schoolId: source.schoolId, classId: student.classId, academicYearId: source.academicPeriod.academicYearId, periodId: null, status: { in: ["ACTIVE", "COMPLETED"] }, offering: { curriculumVersionId: source.template.curriculumVersionId } },
      select: { id: true },
    })
    if (!yearAssignment) return NextResponse.json({ error: "The template curriculum version is no longer assigned to this learner's class" }, { status: 409 })

    const evidence = await prisma.assessmentEvidence.findMany({
      where: {
        studentId: source.studentId,
        schoolId: source.schoolId,
        status: { in: ["VERIFIED", "PUBLISHED"] },
        OR: [
          { assessmentPlan: { is: { periodId: source.academicPeriodId } } },
          { assessment: { is: { date: { gte: source.academicPeriod.startsOn, lte: periodEnd } } } },
        ],
      },
      include: {
        learningOutcome: { select: { code: true, statement: true, curriculumNode: { select: { curriculumVersionId: true } } } },
        competency: { select: { code: true, name: true } },
        assessmentPlan: { select: { title: true, date: true, periodId: true, classAssignment: { select: { offering: { select: { curriculumVersionId: true } } } } } },
        assessment: { include: { subject: { select: { name: true } } } },
        rubricScores: { include: { criterion: { select: { code: true, name: true } }, level: { select: { code: true, label: true, points: true } } } },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    })
    const eligibleEvidence = evidence
      .filter((item) => item.assessmentPlan
        ? item.assessmentPlan.periodId === source.academicPeriodId && item.assessmentPlan.classAssignment.offering.curriculumVersionId === source.template.curriculumVersionId
        : Boolean(item.assessment && item.learningOutcome?.curriculumNode.curriculumVersionId === source.template.curriculumVersionId && item.assessment.date >= source.academicPeriod.startsOn && item.assessment.date <= periodEnd))
      .map((item) => ({
        ...item,
        learningOutcome: item.learningOutcome ? { ...item.learningOutcome, curriculumVersionId: item.learningOutcome.curriculumNode.curriculumVersionId } : null,
      }))
    const built = buildReportSnapshot({
      generatedAt: new Date(),
      school: student.school,
      student: { id: student.id, name: student.name, admissionNo: student.admissionNo, className: student.class.name, grade: student.class.grade },
      period: { id: source.academicPeriod.id, name: source.academicPeriod.name, code: source.academicPeriod.code, startsOn: source.academicPeriod.startsOn, endsOn: source.academicPeriod.endsOn },
      template: {
        id: source.template.id,
        code: source.template.code,
        name: source.template.name,
        curriculumVersionId: source.template.curriculumVersionId,
        sections: source.template.sections.map((section) => ({ id: section.id, code: section.code, title: section.title, sectionType: section.sectionType, sequence: section.sequence, isEnabled: section.isEnabled })),
      },
      evidence: eligibleEvidence,
      legacyAssessments: student.assessments.map((result) => ({
        id: result.id,
        score: result.score,
        assessment: { title: result.assessment.title, maxScore: result.assessment.maxScore, date: result.assessment.date, subject: result.assessment.subject },
      })),
    })

    const replacement = await prisma.$transaction(async (tx) => {
      const changed = await tx.reportCard.updateMany({ where: { id: source.id, status: "PUBLISHED", version: source.version }, data: { status: "AMENDED" } })
      if (changed.count !== 1) return null
      const created = await tx.reportCard.create({
        data: {
          schoolId: source.schoolId,
          studentId: source.studentId,
          academicPeriodId: source.academicPeriodId,
          templateId: source.templateId,
          status: "DRAFT",
          version: source.version + 1,
          supersedesId: source.id,
          snapshot: built.snapshot as Prisma.InputJsonValue,
          generatedById: actorId,
          entries: { create: built.entries.map((entry) => ({ ...entry, snapshot: entry.snapshot as Prisma.InputJsonValue })) },
        },
        include: { entries: { orderBy: { sequence: "asc" } }, comments: true },
      })
      await tx.reportCardAmendment.create({
        data: { sourceReportCardId: source.id, replacementReportCardId: created.id, reason, amendedById: actorId },
      })
      await tx.reportCardStatusEvent.createMany({
        data: [
          { reportCardId: source.id, fromStatus: "PUBLISHED", toStatus: "AMENDED", actorId, reason, metadata: { replacementReportCardId: created.id } },
          { reportCardId: created.id, fromStatus: null, toStatus: "DRAFT", actorId, reason: "Replacement snapshot generated", metadata: { sourceReportCardId: source.id, entryCount: built.entries.length } },
        ],
      })
      return created
    })
    if (!replacement) return NextResponse.json({ error: "Report card changed during amendment; reload and try again" }, { status: 409 })
    return NextResponse.json(replacement, { status: 201 })
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "A replacement version already exists; reload the report list" }, { status: 409 })
    }
    console.error("Report-card amendment error:", error)
    return NextResponse.json({ error: "Unable to create report-card amendment" }, { status: 500 })
  }
}
