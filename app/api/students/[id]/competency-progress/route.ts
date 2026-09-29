import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import { canAccessStudent } from "@/lib/authorization"

const levelPoints: Record<string, number> = { BE: 1, AE: 2, ME: 3, EE: 4 }
const levelLabels: Record<string, string> = { BE: "Below expectation", AE: "Approaching expectation", ME: "Meeting expectation", EE: "Exceeding expectation" }
const round = (value: number) => Math.round(value * 10) / 10
type OutcomeAccumulator = { id: string; code: string; statement: string; scores: number[] }
type CompetencyAccumulator = { id: string; code: string; name: string; scores: number[]; evidenceCount: number; outcomes: Map<string, OutcomeAccumulator> }

function evidenceScore(evidence: { masteryLevel: string | null; numericScore: number | null; maxScore: number | null; rubricScores: { level: { points: number | null } }[] }) {
  if (evidence.rubricScores.length > 0) {
    const points = evidence.rubricScores.map((score) => score.level.points).filter((point): point is number => point !== null)
    if (points.length > 0) return round((points.reduce((sum, point) => sum + point, 0) / points.length / 4) * 100)
  }
  if (evidence.masteryLevel && levelPoints[evidence.masteryLevel]) return round((levelPoints[evidence.masteryLevel] / 4) * 100)
  if (evidence.numericScore !== null && evidence.maxScore && evidence.maxScore > 0) return round((evidence.numericScore / evidence.maxScore) * 100)
  return null
}

function scoreLabel(score: number) {
  if (score >= 87.5) return "Exceeding expectation"
  if (score >= 62.5) return "Meeting expectation"
  if (score >= 37.5) return "Approaching expectation"
  return "Below expectation"
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    const { id: studentId } = await params
    const access = await canAccessStudent(session, studentId)
    if (!access.ok) return access.response
    const student = await prisma.student.findUnique({ where: { id: studentId }, select: { id: true, name: true, admissionNo: true, schoolId: true, class: { select: { id: true, name: true, grade: true } }, school: { select: { name: true } } } })
    if (!student) return NextResponse.json({ error: "Learner not found" }, { status: 404 })

    const yearId = request.nextUrl.searchParams.get("yearId")
    const periodId = request.nextUrl.searchParams.get("periodId")
    const year = yearId ? await prisma.academicYear.findFirst({ where: { id: yearId, schoolId: student.schoolId }, select: { id: true, name: true, startsOn: true, endsOn: true } }) : await prisma.academicYear.findFirst({ where: { schoolId: student.schoolId, isCurrent: true }, select: { id: true, name: true, startsOn: true, endsOn: true } })
    if (yearId && !year) return NextResponse.json({ error: "Academic year not found" }, { status: 404 })
    const period = periodId ? await prisma.academicPeriod.findFirst({ where: { id: periodId, academicYearId: year?.id }, select: { id: true, name: true, startsOn: true, endsOn: true } }) : null
    if (periodId && !period) return NextResponse.json({ error: "Academic period not found" }, { status: 404 })
    const start = period?.startsOn || year?.startsOn
    const end = period?.endsOn || year?.endsOn

    const evidence = await prisma.assessmentEvidence.findMany({
      where: { studentId, status: { in: ["SUBMITTED", "VERIFIED", "PUBLISHED"] }, OR: [{ assessment: { schoolId: student.schoolId, ...(start && end ? { date: { gte: start, lte: end } } : {}) } }, { assessmentPlan: { schoolId: student.schoolId, ...(start && end ? { date: { gte: start, lte: end } } : {}) } }] },
      select: { id: true, masteryLevel: true, numericScore: true, maxScore: true, capturedAt: true, competency: { select: { id: true, code: true, name: true } }, learningOutcome: { select: { id: true, code: true, statement: true } }, rubricScores: { select: { level: { select: { points: true } } } }, assessment: { select: { id: true, title: true, date: true, subject: { select: { name: true } } } }, assessmentPlan: { select: { id: true, title: true, date: true } } },
      orderBy: { capturedAt: "asc" },
    })

    const competencyMap = new Map<string, CompetencyAccumulator>()
    const trendMap = new Map<string, { scores: number[]; evidenceCount: number }>()
    let scoredEvidence = 0
    for (const item of evidence) {
      const score = evidenceScore(item)
      if (score === null) continue
      scoredEvidence += 1
      const bucket = (item.assessment?.date || item.assessmentPlan?.date || item.capturedAt).toISOString().slice(0, 10)
      const trend = trendMap.get(bucket) || { scores: [], evidenceCount: 0 }
      trend.scores.push(score); trend.evidenceCount += 1; trendMap.set(bucket, trend)
      if (!item.competency) continue
      const competency: CompetencyAccumulator = competencyMap.get(item.competency.id) || { ...item.competency, scores: [], evidenceCount: 0, outcomes: new Map<string, OutcomeAccumulator>() }
      competency.scores.push(score); competency.evidenceCount += 1
      if (item.learningOutcome) { const outcome = competency.outcomes.get(item.learningOutcome.id) || { ...item.learningOutcome, scores: [] }; outcome.scores.push(score); competency.outcomes.set(item.learningOutcome.id, outcome) }
      competencyMap.set(item.competency.id, competency)
    }

    const competencies = [...competencyMap.values()].map((competency) => ({ id: competency.id, code: competency.code, name: competency.name, average: round(competency.scores.reduce((sum, score) => sum + score, 0) / competency.scores.length), mastery: scoreLabel(competency.scores.reduce((sum, score) => sum + score, 0) / competency.scores.length), evidenceCount: competency.evidenceCount, outcomes: [...competency.outcomes.values()].map((outcome) => ({ id: outcome.id, code: outcome.code, statement: outcome.statement, average: round(outcome.scores.reduce((sum, score) => sum + score, 0) / outcome.scores.length), mastery: scoreLabel(outcome.scores.reduce((sum, score) => sum + score, 0) / outcome.scores.length), evidenceCount: outcome.scores.length })) })).sort((a, b) => b.average - a.average)
    const trend = [...trendMap.entries()].map(([date, value]) => ({ date, average: round(value.scores.reduce((sum, score) => sum + score, 0) / value.scores.length), mastery: scoreLabel(value.scores.reduce((sum, score) => sum + score, 0) / value.scores.length), evidenceCount: value.evidenceCount }))
    const overall = scoredEvidence ? round(trend.flatMap((item) => Array(item.evidenceCount).fill(item.average)).reduce((sum, score) => sum + score, 0) / scoredEvidence) : 0
    const academicYears = await prisma.academicYear.findMany({ where: { schoolId: student.schoolId }, select: { id: true, name: true, isCurrent: true }, orderBy: { name: "desc" } })
    const periods = year ? await prisma.academicPeriod.findMany({ where: { academicYearId: year.id }, select: { id: true, name: true, sequence: true }, orderBy: { sequence: "asc" } }) : []
    return NextResponse.json({ student, filter: { year, period }, options: { academicYears, periods }, summary: { overall, mastery: overall ? scoreLabel(overall) : "No evidence yet", evidenceCount: evidence.length, scoredEvidence }, competencies, trend })
  } catch (error) {
    console.error("Competency progress error:", error)
    return NextResponse.json({ error: "Unable to load competency progress" }, { status: 500 })
  }
}
