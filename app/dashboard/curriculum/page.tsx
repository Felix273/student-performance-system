import { redirect } from "next/navigation"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import CurriculumWorkspace from "./CurriculumWorkspace"
import PlatformCurriculumCatalog from "./PlatformCurriculumCatalog"

export default async function CurriculumPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role === "SUPER_ADMIN") {
    const curricula = await prisma.curriculum.findMany({
      include: { versions: { orderBy: { version: "desc" }, select: { id: true, version: true, status: true } } },
      orderBy: { name: "asc" },
    })
    return <PlatformCurriculumCatalog curricula={curricula} />
  }
  if (session.user.role !== "SCHOOL_ADMIN" || !session.user.schoolId) redirect("/dashboard")
  const schoolId = session.user.schoolId
  const [curricula, academicYears, offerings, classes] = await Promise.all([
    prisma.curriculum.findMany({ include: { versions: { orderBy: { version: "desc" }, select: { id: true, version: true, status: true } } }, orderBy: { name: "asc" } }),
    prisma.academicYear.findMany({ where: { schoolId }, orderBy: { name: "desc" }, select: { id: true, name: true, isCurrent: true } }),
    prisma.curriculumOffering.findMany({ where: { schoolId }, include: { curriculum: { select: { name: true, code: true } }, curriculumVersion: { select: { id: true, version: true } }, academicYear: { select: { name: true } }, grades: { orderBy: { sequence: "asc" }, select: { id: true, gradeCode: true, displayName: true } }, _count: { select: { assignments: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.class.findMany({ where: { schoolId }, select: { id: true, name: true, grade: true }, orderBy: { name: "asc" } }),
  ])
  return <CurriculumWorkspace curricula={curricula} academicYears={academicYears} offerings={offerings} classes={classes} />
}
