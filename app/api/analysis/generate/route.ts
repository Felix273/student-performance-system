import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import { canAccessStudent } from "@/lib/authorization"
import { generateLocalCbcInsights } from "@/lib/analysis/cbcDiagnosticEngine"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const body = await request.json()
    const { studentId } = body

    if (typeof studentId !== "string" || !studentId) {
      return NextResponse.json({ error: "Student ID required" }, { status: 400 })
    }

    const access = await canAccessStudent(session, studentId)
    if (!access.ok || !["SCHOOL_ADMIN", "TEACHER"].includes(access.role)) {
      return access.ok ? NextResponse.json({ error: "Forbidden" }, { status: 403 }) : access.response
    }

    // Fetch student data, assessment history, and published CBC evidence
    const [student, publishedEvidence] = await Promise.all([
      prisma.student.findUnique({
        where: { id: studentId },
        include: {
          class: true,
          assessments: {
            include: {
              assessment: {
                include: { subject: true },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      }),
      prisma.assessmentEvidence.findMany({
        where: { studentId, status: "PUBLISHED" },
        include: {
          learningOutcome: { select: { statement: true } },
          competency: { select: { name: true } },
        },
        orderBy: { publishedAt: "desc" },
        take: 10,
      }),
    ])

    if (!student || student.assessments.length === 0) {
      return NextResponse.json(
        { error: "Student has no assessment records yet. Record at least one score before generating insights." },
        { status: 404 }
      )
    }

    // Prepare inputs for the local diagnostic engine
    const assessmentInputs = student.assessments.map((r) => {
      const maxScore = r.assessment.maxScore || 100
      const percentage = maxScore > 0 ? (r.score / maxScore) * 100 : 0
      return {
        subject: r.assessment.subject?.name || "General",
        title: r.assessment.title,
        type: r.assessment.type,
        score: r.score,
        maxScore,
        percentage,
      }
    })

    const evidenceInputs = publishedEvidence.map((e) => ({
      outcome: e.learningOutcome?.statement || null,
      competency: e.competency?.name || null,
      masteryLevel: e.masteryLevel || null,
      narrative: e.narrative || null,
    }))

    // Run the fast, local CBC heuristic diagnostic engine ($0 cost, 100% reliable)
    const analysisData = generateLocalCbcInsights(student.name, assessmentInputs, evidenceInputs)

    // Save to database
    const analysis = await prisma.performanceAnalysis.create({
      data: {
        studentId,
        overallGrade: analysisData.overallGrade,
        trend: analysisData.trend,
        strengths: JSON.stringify(analysisData.strengths),
        weaknesses: JSON.stringify(analysisData.weaknesses),
        recommendations: JSON.stringify(analysisData.recommendations),
        aiInsights: analysisData.insights,
      },
    })

    return NextResponse.json(analysis, { status: 201 })
  } catch (error) {
    console.error("Diagnostic analysis error:", error)
    return NextResponse.json({ error: "Unable to generate performance insights" }, { status: 500 })
  }
}
