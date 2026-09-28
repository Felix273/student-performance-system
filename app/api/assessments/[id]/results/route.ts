import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import { canAccessClass } from "@/lib/authorization"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    const { id: assessmentId } = await params
    const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId }, select: { id: true, schoolId: true, classId: true, maxScore: true } })
    if (!assessment) return NextResponse.json({ error: "Assessment not found" }, { status: 404 })
    const access = await canAccessClass(session, assessment.classId)
    if (!access.ok || !["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"].includes(access.role)) return access.ok ? NextResponse.json({ error: "Forbidden" }, { status: 403 }) : access.response
    if (access.role !== "SUPER_ADMIN" && assessment.schoolId !== access.user.schoolId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const body = await request.json()
    if (!Array.isArray(body.results) || body.results.length === 0 || body.results.length > 500) return NextResponse.json({ error: "Provide between 1 and 500 results" }, { status: 400 })
    const studentIds = body.results.map((item: { studentId?: string }) => item.studentId).filter(Boolean)
    const students = await prisma.student.findMany({ where: { id: { in: studentIds }, classId: assessment.classId, schoolId: assessment.schoolId }, select: { id: true } })
    const validStudents = new Set(students.map((student) => student.id))
    for (const item of body.results) {
      if (!validStudents.has(item.studentId) || !Number.isFinite(Number(item.score)) || Number(item.score) < 0 || Number(item.score) > assessment.maxScore) {
        return NextResponse.json({ error: "Each student must belong to the assessment class and scores must be within range" }, { status: 400 })
      }
    }

    await prisma.$transaction(body.results.map((item: { studentId: string; score: number }) => prisma.assessmentResult.upsert({
      where: { studentId_assessmentId: { studentId: item.studentId, assessmentId } },
      update: { score: Number(item.score) },
      create: { studentId: item.studentId, assessmentId, score: Number(item.score) },
    })))
    return NextResponse.json({ message: "Scores saved successfully", count: body.results.length }, { status: 200 })
  } catch (error) {
    console.error("Error saving scores:", error)
    return NextResponse.json({ error: "Unable to save scores" }, { status: 500 })
  }
}
