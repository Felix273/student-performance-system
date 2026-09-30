import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import FeeStructureForm from "./FeeStructureForm"

export default async function NewFeeStructurePage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role !== "SCHOOL_ADMIN" || !session.user.schoolId) redirect("/dashboard")

  const schoolId = session.user.schoolId
  const [schools, classes] = await Promise.all([
    prisma.school.findMany({ where: { id: schoolId }, orderBy: { name: "asc" } }),
    prisma.class.findMany({ where: { schoolId }, include: { school: true }, orderBy: { name: "asc" } }),
  ])

  return <div className="space-y-6">
    <div>
      <h2 className="text-3xl font-bold text-gray-900">Create Fee Structure</h2>
      <p className="text-gray-800 mt-1 font-medium">Define fees for a class term</p>
    </div>
    <FeeStructureForm schools={schools} classes={classes} userRole="SCHOOL_ADMIN" userSchoolId={schoolId} />
  </div>
}
