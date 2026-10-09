import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import { schoolScope, requireRole } from "@/lib/authorization"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const access = schoolScope(session, new URL(request.url).searchParams.get("schoolId"))
    if (!access.ok || !["SCHOOL_ADMIN", "TEACHER"].includes(access.role)) return access.ok ? NextResponse.json({ error: "Forbidden" }, { status: 403 }) : access.response
    const assessments = await prisma.assessment.findMany({ where: access.role === "TEACHER" ? { schoolId: access.schoolId, class: { teachers: { some: { teacherId: access.user.id } } } } : { schoolId: access.schoolId }, select: { id: true, title: true, type: true, maxScore: true, date: true, schoolId: true, class: { select: { id: true, name: true } }, subject: { select: { id: true, name: true } } }, orderBy: { date: "desc" } })
    return NextResponse.json(assessments)
  } catch (error) {
    console.error("Assessment fetch error:", error)
    return NextResponse.json({ error: "Unable to load assessments" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SCHOOL_ADMIN"])
    if (!access.ok) return access.response
    const { title, type, maxScore, classId, subjectId, schoolId: requestSchoolId, date } = await request.json()
    const schoolId = access.role === "SCHOOL_ADMIN" ? access.user.schoolId : requestSchoolId
    if (!title || !classId || !subjectId || !date || !schoolId || !Number.isFinite(Number(maxScore)) || Number(maxScore) <= 0) return NextResponse.json({ error: "Valid title, class, subject, school, max score, and date are required" }, { status: 400 })
    const parsedDate = new Date(date)
    if (Number.isNaN(parsedDate.getTime())) return NextResponse.json({ error: "Invalid assessment date" }, { status: 400 })
    const [classData, subjectData] = await Promise.all([prisma.class.findFirst({ where: { id: classId, schoolId }, select: { id: true } }), prisma.subject.findFirst({ where: { id: subjectId, schoolId }, select: { id: true } })])
    if (!classData || !subjectData) return NextResponse.json({ error: "Class and subject must belong to the selected school" }, { status: 400 })
    const assessment = await prisma.assessment.create({ data: { title: String(title).trim(), type, maxScore: Number(maxScore), classId, subjectId, schoolId, date: parsedDate }, select: { id: true, title: true, type: true, maxScore: true, classId: true, subjectId: true, schoolId: true, date: true } })
    return NextResponse.json(assessment, { status: 201 })
  } catch (error) {
    console.error("Assessment creation error:", error)
    return NextResponse.json({ error: "Unable to create assessment" }, { status: 500 })
  }
}
