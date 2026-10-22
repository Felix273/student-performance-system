import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import TeacherLessonsScheduleClient from "./TeacherLessonsScheduleClient"

export const metadata = {
  title: "Teacher Lesson Workspace | Fentech StudentOS",
}

export default async function TeacherLessonsPage() {
  const session = await auth()
  if (!session?.user || !["TEACHER", "SCHOOL_ADMIN"].includes(session.user.role || "")) {
    redirect("/dashboard")
  }

  const schoolId = session.user.schoolId
  if (!schoolId) redirect("/dashboard")

  const isSchoolAdmin = session.user.role === "SCHOOL_ADMIN"
  const isTeacher = session.user.role === "TEACHER"

  const [lessons, teachers] = await Promise.all([
    prisma.timetableEntry.findMany({
      where: {
        schoolId,
        ...(isTeacher ? { teacherId: session.user.id } : {}),
      },
      include: {
        class: { select: { id: true, name: true, grade: true } },
        subject: { select: { id: true, name: true, code: true } },
        teacher: { select: { id: true, name: true, email: true } },
        sessions: {
          select: { id: true, state: true, lastSavedAt: true },
          orderBy: { lastSavedAt: "desc" },
          take: 1,
        },
        focuses: {
          select: { id: true, learningOutcomeId: true, competencyId: true, note: true },
        },
      },
      orderBy: [{ day: "asc" }, { startTime: "asc" }],
    }),
    isSchoolAdmin
      ? prisma.user.findMany({
          where: { schoolId, role: "TEACHER" },
          select: { id: true, name: true, email: true },
          orderBy: { name: "asc" },
        })
      : [],
  ])

  return (
    <TeacherLessonsScheduleClient
      lessons={lessons as any}
      teachers={teachers}
      isSchoolAdmin={isSchoolAdmin}
    />
  )
}
