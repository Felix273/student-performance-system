import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { canAccessClass, requireRole } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"

const round = (value: number) => Math.round(value * 10) / 10
const levelPoints: Record<string, number> = { BE: 1, AE: 2, ME: 3, EE: 4 }
const mastery = (score: number) => score >= 87.5 ? "Exceeding" : score >= 62.5 ? "Meeting" : score >= 37.5 ? "Approaching" : "Below"

type ScoreEvidence = { id: string; studentId: string; competency: { id: string; code: string; name: string } | null; masteryLevel: string | null; numericScore: number | null; maxScore: number | null; capturedAt: Date; assessment: { date: Date } | null; assessmentPlan: { date: Date | null } | null; rubricScores: { level: { points: number | null } }[] }
type Bucket = { scores: number[]; evidenceCount: number }

function scoreOf(item: Pick<ScoreEvidence, "masteryLevel" | "numericScore" | "maxScore" | "rubricScores">) {
  const rubricPoints = item.rubricScores.map((entry) => entry.level.points).filter((points): points is number => points !== null)
  if (rubricPoints.length) return round((rubricPoints.reduce((sum, points) => sum + points, 0) / rubricPoints.length / 4) * 100)
  if (item.masteryLevel && levelPoints[item.masteryLevel]) return round(levelPoints[item.masteryLevel] / 4 * 100)
  if (item.numericScore !== null && item.maxScore && item.maxScore > 0) return round(item.numericScore / item.maxScore * 100)
  return null
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"])
    if (!access.ok) return access.response
    const classId = request.nextUrl.searchParams.get("classId")
    if (!classId) return NextResponse.json({ error: "classId is required" }, { status: 400 })
    const classAccess = await canAccessClass(session, classId)
    if (!classAccess.ok) return classAccess.response
    const schoolId = classAccess.classData.schoolId
    const yearId = request.nextUrl.searchParams.get("yearId")
    const periodId = request.nextUrl.searchParams.get("periodId")
    const year = yearId ? await prisma.academicYear.findFirst({ where: { id: yearId, schoolId }, select: { id: true, name: true, startsOn: true, endsOn: true } }) : await prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true }, select: { id: true, name: true, startsOn: true, endsOn: true } })
    if (yearId && !year) return NextResponse.json({ error: "Academic year not found" }, { status: 404 })
    const period = periodId ? await prisma.academicPeriod.findFirst({ where: { id: periodId, academicYearId: year?.id }, select: { id: true, name: true, startsOn: true, endsOn: true } }) : null
    if (periodId && !period) return NextResponse.json({ error: "Academic period not found" }, { status: 404 })
    const start = period?.startsOn || year?.startsOn
    const end = period?.endsOn || year?.endsOn
    const [classData, classes, evidence] = await Promise.all([
      prisma.class.findUnique({ where: { id: classId }, select: { id: true, name: true, grade: true, schoolId: true, students: { select: { id: true, name: true, admissionNo: true }, orderBy: { name: "asc" } }, teachers: { select: { teacher: { select: { id: true, name: true } }, subject: { select: { name: true } } } } } }),
      prisma.class.findMany({ where: access.role === "TEACHER" ? { teachers: { some: { teacherId: access.user.id } } } : { schoolId }, select: { id: true, name: true, grade: true, _count: { select: { students: true } } }, orderBy: { name: "asc" } }),
      prisma.assessmentEvidence.findMany({ where: { schoolId, student: { classId }, status: { in: ["SUBMITTED", "VERIFIED", "PUBLISHED"] }, OR: [{ assessment: { date: start && end ? { gte: start, lte: end } : undefined } }, { assessmentPlan: { date: start && end ? { gte: start, lte: end } : undefined } }] }, select: { id: true, studentId: true, competency: { select: { id: true, code: true, name: true } }, masteryLevel: true, numericScore: true, maxScore: true, capturedAt: true, assessment: { select: { date: true } }, assessmentPlan: { select: { date: true } }, rubricScores: { select: { level: { select: { points: true } } } } }, orderBy: { capturedAt: "asc" } }),
    ])
    if (!classData) return NextResponse.json({ error: "Class not found" }, { status: 404 })

    const competencyMap = new Map<string, { id: string; code: string; name: string; scores: number[]; learners: Set<string>; distribution: Record<string, number>; evidenceCount: number }>()
    const learnerMap = new Map<string, { id: string; name: string; admissionNo: string; competencies: Map<string, number[]>; evidenceCount: number }>(classData.students.map((student) => [student.id, { ...student, competencies: new Map(), evidenceCount: 0 }]))
    const trendMap = new Map<string, Bucket>()
    for (const item of evidence as ScoreEvidence[]) {
      if (!item.competency) continue
      const score = scoreOf(item)
      if (score === null) continue
      const competency = competencyMap.get(item.competency.id) || { ...item.competency, scores: [], learners: new Set<string>(), distribution: { Below: 0, Approaching: 0, Meeting: 0, Exceeding: 0 }, evidenceCount: 0 }
      competency.scores.push(score); competency.learners.add(item.studentId); competency.distribution[mastery(score)] += 1; competency.evidenceCount += 1; competencyMap.set(item.competency.id, competency)
      const learner = learnerMap.get(item.studentId)
      if (learner) { learner.competencies.set(item.competency.id, [...(learner.competencies.get(item.competency.id) || []), score]); learner.evidenceCount += 1 }
      const bucket = (item.assessment?.date || item.assessmentPlan?.date || item.capturedAt).toISOString().slice(0, 10); const trend = trendMap.get(bucket) || { scores: [], evidenceCount: 0 }; trend.scores.push(score); trend.evidenceCount += 1; trendMap.set(bucket, trend)
    }
    const competencies = [...competencyMap.values()].map((item) => ({ id: item.id, code: item.code, name: item.name, average: round(item.scores.reduce((sum, score) => sum + score, 0) / item.scores.length), learnerCount: item.learners.size, evidenceCount: item.evidenceCount, distribution: item.distribution, supportCount: item.scores.filter((score) => score < 62.5).length })).sort((a, b) => a.average - b.average)
    const learners = [...learnerMap.values()].map((learner) => { const competencyScores = [...learner.competencies.entries()].map(([competencyId, scores]) => ({ competencyId, score: round(scores.reduce((sum, score) => sum + score, 0) / scores.length), mastery: mastery(scores.reduce((sum, score) => sum + score, 0) / scores.length) })); const overall = competencyScores.length ? round(competencyScores.reduce((sum, item) => sum + item.score, 0) / competencyScores.length) : null; return { id: learner.id, name: learner.name, admissionNo: learner.admissionNo, overall, mastery: overall === null ? "No evidence" : mastery(overall), evidenceCount: learner.evidenceCount, competencyScores, supportNeeds: competencyScores.filter((item) => item.score < 62.5).map((item) => item.competencyId) } }).sort((a, b) => (a.overall ?? -1) - (b.overall ?? -1))
    const trend = [...trendMap.entries()].map(([date, value]) => ({ date, average: round(value.scores.reduce((sum, score) => sum + score, 0) / value.scores.length), evidenceCount: value.evidenceCount, mastery: mastery(value.scores.reduce((sum, score) => sum + score, 0) / value.scores.length) }))
    const classAverage = learners.filter((learner) => learner.overall !== null).length ? round(learners.filter((learner) => learner.overall !== null).reduce((sum, learner) => sum + (learner.overall || 0), 0) / learners.filter((learner) => learner.overall !== null).length) : 0
    const academicYears = await prisma.academicYear.findMany({ where: { schoolId }, select: { id: true, name: true, isCurrent: true }, orderBy: { name: "desc" } })
    const periods = year ? await prisma.academicPeriod.findMany({ where: { academicYearId: year.id }, select: { id: true, name: true, sequence: true }, orderBy: { sequence: "asc" } }) : []
    return NextResponse.json({ class: { id: classData.id, name: classData.name, grade: classData.grade, students: classData.students.length, teachers: classData.teachers.map((teacher) => ({ name: teacher.teacher.name, subject: teacher.subject?.name || "All subjects" })) }, classes, filter: { year, period }, options: { academicYears, periods }, summary: { classAverage, evidenceCount: evidence.length, learnersWithEvidence: learners.filter((learner) => learner.overall !== null).length, supportLearners: learners.filter((learner) => learner.supportNeeds.length > 0).length }, competencies, learners, trend })
  } catch (error) {
    console.error("Teacher competency analytics error:", error)
    return NextResponse.json({ error: "Unable to load class competency analytics" }, { status: 500 })
  }
}
