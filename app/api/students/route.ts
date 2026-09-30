import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import { schoolScope, requireRole } from "@/lib/authorization"

const studentSelect = { id: true, name: true, admissionNo: true, classId: true, schoolId: true, createdAt: true, updatedAt: true, class: { select: { id: true, name: true, grade: true } }, school: { select: { id: true, name: true } } } as const

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const access = schoolScope(session, new URL(request.url).searchParams.get("schoolId"))
    if (!access.ok) return access.response
    if (!["SCHOOL_ADMIN", "TEACHER"].includes(access.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    const students = await prisma.student.findMany({ where: access.schoolId ? { schoolId: access.schoolId } : undefined, select: studentSelect, orderBy: { name: "asc" } })
    return NextResponse.json(students)
  } catch (error) {
    console.error("Student fetch error:", error)
    return NextResponse.json({ error: "Unable to load students" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SCHOOL_ADMIN"])
    if (!access.ok) return access.response
    const { name, admissionNo, classId, schoolId: requestSchoolId } = await request.json()
    const schoolId = access.role === "SCHOOL_ADMIN" ? access.user.schoolId : requestSchoolId
    if (!name || !admissionNo || !classId || !schoolId) return NextResponse.json({ error: "Name, admission number, class, and school are required" }, { status: 400 })
    const classData = await prisma.class.findFirst({ where: { id: classId, schoolId }, select: { id: true } })
    if (!classData) return NextResponse.json({ error: "Class does not belong to the selected school" }, { status: 400 })
    const student = await prisma.student.create({ data: { name: String(name).trim(), admissionNo: String(admissionNo).trim(), classId, schoolId }, select: studentSelect })
    return NextResponse.json(student, { status: 201 })
  } catch (error) {
    console.error("Student creation error:", error)
    return NextResponse.json({ error: "Unable to create student" }, { status: 500 })
  }
}
