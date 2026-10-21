import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { canAccessStudent } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import { generateCbcTermReport } from "@/lib/reports/cbcTermPdfGenerator"

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const studentId = request.nextUrl.searchParams.get("studentId")
    const periodId = request.nextUrl.searchParams.get("periodId")
    if (!studentId || !periodId) {
      return NextResponse.json({ error: "Student and academic period are required" }, { status: 400 })
    }

    const access = await canAccessStudent(session, studentId)
    if (!access.ok || !["SCHOOL_ADMIN", "TEACHER", "PARENT"].includes(access.role)) {
      return access.ok ? NextResponse.json({ error: "Forbidden" }, { status: 403 }) : access.response
    }

    const schoolId = access.student.schoolId
    const [student, period] = await Promise.all([
      prisma.student.findFirst({
        where: { id: studentId, schoolId },
        select: {
          name: true,
          admissionNo: true,
          class: { select: { name: true } },
          school: { select: { name: true, logoUrl: true } },
        },
      }),
      prisma.academicPeriod.findFirst({
        where: { id: periodId, academicYear: { schoolId } },
        select: { id: true, name: true, academicYear: { select: { name: true } } },
      }),
    ])
    if (!student || !period) {
      return NextResponse.json({ error: "Learner or academic period not found" }, { status: 404 })
    }

    const evidence = await prisma.assessmentEvidence.findMany({
      where: {
        studentId,
        schoolId,
        status: "PUBLISHED",
        OR: [
          { assessmentPlan: { is: { schoolId, periodId } } },
          { assessment: { is: { schoolId, assessmentPlan: { is: { schoolId, periodId } } } } },
        ],
      },
      select: { publishedAt: true, publishedSnapshot: true },
      orderBy: [{ publishedAt: "asc" }, { id: "asc" }],
    })
    if (evidence.length === 0) {
      return NextResponse.json({ error: "No published CBC evidence for this term" }, { status: 404 })
    }

    const reportEvidence: {
      outcome: string
      competency: string
      evidenceType: string
      masteryLevel: string
      score: string
      narrative: string
      publishedAt: string
    }[] = []

    for (const item of evidence) {
      const snapshot = asRecord(item.publishedSnapshot)
      if (!snapshot || snapshot.studentId !== studentId) {
        return NextResponse.json({ error: "Published CBC evidence is missing a valid snapshot" }, { status: 409 })
      }
      const outcome = asRecord(snapshot.learningOutcome)
      const competency = asRecord(snapshot.competency)
      const score = asNumber(snapshot.numericScore)
      const maximum = asNumber(snapshot.maxScore)
      reportEvidence.push({
        outcome: [asText(outcome?.code), asText(outcome?.statement)].filter(Boolean).join(" - "),
        competency: [asText(competency?.code), asText(competency?.name)].filter(Boolean).join(" - "),
        evidenceType: asText(snapshot.evidenceType),
        masteryLevel: asText(snapshot.masteryLevel),
        score: score === null ? "" : maximum === null ? String(score) : `${score} / ${maximum}`,
        narrative: asText(snapshot.narrative),
        publishedAt: asText(snapshot.publishedAt) || item.publishedAt?.toISOString() || "",
      })
    }

    const pdf = generateCbcTermReport({
      schoolName: student.school.name,
      schoolLogo: student.school.logoUrl,
      studentName: student.name,
      admissionNo: student.admissionNo,
      className: student.class?.name || "Unassigned",
      periodName: period.name,
      academicYear: period.academicYear.name,
      evidence: reportEvidence,
    })

    return new NextResponse(pdf.output("arraybuffer"), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="cbc-report-${student.admissionNo}.pdf"`,
      },
    })
  } catch (error) {
    console.error("CBC term report generation error:", error)
    return NextResponse.json({ error: "Unable to generate CBC report" }, { status: 500 })
  }
}
