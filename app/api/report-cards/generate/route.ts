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

function isPrismaCode(error: unknown, code: string) {
  return typeof error === "object" && error !== null && "code" in error && error.code === code
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SCHOOL_ADMIN"])
    if (!access.ok) return access.response
    const actorId = access.user.id
    if (!actorId) return NextResponse.json({ error: "Authenticated user required" }, { status: 401 })

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") return NextResponse.json({ error: "A JSON request body is required" }, { status: 400 })
    const studentId = typeof body.studentId === "string" ? body.studentId : ""
    const periodId = typeof body.periodId === "string" ? body.periodId : ""
    const templateId = typeof body.templateId === "string" ? body.templateId : ""
    if (!studentId || !periodId || !templateId) {
      return NextResponse.json({ error: "Student, academic period, and report template are required" }, { status: 400 })
    }

    const period = await prisma.academicPeriod.findUnique({
      where: { id: periodId },
      include: { academicYear: { select: { schoolId: true } } },
    })
    if (!period) return NextResponse.json({ error: "Academic period not found" }, { status: 404 })
    const periodEnd = endOfAcademicPeriod(period.endsOn)

    const [student, template] = await Promise.all([
      prisma.student.findUnique({
        where: { id: studentId },
        include: {
          school: { select: { id: true, name: true } },
          class: { select: { id: true, name: true, grade: true } },
          assessments: {
            where: { assessment: { date: { gte: period.startsOn, lte: periodEnd } } },
            include: { assessment: { include: { subject: { select: { name: true } } } } },
            orderBy: { assessment: { date: "asc" } },
          },
        },
      }),
      prisma.reportTemplate.findUnique({
        where: { id: templateId },
        include: { sections: { orderBy: { sequence: "asc" } } },
      }),
    ])

    if (!student || !template) return NextResponse.json({ error: "Student or report template not found" }, { status: 404 })
    const schoolId = student.schoolId
    if (period.academicYear.schoolId !== schoolId || template.schoolId !== schoolId) {
      return NextResponse.json({ error: "Student, period, and template must belong to the same school" }, { status: 404 })
    }
    if (access.role === "SCHOOL_ADMIN" && access.user.schoolId !== schoolId) {
      return NextResponse.json({ error: "Student or report template not found" }, { status: 404 })
    }
    if (!template.curriculumVersionId) return NextResponse.json({ error: "The report template must be bound to a curriculum version" }, { status: 409 })
    if (!template.sections.some((section) => section.isEnabled && section.code === "CBC_EVIDENCE")) {
      return NextResponse.json({ error: "This CBC template has no enabled learning-evidence section" }, { status: 409 })
    }
    const assignment = await prisma.classCurriculumAssignment.findFirst({
      where: {
        schoolId,
        classId: student.classId,
        academicYearId: period.academicYearId,
        periodId: period.id,
        status: { in: ["ACTIVE", "COMPLETED"] },
        offering: { curriculumVersionId: template.curriculumVersionId },
      },
      select: { id: true },
    })
    const yearAssignment = assignment || await prisma.classCurriculumAssignment.findFirst({
      where: {
        schoolId,
        classId: student.classId,
        academicYearId: period.academicYearId,
        periodId: null,
        status: { in: ["ACTIVE", "COMPLETED"] },
        offering: { curriculumVersionId: template.curriculumVersionId },
      },
      select: { id: true },
    })
    if (!yearAssignment) return NextResponse.json({ error: "The template curriculum version is not assigned to this learner's class for the selected academic year" }, { status: 409 })

    const evidence = await prisma.assessmentEvidence.findMany({
      where: {
        studentId,
        schoolId,
        status: { in: ["VERIFIED", "PUBLISHED"] },
        OR: [
          { assessmentPlan: { is: { periodId } } },
          { assessment: { is: { date: { gte: period.startsOn, lte: periodEnd } } } },
        ],
      },
      include: {
        learningOutcome: { select: { code: true, statement: true, curriculumNode: { select: { curriculumVersionId: true } } } },
        competency: { select: { code: true, name: true } },
        assessmentPlan: { select: { title: true, date: true, periodId: true, classAssignment: { select: { offering: { select: { curriculumVersionId: true } } } } } },
        assessment: { include: { subject: { select: { name: true } } } },
        rubricScores: {
          include: {
            criterion: { select: { code: true, name: true } },
            level: { select: { code: true, label: true, points: true } },
          },
        },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    })
    const eligibleEvidence = evidence
      .filter((item) => item.assessmentPlan
        ? item.assessmentPlan.periodId === period.id && item.assessmentPlan.classAssignment.offering.curriculumVersionId === template.curriculumVersionId
        : Boolean(item.assessment && item.learningOutcome?.curriculumNode.curriculumVersionId === template.curriculumVersionId && item.assessment.date >= period.startsOn && item.assessment.date <= periodEnd))
      .map((item) => ({
        ...item,
        learningOutcome: item.learningOutcome ? { ...item.learningOutcome, curriculumVersionId: item.learningOutcome.curriculumNode.curriculumVersionId } : null,
      }))

    const built = buildReportSnapshot({
      generatedAt: new Date(),
      school: student.school,
      student: {
        id: student.id,
        name: student.name,
        admissionNo: student.admissionNo,
        className: student.class.name,
        grade: student.class.grade,
      },
      period: { id: period.id, name: period.name, code: period.code, startsOn: period.startsOn, endsOn: period.endsOn },
      template: {
        id: template.id,
        code: template.code,
        name: template.name,
        curriculumVersionId: template.curriculumVersionId,
        sections: template.sections.map((section) => ({
          id: section.id,
          code: section.code,
          title: section.title,
          sectionType: section.sectionType,
          sequence: section.sequence,
          isEnabled: section.isEnabled,
        })),
      },
      evidence: eligibleEvidence,
      legacyAssessments: student.assessments.map((result) => ({
        id: result.id,
        score: result.score,
        assessment: {
          title: result.assessment.title,
          maxScore: result.assessment.maxScore,
          date: result.assessment.date,
          subject: result.assessment.subject,
        },
      })),
    })

    const existing = await prisma.reportCard.findFirst({
      where: { studentId, academicPeriodId: periodId, templateId },
      orderBy: { version: "desc" },
      select: { id: true, status: true, version: true },
    })
    if (existing) {
      return NextResponse.json({ error: "A snapshot already exists for this learner and period; published reports must be amended as a new version", existing }, { status: 409 })
    }

    const reportCard = await prisma.$transaction(async (tx) => {
      const created = await tx.reportCard.create({
        data: {
          schoolId,
          studentId,
          academicPeriodId: periodId,
          templateId,
          status: "DRAFT",
          version: 1,
          snapshot: built.snapshot as Prisma.InputJsonValue,
          generatedById: actorId,
          entries: {
            create: built.entries.map((entry) => ({
              ...entry,
              snapshot: entry.snapshot as Prisma.InputJsonValue,
            })),
          },
        },
        include: { entries: { orderBy: { sequence: "asc" } }, comments: true },
      })
      await tx.reportCardStatusEvent.create({
        data: {
          reportCardId: created.id,
          fromStatus: null,
          toStatus: "DRAFT",
          actorId,
          reason: "Initial report snapshot generated",
          metadata: { entryCount: built.entries.length, templateId, academicPeriodId: periodId },
        },
      })
      return created
    })
    return NextResponse.json(reportCard, { status: 201 })
  } catch (error) {
    if (isPrismaCode(error, "P2002")) {
      return NextResponse.json({ error: "A report snapshot was generated concurrently; reload the report list before retrying" }, { status: 409 })
    }
    console.error("Report-card generation error:", error)
    return NextResponse.json({ error: "Unable to generate report-card snapshot" }, { status: 500 })
  }
}
