import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import { canAccessClass } from "@/lib/authorization"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const body = await request.json()
    const { assessmentId, scores } = body
    if (!assessmentId || !Array.isArray(scores) || scores.length === 0 || scores.length > 500) return NextResponse.json({ error: "Provide an assessment and between 1 and 500 scores" }, { status: 400 })

    const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId }, select: { id: true, schoolId: true, classId: true, maxScore: true } })
    if (!assessment) return NextResponse.json({ error: "Assessment not found" }, { status: 404 })
    const access = await canAccessClass(session, assessment.classId)
    if (!access.ok || !["SCHOOL_ADMIN", "TEACHER"].includes(access.role)) return access.ok ? NextResponse.json({ error: "Forbidden" }, { status: 403 }) : access.response
    if (assessment.schoolId !== access.user.schoolId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const admissionNumbers = scores.map((item: { admissionNo?: string }) => String(item.admissionNo || "").trim()).filter(Boolean)
    const students = await prisma.student.findMany({ where: { admissionNo: { in: admissionNumbers }, classId: assessment.classId, schoolId: assessment.schoolId }, select: { id: true, admissionNo: true } })
    const byAdmission = new Map(students.map((student) => [student.admissionNo, student]))
    const failed: string[] = []
    const valid: { studentId: string; score: number }[] = []
    for (const item of scores) {
      const admissionNo = String(item.admissionNo || "").trim()
      const student = byAdmission.get(admissionNo)
      const score = Number(item.score)
      if (!student) failed.push(`${admissionNo || "Unknown"}: student is not in this assessment class`)
      else if (!Number.isFinite(score) || score < 0 || score > assessment.maxScore) failed.push(`${admissionNo}: score must be between 0 and ${assessment.maxScore}`)
      else valid.push({ studentId: student.id, score })
    }

    if (valid.length) {
      await prisma.$transaction(valid.map((item) => prisma.assessmentResult.upsert({
        where: { studentId_assessmentId: { studentId: item.studentId, assessmentId } },
        update: { score: item.score },
        create: { studentId: item.studentId, assessmentId, score: item.score },
      })))
    }
    return NextResponse.json({ message: failed.length ? "Bulk score upload completed with errors" : "Bulk score upload completed", processed: valid.length, failed }, { status: failed.length ? 207 : 200 })
  } catch (error) {
    console.error("Bulk score upload error:", error)
    return NextResponse.json({ error: "Unable to process score upload" }, { status: 500 })
  }
}
