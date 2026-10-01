import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import { schoolScope, requireRole } from "@/lib/authorization"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const access = schoolScope(session, new URL(request.url).searchParams.get("schoolId"))
    if (!access.ok) return access.response
    const classes = await prisma.class.findMany({ where: access.role === "TEACHER" ? { schoolId: access.schoolId, teachers: { some: { teacherId: access.user.id } } } : access.schoolId ? { schoolId: access.schoolId } : undefined, select: { id: true, name: true, grade: true, schoolId: true, school: { select: { id: true, name: true } } }, orderBy: { name: "asc" } })
    return NextResponse.json(classes)
  } catch (error) {
    console.error("Class fetch error:", error)
    return NextResponse.json({ error: "Unable to load classes" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SUPER_ADMIN", "SCHOOL_ADMIN"])
    if (!access.ok) return access.response
    const { name, grade, schoolId: requestSchoolId } = await request.json()
    const schoolId = access.role === "SCHOOL_ADMIN" ? access.user.schoolId : requestSchoolId
    if (!name || !grade || !schoolId) return NextResponse.json({ error: "Name, grade, and school are required" }, { status: 400 })
    const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { id: true } })
    if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 })
    const classData = await prisma.class.create({ data: { name: String(name).trim(), grade: String(grade).trim(), schoolId }, select: { id: true, name: true, grade: true, schoolId: true } })
    return NextResponse.json(classData, { status: 201 })
  } catch (error) {
    console.error("Class creation error:", error)
    return NextResponse.json({ error: "Unable to create class" }, { status: 500 })
  }
}
