import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/authorization"

export async function GET() {
  const session = await auth()
  const access = requireRole(session, ["SCHOOL_ADMIN"])
  if (!access.ok) return access.response
  const schoolId = access.user.schoolId
  if (!schoolId) return NextResponse.json({ error: "School context required" }, { status: 403 })
  const [teachers, classes, subjects, assignments] = await Promise.all([
    prisma.user.findMany({ where: { role: "TEACHER", schoolId }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }),
    prisma.class.findMany({ where: { schoolId }, select: { id: true, name: true, grade: true }, orderBy: { name: "asc" } }),
    prisma.subject.findMany({ where: { schoolId }, select: { id: true, name: true, code: true }, orderBy: { name: "asc" } }),
    prisma.teacherClass.findMany({ where: { class: { schoolId } }, select: { id: true, teacherId: true, classId: true, subjectId: true, teacher: { select: { name: true, email: true } }, class: { select: { name: true, grade: true } }, subject: { select: { name: true, code: true } } }, orderBy: { createdAt: "desc" } }),
  ])
  return NextResponse.json({ teachers, classes, subjects, assignments })
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SCHOOL_ADMIN"])
    if (!access.ok) return access.response
    const schoolId = access.user.schoolId
    if (!schoolId) return NextResponse.json({ error: "School context required" }, { status: 403 })
    const body = await request.json()
    const teacherId = typeof body.teacherId === "string" ? body.teacherId : ""
    const classId = typeof body.classId === "string" ? body.classId : ""
    const subjectId = typeof body.subjectId === "string" && body.subjectId.trim() ? body.subjectId : null
    if (!teacherId || !classId) return NextResponse.json({ error: "Teacher and class are required" }, { status: 400 })
    const [teacher, classData, subject] = await Promise.all([
      prisma.user.findFirst({ where: { id: teacherId, role: "TEACHER", schoolId }, select: { id: true } }),
      prisma.class.findFirst({ where: { id: classId, schoolId }, select: { id: true } }),
      subjectId ? prisma.subject.findFirst({ where: { id: subjectId, schoolId }, select: { id: true } }) : null,
    ])
    if (!teacher || !classData || (subjectId && !subject)) return NextResponse.json({ error: "Teacher, class, or subject not found in your school" }, { status: 404 })
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
    const schoolId = access.user.schoolId
    if (!schoolId) return NextResponse.json({ error: "School context required" }, { status: 403 })
    const id = request.nextUrl.searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Assignment ID is required" }, { status: 400 })
    const assignment = await prisma.teacherClass.findFirst({ where: { id, class: { schoolId } }, select: { id: true } })
    if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    await prisma.teacherClass.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Teacher assignment deletion error:", error)
    return NextResponse.json({ error: "Unable to remove teacher assignment" }, { status: 500 })
  }
}
