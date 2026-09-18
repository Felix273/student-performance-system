import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import FeeStructureForm from "./FeeStructureForm"

export default async function NewFeeStructurePage() {
  const session = await auth()
  
  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "SCHOOL_ADMIN")) {
    redirect("/dashboard")
  }

  const whereClause = session.user.role === "SCHOOL_ADMIN" && session.user.schoolId
    ? { schoolId: session.user.schoolId }
    : {}

  const [schools, classes] = await Promise.all([
    session.user.role === "SUPER_ADMIN"
      ? prisma.school.findMany({ orderBy: { name: 'asc' } })
      : (session.user.schoolId
          ? prisma.school.findMany({ where: { id: session.user.schoolId }, orderBy: { name: 'asc' } })
          : []),
    prisma.class.findMany({
      where: whereClause,
      include: { school: true },
      orderBy: { name: 'asc' }
    })
  ])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Create Fee Structure</h2>
        <p className="text-gray-800 mt-1 font-medium">Define fees for a class term</p>
      </div>

      <FeeStructureForm 
        schools={schools as any}
        classes={classes as any}
        userRole={session.user.role}
        userSchoolId={session.user.schoolId || ""}
      />
    </div>
  )
}
