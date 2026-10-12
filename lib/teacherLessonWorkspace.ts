import type { Session } from "next-auth"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/authorization"

export async function authorizeTeacherLesson(session: Session | null, timetableEntryId: string) {
  const access = requireRole(session, ["TEACHER", "SCHOOL_ADMIN"])
  if (!access.ok) return { ok: false as const, response: access.response }
  const schoolId = access.user.schoolId
  const userId = access.user.id
  if (!schoolId || !userId) return { ok: false as const, status: 403, message: "Account is missing school or user context" }

  const entry = await prisma.timetableEntry.findFirst({
    where: { id: timetableEntryId, schoolId },
    select: {
      id: true,
      schoolId: true,
      academicYearId: true,
      periodId: true,
      classId: true,
      teacherId: true,
      subjectId: true,
      curriculumAssignmentId: true,
    },
  })
  if (!entry) return { ok: false as const, status: 404, message: "Lesson not found" }

  if (access.role === "TEACHER") {
    if (entry.teacherId !== userId) return { ok: false as const, status: 404, message: "Lesson not found" }
    const assignment = await prisma.teacherClass.findFirst({
      where: {
          teacherId: userId,
        classId: entry.classId,
        OR: [{ subjectId: entry.subjectId }, { subjectId: null }],
      },
      select: { id: true },
    })
    if (!assignment) return { ok: false as const, status: 403, message: "You are not assigned to this lesson" }
  }

  let curriculumAssignment = entry.curriculumAssignmentId
    ? await prisma.classCurriculumAssignment.findFirst({
        where: {
          id: entry.curriculumAssignmentId,
          schoolId: entry.schoolId,
          classId: entry.classId,
          academicYearId: entry.academicYearId,
        },
        select: { id: true, schoolId: true, classId: true, academicYearId: true, periodId: true, status: true, offering: { select: { curriculumVersionId: true } } },
      })
    : null

  if (!entry.curriculumAssignmentId) {
    const matches = await prisma.classCurriculumAssignment.findMany({
      where: {
        schoolId: entry.schoolId,
        classId: entry.classId,
        academicYearId: entry.academicYearId,
        status: "ACTIVE",
        ...(entry.periodId ? { OR: [{ periodId: entry.periodId }, { periodId: null }] } : {}),
      },
      select: { id: true, schoolId: true, classId: true, academicYearId: true, periodId: true, status: true, offering: { select: { curriculumVersionId: true } } },
    })
    if (matches.length === 1) curriculumAssignment = matches[0]
    else if (matches.length > 1) return { ok: false as const, status: 409, message: "This timetable entry has an ambiguous curriculum assignment" }
  }

  return { ok: true as const, access, entry, curriculumAssignment }
}

export function lessonError(result: { ok: false; response?: Response; status?: number; message?: string }) {
  if (result.response) return result.response
  return Response.json({ error: result.message ?? "Unable to access lesson" }, { status: result.status ?? 403 })
}