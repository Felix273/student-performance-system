import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/authorization"

export async function GET() {
  const session = await auth()
  const access = requireRole(session, ["SCHOOL_ADMIN"])
  if (!access.ok) return access.response
  const schoolId = access.role === "SCHOOL_ADMIN" ? access.user.schoolId : undefined
  const [teachers, classes, subjects, assignments] = await Promise.all([
    prisma.user.findMany({ where: { role: "TEACHER", ...(schoolId ? { schoolId } : {}) }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }),
    prisma.class.findMany({ where: schoolId ? { schoolId } : undefined, select: { id: true, name: true, grade: true }, orderBy: { name: "asc" } }),
    prisma.subject.findMany({ where: schoolId ? { schoolId } : undefined, select: { id: true, name: true, code: true }, orderBy: { name: "asc" } }),
    prisma.teacherClass.findMany({ where: schoolId ? { class: { schoolId } } : undefined, select: { id: true, teacherId: true, classId: true, subjectId: true, teacher: { select: { name: true, email: true } }, class: { select: { name: true, grade: true } }, subject: { select: { name: true, code: true } } }, orderBy: { createdAt: "desc" } }),
  ])
  return NextResponse.json({ teachers, classes, subjects, assignments })
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SCHOOL_ADMIN"])
    if (!access.ok) return access.response
    const body = await request.json()
    const teacherId = typeof body.teacherId === "string" ? body.teacherId : ""
    const classId = typeof body.classId === "string" ? body.classId : ""
    const subjectId = typeof body.subjectId === "string" && body.subjectId.trim() ? body.subjectId : null
    if (!teacherId || !classId) return NextResponse.json({ error: "Teacher and class are required" }, { status: 400 })
    const [teacher, classData, subject] = await Promise.all([
      prisma.user.findUnique({ where: { id: teacherId }, select: { id: true, role: true, schoolId: true } }),
      prisma.class.findUnique({ where: { id: classId }, select: { id: true, schoolId: true } }),
      subjectId ? prisma.subject.findUnique({ where: { id: subjectId }, select: { id: true, schoolId: true } }) : null,
    ])
    if (!teacher || teacher.role !== "TEACHER" || !classData) return NextResponse.json({ error: "Teacher or class not found" }, { status: 404 })
    if (access.role !== "SUPER_ADMIN" && (teacher.schoolId !== access.user.schoolId || classData.schoolId !== access.user.schoolId)) return NextResponse.json({ error: "Teacher and class must belong to your school" }, { status: 403 })
    if (teacher.schoolId !== classData.schoolId || (subject && subject.schoolId !== classData.schoolId)) return NextResponse.json({ error: "Teacher, class, and subject must belong to the same school" }, { status: 400 })
    const assignment = await prisma.teacherClass.create({ data: { teacherId, classId, subjectId } })
    return NextResponse.json(assignment, { status: 201 })
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return NextResponse.json({ error: "This teacher is already assigned to that class and subject" }, { status: 409 })
    console.error("Teacher assignment error:", error)
    return NextResponse.json({ error: "Unable to save teacher assignment" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SCHOOL_ADMIN"])
    if (!access.ok) return access.response
    const id = request.nextUrl.searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Assignment ID is required" }, { status: 400 })
    const assignment = await prisma.teacherClass.findUnique({ where: { id }, select: { id: true, class: { select: { schoolId: true } } } })
    if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    if (access.role !== "SUPER_ADMIN" && assignment.class.schoolId !== access.user.schoolId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    await prisma.teacherClass.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Teacher assignment deletion error:", error)
    return NextResponse.json({ error: "Unable to remove teacher assignment" }, { status: 500 })
  }
}
