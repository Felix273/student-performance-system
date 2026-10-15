import { prisma } from "@/lib/prisma"

export type ReadinessCounts = { admins: number; adminSignIns: number; academicYears: number; classes: number; subjects: number; assignedTeachers: number; curriculum: number; timetable: number }
export type ReadinessCheck = { label: string; complete: boolean }

/** The one definition of "ready", used by the platform page, the directory and the school profile. */
export function scoreReadiness(counts: ReadinessCounts) {
  const checks: ReadinessCheck[] = [
    { label: "School administrator", complete: counts.admins > 0 },
    { label: "Administrator signed in", complete: counts.adminSignIns > 0 },
    { label: "Academic year", complete: counts.academicYears > 0 },
    { label: "Classes", complete: counts.classes > 0 },
    { label: "Subjects", complete: counts.subjects > 0 },
    { label: "Teachers assigned", complete: counts.assignedTeachers > 0 },
    { label: "Curriculum", complete: counts.curriculum > 0 },
    { label: "Timetable", complete: counts.timetable > 0 },
  ]
  const score = Math.round((checks.filter((check) => check.complete).length / checks.length) * 100)
  return { checks, score, ready: score === 100 }
}

/** Counts only assigned teaching accounts and admin setup state; no staff identities leave this helper. */
export async function loadReadinessPeopleCounts(schoolIds: string[]) {
  if (!schoolIds.length) return new Map<string, { admins: number; adminSignIns: number; assignedTeachers: number }>()
  const [admins, signedInAdmins, assignments] = await Promise.all([
    prisma.user.groupBy({ by: ["schoolId"], where: { role: "SCHOOL_ADMIN", schoolId: { in: schoolIds } }, _count: { _all: true } }),
    prisma.user.groupBy({ by: ["schoolId"], where: { role: "SCHOOL_ADMIN", lastLoginAt: { not: null }, schoolId: { in: schoolIds } }, _count: { _all: true } }),
    prisma.teacherClass.findMany({
      where: { teacher: { role: "TEACHER" }, class: { schoolId: { in: schoolIds } } },
      select: { teacherId: true, class: { select: { schoolId: true } } },
      distinct: ["teacherId", "classId"],
    }),
  ])

  const result = new Map(schoolIds.map((id) => [id, { admins: 0, adminSignIns: 0, assignedTeachers: 0 }]))
  for (const row of admins) if (row.schoolId) result.get(row.schoolId)!.admins = row._count._all
  for (const row of signedInAdmins) if (row.schoolId) result.get(row.schoolId)!.adminSignIns = row._count._all
  const teachersBySchool = new Map<string, Set<string>>()
  for (const assignment of assignments) {
    const schoolId = assignment.class.schoolId
    const teachers = teachersBySchool.get(schoolId) ?? new Set<string>()
    teachers.add(assignment.teacherId)
    teachersBySchool.set(schoolId, teachers)
  }
  for (const [schoolId, teachers] of teachersBySchool) result.get(schoolId)!.assignedTeachers = teachers.size
  return result
}
