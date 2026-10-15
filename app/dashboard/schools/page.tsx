import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import SchoolsDirectory from "./SchoolsDirectory"
import { loadReadinessPeopleCounts, scoreReadiness } from "@/lib/platform/readiness"

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
          subjects: true,
          academicYears: true,
          curriculumOfferings: true,
          timetableEntries: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })
  const peopleCounts = await loadReadinessPeopleCounts(schools.map((school) => school.id))

  return (
    <SchoolsDirectory
      schools={schools.map((school) => ({
        id: school.id,
        name: school.name,
        domain: school.domain,
        status: school.status,
        createdAt: school.createdAt.toISOString(),
        counts: school._count,
        readiness: scoreReadiness({ ...peopleCounts.get(school.id)!, academicYears: school._count.academicYears, classes: school._count.classes, subjects: school._count.subjects, curriculum: school._count.curriculumOfferings, timetable: school._count.timetableEntries }).score,
        assignedTeachers: peopleCounts.get(school.id)!.assignedTeachers,
        academicYears: school._count.academicYears,
        subjects: school._count.subjects,
      }))}
    />
  )
}
