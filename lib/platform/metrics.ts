import { prisma } from "@/lib/prisma"

export type WeeklyPlatformMetric = { weekStart: string; label: string; schoolsCreated: number; activity: number }

export async function loadWeeklyPlatformMetrics(now = new Date()): Promise<WeeklyPlatformMetric[]> {
  const currentWeek = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const daysSinceMonday = (currentWeek.getUTCDay() + 6) % 7
  currentWeek.setUTCDate(currentWeek.getUTCDate() - daysSinceMonday)
  currentWeek.setUTCHours(0, 0, 0, 0)
  const from = new Date(currentWeek)
  from.setUTCDate(from.getUTCDate() - 11 * 7)

  const rows = await prisma.$queryRaw<{ weekStart: Date; schoolsCreated: bigint; activity: bigint }[]>`
    SELECT date_trunc('week', "createdAt") AS "weekStart",
      COUNT(*) FILTER (WHERE "action" = 'school.created') AS "schoolsCreated",
      COUNT(*) AS "activity"
    FROM "PlatformAuditEvent"
    WHERE "createdAt" >= ${from}
    GROUP BY date_trunc('week', "createdAt")
    ORDER BY "weekStart" ASC
  `
  const counts = new Map(rows.map((row) => [row.weekStart.toISOString().slice(0, 10), row]))

  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(from)
    date.setUTCDate(date.getUTCDate() + index * 7)
    const key = date.toISOString().slice(0, 10)
    const row = counts.get(key)
    return {
      weekStart: key,
      label: date.toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" }),
      schoolsCreated: Number(row?.schoolsCreated ?? 0),
      activity: Number(row?.activity ?? 0),
    }
  })
}