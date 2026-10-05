import { redirect } from "next/navigation"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import CurriculumWorkspace from "./CurriculumWorkspace"

export default async function CurriculumPage() {
  const session = await auth()
  if (!session || !["SCHOOL_ADMIN"].includes(session.user.role || "")) redirect("/dashboard")
  const schoolId = session.user.role === "SCHOOL_ADMIN" ? session.user.schoolId : undefined
  const [curricula, academicYears, offerings, classes, schools] = await Promise.all([
    prisma.curriculum.findMany({ include: { versions: { orderBy: { version: "desc" }, select: { id: true, version: true, status: true } } }, orderBy: { name: "asc" } }),
    prisma.academicYear.findMany({ where: schoolId ? { schoolId } : undefined, orderBy: { name: "desc" }, select: { id: true, name: true, isCurrent: true } }),
    prisma.curriculumOffering.findMany({ where: schoolId ? { schoolId } : undefined, include: { curriculum: { select: { name: true, code: true } }, curriculumVersion: { select: { id: true, version: true } }, academicYear: { select: { name: true } }, grades: { orderBy: { sequence: "asc" }, select: { id: true, gradeCode: true, displayName: true } }, _count: { select: { assignments: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.class.findMany({ where: schoolId ? { schoolId } : undefined, select: { id: true, name: true, grade: true }, orderBy: { name: "asc" } }),
    session.user.role === "SUPER_ADMIN" ? prisma.school.findMany({ select: { id: true, name: true, domain: true }, orderBy: { name: "asc" } }) : [],
  ])
  return <CurriculumWorkspace curricula={curricula} academicYears={academicYears} offerings={offerings} classes={classes} schools={schools} isSuperAdmin={session.user.role === "SUPER_ADMIN"} />
}
