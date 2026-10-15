import { prisma } from "@/lib/prisma"

export type ReadinessCounts = { admins: number; classes: number; curriculum: number; timetable: number }
export type ReadinessCheck = { label: "School administrator" | "Classes" | "Curriculum" | "Timetable"; complete: boolean }

/** The one definition of "ready", used by the platform page, the directory and the school profile. */
export function scoreReadiness(counts: ReadinessCounts) {
  const checks: ReadinessCheck[] = [
    { label: "School administrator", complete: counts.admins > 0 },
    { label: "Classes", complete: counts.classes > 0 },
    { label: "Curriculum", complete: counts.curriculum > 0 },
    { label: "Timetable", complete: counts.timetable > 0 },
  ]
  const score = Math.round((checks.filter((check) => check.complete).length / checks.length) * 100)
  return { checks, score, ready: score === 100 }
}

/** Administrator counts must come from role = SCHOOL_ADMIN, never from the total number of users. */
export async function loadAdminCounts(schoolIds?: string[]) {
  const rows = await prisma.user.groupBy({
    by: ["schoolId"],
    where: { role: "SCHOOL_ADMIN", ...(schoolIds ? { schoolId: { in: schoolIds } } : { schoolId: { not: null } }) },
    _count: { _all: true },
  })
  return new Map(rows.map((row) => [row.schoolId as string, row._count._all]))
}
