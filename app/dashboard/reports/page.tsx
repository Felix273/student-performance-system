import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import ReportsClient from "./ReportsClient"

export default async function ReportsPage() {
  const session = await auth()
  
  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "SCHOOL_ADMIN")) {
    redirect("/dashboard")
  }

  // Fetch schools, classes, and students
  const whereClause = session.user.role === "SCHOOL_ADMIN" 
    ? { schoolId: session.user.schoolId }
    : {}

  const [schools, classes, students] = await Promise.all([
    session.user.role === "SUPER_ADMIN" 
      ? prisma.school.findMany({ orderBy: { name: 'asc' } })
      : prisma.school.findMany({ 
          where: { id: session.user.schoolId },
          orderBy: { name: 'asc' }
        }),
    prisma.class.findMany({ 
      where: whereClause,
      include: { school: true },
      orderBy: { name: 'asc' }
    }),
    prisma.student.findMany({
      where: whereClause,
      include: { 
        class: true,
        school: true 
      },
      orderBy: { name: 'asc' }
    })
  ])

  return (
    <ReportsClient 
      schools={schools}
      classes={classes}
      students={students}
      userRole={session.user.role}
      userSchoolId={session.user.schoolId || ""}
    />
  )
}
