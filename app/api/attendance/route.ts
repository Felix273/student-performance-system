import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import { canAccessClass } from "@/lib/authorization"

const STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const

function dateOnly(value: string) {
  const match = /^\d{4}-\d{2}-\d{2}$/.test(value)
  if (!match) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const body = await request.json()
    const { classId, records } = body
    if (!classId || !Array.isArray(records) || records.length === 0 || records.length > 1000) return NextResponse.json({ error: "Provide a class and between 1 and 1,000 attendance records" }, { status: 400 })
    const access = await canAccessClass(session, classId)
    if (!access.ok || !["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"].includes(access.role)) return access.ok ? NextResponse.json({ error: "Forbidden" }, { status: 403 }) : access.response
    const actorId = access.user.id!
    const students = await prisma.student.findMany({ where: { classId, schoolId: access.classData.schoolId }, select: { id: true } })
    const validStudentIds = new Set(students.map((student) => student.id))
    const results = { created: 0, updated: 0, failed: [] as string[] }

    for (const record of records) {
      const date = dateOnly(String(record.date || ""))
      if (!validStudentIds.has(record.studentId)) { results.failed.push(`${record.studentId || "Unknown"}: student is not in this class`); continue }
      if (!date || !(STATUSES as readonly string[]).includes(record.status)) { results.failed.push(`${record.studentId}: invalid date or status`); continue }
      try {
        const existing = await prisma.attendance.findUnique({ where: { studentId_date: { studentId: record.studentId, date } }, select: { id: true } })
        await prisma.attendance.upsert({
          where: { studentId_date: { studentId: record.studentId, date } },
          update: { status: record.status, remarks: record.remarks ? String(record.remarks).slice(0, 500) : null, createdBy: actorId },
          create: { studentId: record.studentId, date, status: record.status, remarks: record.remarks ? String(record.remarks).slice(0, 500) : null, createdBy: actorId },
        })
        if (existing) results.updated++
        else results.created++
      } catch { results.failed.push(`${record.studentId}: unable to save record`) }
    }
    return NextResponse.json({ message: results.failed.length ? "Attendance saved with errors" : "Attendance saved successfully", ...results }, { status: results.failed.length ? 207 : 200 })
  } catch (error) {
    console.error("Attendance save error:", error)
    return NextResponse.json({ error: "Unable to save attendance" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const { searchParams } = new URL(request.url)
    const classId = searchParams.get("classId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    if (!classId) return NextResponse.json({ error: "Class ID required" }, { status: 400 })
    const access = await canAccessClass(session, classId)
    if (!access.ok || !["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"].includes(access.role)) return access.ok ? NextResponse.json({ error: "Forbidden" }, { status: 403 }) : access.response
    const where: { student: { classId: string; schoolId: string }; date?: { gte?: Date; lte?: Date } } = { student: { classId, schoolId: access.classData.schoolId } }
    if (startDate && endDate) {
      const from = dateOnly(startDate); const to = dateOnly(endDate)
      if (!from || !to) return NextResponse.json({ error: "Invalid date range" }, { status: 400 })
      where.date = { gte: from, lte: to }
    }
    const attendance = await prisma.attendance.findMany({ where, select: { id: true, date: true, status: true, remarks: true, student: { select: { id: true, name: true, admissionNo: true } } }, orderBy: { date: "desc" } })
    return NextResponse.json(attendance)
  } catch (error) {
    console.error("Attendance fetch error:", error)
    return NextResponse.json({ error: "Unable to load attendance" }, { status: 500 })
  }
}
