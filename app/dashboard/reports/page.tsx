import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import ReportsClient from "./ReportsClient"

export default async function ReportsPage() {
  const session = await auth()
  if (!session || session.user.role !== "SCHOOL_ADMIN" || !session.user.schoolId) redirect("/dashboard")
  const schoolId = session.user.schoolId
  const [schools, classes, students] = await Promise.all([
    prisma.school.findMany({ where: { id: schoolId }, orderBy: { name: "asc" } }),
    prisma.class.findMany({ where: { schoolId }, include: { school: true }, orderBy: { name: "asc" } }),
    prisma.student.findMany({ where: { schoolId }, include: { class: true, school: true }, orderBy: { name: "asc" } }),
  ])
  return <ReportsClient schools={schools} classes={classes} students={students} userRole="SCHOOL_ADMIN" userSchoolId={schoolId} />
}
