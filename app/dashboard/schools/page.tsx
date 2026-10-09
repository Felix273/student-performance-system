import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import SchoolsDirectory from "./SchoolsDirectory"

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

  return (
    <SchoolsDirectory
      schools={schools.map((school) => ({
        id: school.id,
        name: school.name,
        domain: school.domain,
        createdAt: school.createdAt.toISOString(),
        counts: school._count,
      }))}
    />
  )
}
