import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import SchoolsDirectory from "./SchoolsDirectory"
import { loadAdminCounts, scoreReadiness } from "@/lib/platform/readiness"

export default async function SchoolsPage() {
  const session = await auth()
  if (session?.user.role !== "SUPER_ADMIN") redirect("/dashboard")

  const schools = await prisma.school.findMany({
    include: {
      _count: {
        select: {
          users: true,
          students: true,
          classes: true,
          curriculumOfferings: true,
          timetableEntries: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })
  const adminCounts = await loadAdminCounts()

  return (
    <SchoolsDirectory
      schools={schools.map((school) => ({
        id: school.id,
        name: school.name,
        domain: school.domain,
        createdAt: school.createdAt.toISOString(),
        counts: school._count,
        readiness: scoreReadiness({ admins: adminCounts.get(school.id) ?? 0, classes: school._count.classes, curriculum: school._count.curriculumOfferings, timetable: school._count.timetableEntries }).score,
      }))}
    />
  )
}
