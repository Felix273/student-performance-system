import { redirect } from "next/navigation"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import CurriculumWorkspace from "./CurriculumWorkspace"

export default async function CurriculumPage() {
  const session = await auth()
  if (!session || !["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(session.user.role || "")) redirect("/dashboard")
  const schoolId = session.user.role === "SCHOOL_ADMIN" ? session.user.schoolId : undefined
  const [curricula, academicYears, offerings] = await Promise.all([
    prisma.curriculum.findMany({ include: { versions: { orderBy: { version: "desc" }, select: { id: true, version: true, status: true } } }, orderBy: { name: "asc" } }),
    prisma.academicYear.findMany({ where: schoolId ? { schoolId } : undefined, orderBy: { name: "desc" }, select: { id: true, name: true, isCurrent: true } }),
    prisma.curriculumOffering.findMany({ where: schoolId ? { schoolId } : undefined, include: { curriculum: { select: { name: true, code: true } }, curriculumVersion: { select: { id: true, version: true } }, academicYear: { select: { name: true } }, grades: { orderBy: { sequence: "asc" }, select: { id: true, gradeCode: true, displayName: true } }, _count: { select: { assignments: true } } }, orderBy: { createdAt: "desc" } }),
  ])
  return <CurriculumWorkspace curricula={curricula} academicYears={academicYears} offerings={offerings} />
}
