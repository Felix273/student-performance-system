import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import ReportsClient from "./ReportsClient"

export const metadata = {
  title: "Reports & Transcripts | Fentech StudentOS",
}

export default async function ReportsPage() {
  const session = await auth()
  
  if (!session || !["SCHOOL_ADMIN", "TEACHER"].includes(session.user.role || "")) {
    redirect("/dashboard")
  }

  const schoolId = session.user.schoolId
  if (!schoolId) {
    redirect("/dashboard")
  }

  const isTeacher = session.user.role === "TEACHER"

  // Fetch classes scoped to teacher if teacher, or all classes if admin
  const [school, classes, students, academicYears] = await Promise.all([
    prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, name: true, county: true },
    }),
    prisma.class.findMany({
      where: {
        schoolId,
        ...(isTeacher ? { teachers: { some: { teacherId: session.user.id } } } : {}),
      },
      select: { id: true, name: true, grade: true, schoolId: true },
      orderBy: { name: "asc" },
    }),
    prisma.student.findMany({
      where: {
        schoolId,
        ...(isTeacher ? { class: { teachers: { some: { teacherId: session.user.id } } } } : {}),
      },
      select: {
        id: true,
        name: true,
        admissionNo: true,
        classId: true,
        schoolId: true,
        class: { select: { id: true, name: true, grade: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.academicYear.findMany({
      where: { schoolId },
      include: {
        periods: {
          orderBy: { sequence: "asc" },
          select: { id: true, name: true, code: true, startsOn: true, endsOn: true },
        },
      },
      orderBy: { startsOn: "desc" },
    }),
  ])

  // Flatten periods with academic year prefix (e.g., "2026 • Term 1")
  const periods = academicYears.flatMap((y) =>
    y.periods.map((p) => ({
      id: p.id,
      name: `${y.name} • ${p.name}`,
      isCurrentYear: y.isCurrent,
    }))
  )

  return (
    <ReportsClient
      school={school}
      classes={classes}
      students={students}
      periods={periods}
      userRole={session.user.role || ""}
      userSchoolId={schoolId}
    />
  )
}
