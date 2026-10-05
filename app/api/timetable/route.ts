import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/authorization"

const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as const

export async function GET(request: NextRequest) {
  const session = await auth()
  const access = requireRole(session, ["SCHOOL_ADMIN", "TEACHER"])
  if (!access.ok) return access.response
  const schoolId = access.user.schoolId
  const academicYearId = request.nextUrl.searchParams.get("academicYearId")
  const where = {
    ...(schoolId ? { schoolId } : {}),
    ...(academicYearId ? { academicYearId } : {}),
    ...(access.role === "TEACHER" ? { teacherId: access.user.id } : {}),
  }
  const [entries, years, classes, teachers, subjects, periods] = await Promise.all([
    prisma.timetableEntry.findMany({ where, include: { class: { select: { id: true, name: true, grade: true } }, teacher: { select: { id: true, name: true } }, subject: { select: { id: true, name: true, code: true } }, academicYear: { select: { id: true, name: true } }, period: { select: { id: true, name: true } } }, orderBy: [{ day: "asc" }, { startTime: "asc" }] }),
    prisma.academicYear.findMany({ where: schoolId ? { schoolId } : undefined, select: { id: true, name: true, isCurrent: true }, orderBy: { name: "desc" } }),
    access.role === "TEACHER" ? [] : prisma.class.findMany({ where: schoolId ? { schoolId } : undefined, select: { id: true, name: true, grade: true }, orderBy: { name: "asc" } }),
    access.role === "TEACHER" ? [] : prisma.user.findMany({ where: { role: "TEACHER", ...(schoolId ? { schoolId } : {}) }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    access.role === "TEACHER" ? [] : prisma.subject.findMany({ where: schoolId ? { schoolId } : undefined, select: { id: true, name: true, code: true }, orderBy: { name: "asc" } }),
    prisma.academicPeriod.findMany({ where: schoolId ? { academicYear: { schoolId } } : undefined, select: { id: true, name: true, academicYearId: true }, orderBy: { sequence: "asc" } }),
  ])
  return NextResponse.json({ entries, years, classes, teachers, subjects, periods, days })
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SCHOOL_ADMIN"])
    if (!access.ok) return access.response
    const body = await request.json()
    const values = { academicYearId: body.academicYearId, periodId: typeof body.periodId === "string" && body.periodId ? body.periodId : undefined, classId: body.classId, teacherId: body.teacherId, subjectId: body.subjectId, day: body.day, startTime: body.startTime, endTime: body.endTime, room: body.room || undefined, notes: body.notes || undefined }
    if (!values.academicYearId || !values.classId || !values.teacherId || !values.subjectId || !days.includes(values.day) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(values.startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(values.endTime) || values.startTime >= values.endTime) return NextResponse.json({ error: "Provide a valid year, class, teacher, subject, day, and time range" }, { status: 400 })
    const schoolId = access.role === "SCHOOL_ADMIN" ? access.user.schoolId : (await prisma.class.findUnique({ where: { id: values.classId }, select: { schoolId: true } }))?.schoolId
    if (!schoolId) return NextResponse.json({ error: "School context required" }, { status: 400 })
    const [classData, teacher, subject, year, assignment] = await Promise.all([
      prisma.class.findUnique({ where: { id: values.classId }, select: { id: true, schoolId: true } }),
      prisma.user.findUnique({ where: { id: values.teacherId }, select: { id: true, role: true, schoolId: true } }),
      prisma.subject.findUnique({ where: { id: values.subjectId }, select: { id: true, schoolId: true } }),
      prisma.academicYear.findUnique({ where: { id: values.academicYearId }, select: { id: true, schoolId: true } }),
      prisma.teacherClass.findFirst({ where: { teacherId: values.teacherId, classId: values.classId, ...(values.subjectId ? { OR: [{ subjectId: values.subjectId }, { subjectId: null }] } : {}) }, select: { id: true } }),
    ])
    if (!classData || !teacher || teacher.role !== "TEACHER" || !subject || !year || !assignment) return NextResponse.json({ error: "Teacher must be assigned to this class and subject before adding a timetable entry" }, { status: 400 })
    if ([classData.schoolId, teacher.schoolId, subject.schoolId, year.schoolId].some((id) => id !== schoolId)) return NextResponse.json({ error: "All timetable records must belong to the same school" }, { status: 400 })
    const conflict = await prisma.timetableEntry.findFirst({ where: { schoolId, academicYearId: values.academicYearId, day: values.day, OR: [{ teacherId: values.teacherId }, { classId: values.classId }], startTime: { lt: values.endTime }, endTime: { gt: values.startTime } }, select: { id: true, teacherId: true, classId: true } })
    if (conflict) return NextResponse.json({ error: "This time overlaps an existing class or teacher timetable entry" }, { status: 409 })
    const entry = await prisma.timetableEntry.create({ data: { schoolId, ...values } })
    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    console.error("Timetable create error:", error)
    return NextResponse.json({ error: "Unable to save timetable entry" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth()
  const access = requireRole(session, ["SCHOOL_ADMIN"])
  if (!access.ok) return access.response
  const id = request.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Entry ID is required" }, { status: 400 })
  const entry = await prisma.timetableEntry.findUnique({ where: { id }, select: { id: true, schoolId: true } })
  if (!entry) return NextResponse.json({ error: "Timetable entry not found" }, { status: 404 })
  if (access.role !== "SUPER_ADMIN" && entry.schoolId !== access.user.schoolId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  await prisma.timetableEntry.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
