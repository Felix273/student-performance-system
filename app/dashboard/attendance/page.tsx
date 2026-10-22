import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import AttendanceOverviewClient from "./AttendanceOverviewClient"

export const metadata = {
  title: "Daily Attendance | Fentech StudentOS",
}

export default async function AttendancePage() {
  const session = await auth()
  if (!session || !["SCHOOL_ADMIN", "TEACHER"].includes(session.user.role || "")) {
    redirect("/dashboard")
  }

  const schoolId = session.user.schoolId
  if (!schoolId) redirect("/dashboard")

  const isTeacher = session.user.role === "TEACHER"

  // Fetch classes: scoped to teacher if teacher, or all school classes if admin
  const classes = await prisma.class.findMany({
    where: {
      schoolId,
      ...(isTeacher ? { teachers: { some: { teacherId: session.user.id } } } : {}),
    },
    select: {
      id: true,
      name: true,
      grade: true,
      _count: { select: { students: true } },
    },
    orderBy: { name: "asc" },
  })

  // Normalize today's date to UTC midnight for Prisma lookup
  const todayString = new Date().toISOString().split("T")[0]
  const todayDate = new Date(`${todayString}T00:00:00.000Z`)

  const todayRecords = await prisma.attendance.findMany({
    where: {
      student: { schoolId },
      date: todayDate,
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          admissionNo: true,
          class: { select: { id: true, name: true, grade: true } },
        },
      },
    },
  })

  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  return (
    <AttendanceOverviewClient
      classes={classes}
      todayRecords={todayRecords as any}
      todayFormatted={todayFormatted}
    />
  )
}
