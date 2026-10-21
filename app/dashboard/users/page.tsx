import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import UsersDirectoryClient from "./UsersDirectoryClient"

export const metadata = {
  title: "Users & Staff Directory | Fentech StudentOS",
}

export default async function UsersPage() {
  const session = await auth()
  if (!session || session.user.role !== "SCHOOL_ADMIN") redirect("/dashboard")

  const schoolId = session.user.schoolId
  if (!schoolId) redirect("/dashboard")

  const [users, classes] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: { in: ["TEACHER", "PARENT", "STUDENT"] },
        schoolId,
      },
      include: {
        school: true,
        teacherClasses: {
          include: {
            class: { select: { id: true, name: true, grade: true } },
            subject: { select: { id: true, name: true } },
          },
        },
        children: {
          include: {
            student: { select: { id: true, name: true } },
          },
        },
        studentProfile: {
          select: { id: true, name: true, admissionNo: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.class.findMany({
      where: { schoolId },
      select: { id: true, name: true, grade: true },
      orderBy: { name: "asc" },
    }),
  ])

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Top Header */}
      <section className="flex flex-col justify-between gap-6 border-b border-[#e0e2e8] pb-8 sm:flex-row sm:items-end">
        <div>
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[.2em] text-[#4262ff]">
            People & access
          </p>
          <h1 className="text-4xl font-medium tracking-[-.055em] text-[#1c1c1e] sm:text-5xl">
            Your school community.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#6b6f7e]">
            Manage, edit, and organize the teachers, parents, and learners connected to your school.
          </p>
        </div>
      </section>

      {/* Interactive Users Roster with Live Edit */}
      <UsersDirectoryClient
        initialUsers={users as any}
        classes={classes}
      />
    </div>
  )
}
