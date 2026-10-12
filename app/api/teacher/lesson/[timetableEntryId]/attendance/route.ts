import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import { authorizeTeacherLesson, lessonError } from "@/lib/teacherLessonWorkspace"

type RouteContext = { params: Promise<{ timetableEntryId: string }> }
const statuses = new Set(["PRESENT", "ABSENT", "LATE", "EXCUSED"])

function parseDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth()
    const { timetableEntryId } = await params
    const lesson = await authorizeTeacherLesson(session, timetableEntryId)
    if (!lesson.ok) return lessonError(lesson)
    if (lesson.access.role !== "TEACHER") return NextResponse.json({ error: "Only the assigned teacher can take attendance" }, { status: 403 })
    const teacherId = lesson.access.user.id
    if (!teacherId) return NextResponse.json({ error: "Teacher account is invalid" }, { status: 403 })

    const body = await request.json()
    const date = parseDate(body.date)
    if (!date || !Array.isArray(body.records) || body.records.length < 1 || body.records.length > 1000) {
      return NextResponse.json({ error: "Provide a valid date and between 1 and 1,000 attendance records" }, { status: 400 })
    }
    const expectedRevision = body.expectedRevision === undefined ? undefined : Number(body.expectedRevision)
    if (expectedRevision !== undefined && (!Number.isInteger(expectedRevision) || expectedRevision < 0)) {
      return NextResponse.json({ error: "expectedRevision must be a non-negative integer" }, { status: 400 })
    }

    const rawRecords = body.records as unknown[]
    const ids = [...new Set(rawRecords.flatMap((value) => typeof value === "object" && value !== null && "studentId" in value && typeof value.studentId === "string" ? [value.studentId] : []))]
    const students = await prisma.student.findMany({
      where: { id: { in: ids }, schoolId: lesson.entry.schoolId, classId: lesson.entry.classId },
      select: { id: true },
    })
    const validStudentIds = new Set(students.map((student) => student.id))
    const validRecords: Array<{ studentId: string; status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"; remarks: string | null }> = []
    const failures: Array<{ studentId: string | null; reason: string }> = []

    for (const raw of rawRecords) {
      if (typeof raw !== "object" || raw === null || !("studentId" in raw) || typeof raw.studentId !== "string") {
        failures.push({ studentId: null, reason: "Student ID is required" })
        continue
      }
      const record = raw as { studentId: string; status?: unknown; reason?: unknown }
      if (!validStudentIds.has(record.studentId)) {
        failures.push({ studentId: record.studentId, reason: "Student is not in this class" })
        continue
      }
      if (typeof record.status !== "string" || !statuses.has(record.status)) {
        failures.push({ studentId: record.studentId, reason: "Invalid attendance status" })
        continue
      }
      validRecords.push({
        studentId: record.studentId,
        status: record.status as "PRESENT" | "ABSENT" | "LATE" | "EXCUSED",
        remarks: typeof record.reason === "string" ? record.reason.trim().slice(0, 500) || null : null,
      })
    }

    if (new Set(validRecords.map((record) => record.studentId)).size !== validRecords.length) {
      return NextResponse.json({ error: "Each learner may appear only once in an attendance save" }, { status: 400 })
    }
    if (validRecords.length === 0) return NextResponse.json({ savedCount: 0, failures }, { status: 207 })

    const workspaceTeacherId = lesson.entry.teacherId
    const workspaceSession = await prisma.lessonWorkspaceSession.upsert({
      where: { timetableEntryId_teacherId: { timetableEntryId: lesson.entry.id, teacherId: workspaceTeacherId } },
      create: { schoolId: lesson.entry.schoolId, timetableEntryId: lesson.entry.id, teacherId: workspaceTeacherId },
      update: {},
      select: { id: true, lastClientRevision: true },
    })
    if (expectedRevision !== undefined && workspaceSession.lastClientRevision !== expectedRevision) {
      return NextResponse.json({ error: "Workspace changed in another session; reload before continuing", code: "REVISION_CONFLICT", revision: workspaceSession.lastClientRevision }, { status: 409 })
    }

    try {
      await prisma.$transaction(async (tx) => {
        const sessionUpdate = await tx.lessonWorkspaceSession.updateMany({
          where: { id: workspaceSession.id, ...(expectedRevision === undefined ? {} : { lastClientRevision: expectedRevision }), state: { in: ["OPEN", "RETURNED"] } },
          data: { lastClientRevision: { increment: 1 }, lastSavedAt: new Date() },
        })
        if (sessionUpdate.count !== 1) throw new Error("REVISION_CONFLICT")
        await Promise.all(validRecords.map((record) => tx.attendance.upsert({
          where: { studentId_date: { studentId: record.studentId, date } },
          update: { status: record.status, remarks: record.remarks, createdBy: teacherId },
          create: { studentId: record.studentId, date, status: record.status, remarks: record.remarks, createdBy: teacherId },
        })))
      })
    } catch (error) {
      if (error instanceof Error && error.message === "REVISION_CONFLICT") {
        const latest = await prisma.lessonWorkspaceSession.findUnique({ where: { id: workspaceSession.id }, select: { lastClientRevision: true } })
        return NextResponse.json({ error: "Workspace changed in another session; reload before continuing", code: "REVISION_CONFLICT", revision: latest?.lastClientRevision }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({ savedCount: validRecords.length, failures, revision: workspaceSession.lastClientRevision + 1 }, { status: failures.length ? 207 : 200 })
  } catch (error) {
    console.error("Teacher lesson attendance save error:", error)
    return NextResponse.json({ error: "Unable to save lesson attendance" }, { status: 500 })
  }
}