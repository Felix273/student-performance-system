import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import { schoolScope, requireRole } from "@/lib/authorization"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const access = schoolScope(session, new URL(request.url).searchParams.get("schoolId"))
    if (!access.ok) return access.response
    const subjects = await prisma.subject.findMany({ where: access.schoolId ? { schoolId: access.schoolId } : undefined, select: { id: true, name: true, code: true, schoolId: true }, orderBy: { name: "asc" } })
    return NextResponse.json(subjects)
  } catch (error) {
    console.error("Subject fetch error:", error)
    return NextResponse.json({ error: "Unable to load subjects" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SCHOOL_ADMIN"])
    if (!access.ok) return access.response
    const { name, code, schoolId: requestSchoolId } = await request.json()
    const schoolId = access.role === "SCHOOL_ADMIN" ? access.user.schoolId : requestSchoolId
    if (!name || !code || !schoolId) return NextResponse.json({ error: "Name, code, and school are required" }, { status: 400 })
    const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { id: true } })
    if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 })
    const subject = await prisma.subject.create({ data: { name: String(name).trim(), code: String(code).trim().toUpperCase(), schoolId }, select: { id: true, name: true, code: true, schoolId: true } })
    return NextResponse.json(subject, { status: 201 })
  } catch (error) {
    console.error("Subject creation error:", error)
    return NextResponse.json({ error: "Unable to create subject" }, { status: 500 })
  }
}
