import { NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import { canAccessStudent } from "@/lib/authorization"

export async function GET(_request: Request, { params }: { params: Promise<{ studentId: string }> }) {
  try {
    const session = await auth()
    const { studentId } = await params
    const access = await canAccessStudent(session, studentId)
    if (!access.ok || !["SCHOOL_ADMIN", "TEACHER", "PARENT"].includes(access.role)) return access.ok ? NextResponse.json({ error: "Forbidden" }, { status: 403 }) : access.response

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, classId: true, schoolId: true, assessments: { include: { assessment: { include: { subject: true } } }, orderBy: { assessment: { date: "asc" } } } },
    })
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 })
    const results = student.assessments.filter((result) => result.assessment.maxScore > 0)
    const classResults = await prisma.assessmentResult.findMany({ where: { student: { classId: student.classId, schoolId: student.schoolId }, assessmentId: { in: results.map((result) => result.assessmentId) } }, select: { score: true, assessmentId: true, assessment: { select: { maxScore: true } } } })
    const classAverageByAssessment = new Map<string, number>()
    for (const result of classResults) {
      const current = classAverageByAssessment.get(result.assessmentId) || 0
      classAverageByAssessment.set(result.assessmentId, current + (result.score / result.assessment.maxScore) * 100)
    }
    const counts = new Map<string, number>()
    for (const result of classResults) counts.set(result.assessmentId, (counts.get(result.assessmentId) || 0) + 1)
    const percentages = results.map((result) => (result.score / result.assessment.maxScore) * 100)
    const subjectMap = new Map<string, number[]>()
    const typeMap = new Map<string, number[]>()
    for (const result of results) {
      const percentage = (result.score / result.assessment.maxScore) * 100
      subjectMap.set(result.assessment.subject.name, [...(subjectMap.get(result.assessment.subject.name) || []), percentage])
      typeMap.set(result.assessment.type, [...(typeMap.get(result.assessment.type) || []), percentage])
    }
    const average = (values: number[]) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 10) / 10 : 0
    const grade = (score: number) => score >= 80 ? "A" : score >= 70 ? "B" : score >= 60 ? "C" : score >= 50 ? "D" : "F"
    const gradeCounts = new Map<string, number>()
    percentages.forEach((percentage) => gradeCounts.set(grade(percentage), (gradeCounts.get(grade(percentage)) || 0) + 1))
    return NextResponse.json({
      summary: { currentAverage: average(percentages), highest: percentages.length ? Math.round(Math.max(...percentages) * 10) / 10 : 0, lowest: percentages.length ? Math.round(Math.min(...percentages) * 10) / 10 : 0, totalAssessments: results.length },
      performanceTrend: results.map((result) => ({ date: result.assessment.date.toISOString().slice(0, 10), score: Math.round((result.score / result.assessment.maxScore) * 1000) / 10, average: Math.round((classAverageByAssessment.get(result.assessmentId) || 0) / (counts.get(result.assessmentId) || 1) * 10) / 10 })),
      subjectPerformance: [...subjectMap.entries()].map(([subject, values]) => ({ subject, score: average(values), classAverage: average(values) })),
      assessmentTypePerformance: [...typeMap.entries()].map(([type, values]) => ({ type, score: average(values), maxScore: 100 })),
      gradeDistribution: [...gradeCounts.entries()].map(([grade, count]) => ({ grade, count })),
    })
  } catch (error) {
    console.error("Analytics fetch error:", error)
    return NextResponse.json({ error: "Unable to load analytics" }, { status: 500 })
  }
}
