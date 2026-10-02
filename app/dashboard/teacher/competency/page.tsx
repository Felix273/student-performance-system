import { redirect } from "next/navigation"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import TeacherCompetencyClient from "./TeacherCompetencyClient"

export default async function TeacherCompetencyPage() {
  const session = await auth()
  if (!session || !["TEACHER", "SCHOOL_ADMIN", "SUPER_ADMIN"].includes(session.user.role || "")) redirect("/dashboard")
  const classes = session.user.role === "TEACHER" ? await prisma.class.findMany({ where: { teachers: { some: { teacherId: session.user.id } } }, select: { id: true }, orderBy: { name: "asc" } }) : await prisma.class.findMany({ where: session.user.schoolId ? { schoolId: session.user.schoolId } : undefined, select: { id: true }, orderBy: { name: "asc" } })
  return <TeacherCompetencyClient initialClassId={classes[0]?.id || ""} />
}
