import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import NotificationsClient from "./NotificationsClient"

export default async function NotificationsPage() {
  const session = await auth()
  
  if (!session || session.user.role !== "SCHOOL_ADMIN") {
    redirect("/dashboard")
  }

  const whereClause = session.user.role === "SCHOOL_ADMIN" && session.user.schoolId
    ? { schoolId: session.user.schoolId }
    : {}

  const [students, users] = await Promise.all([
    prisma.student.findMany({
      where: whereClause,
      include: {
        class: true,
        parents: {
          include: {
            parent: true
          }
        }
      },
      orderBy: { name: 'asc' }
    }),
    prisma.user.findMany({
      where: {
        ...whereClause,
        email: session.user.email ? { not: session.user.email } : undefined
      },
      orderBy: { name: 'asc' }
    })
  ])

  return (
    <NotificationsClient 
      students={students}
      users={users}
      userRole={session.user.role}
    />
  )
}
