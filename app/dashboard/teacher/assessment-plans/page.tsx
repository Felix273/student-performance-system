import { redirect } from "next/navigation"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import AssessmentPlansClient from "./AssessmentPlansClient"

export default async function AssessmentPlansPage() {
  const session = await auth()
  if (!session || !["TEACHER", "SCHOOL_ADMIN"].includes(session.user.role || "")) redirect("/dashboard")
  const schoolId = session.user.schoolId
  const assignmentWhere = session.user.role === "TEACHER"
    ? { class: { teachers: { some: { teacherId: session.user.id } } } }
    : schoolId ? { schoolId } : undefined

  const [assignments, periods, rubrics, gradeScales] = await Promise.all([
    prisma.classCurriculumAssignment.findMany({
      where: assignmentWhere,
      select: {
        id: true,
        classId: true,
        class: { select: { name: true, grade: true } },
        offeringGrade: { select: { displayName: true } },
        academicYearId: true,
        periodId: true,
        academicYear: { select: { id: true, name: true } },
        period: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.academicPeriod.findMany({
      where: schoolId ? { academicYear: { schoolId } } : undefined,
      select: { id: true, name: true, academicYearId: true, academicYear: { select: { name: true } } },
      orderBy: [{ academicYear: { name: "desc" } }, { sequence: "asc" }],
    }),
    prisma.rubric.findMany({
      where: schoolId ? { curriculumVersion: { offerings: { some: { schoolId } } } } : undefined,
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    prisma.gradeScale.findMany({
      where: schoolId ? { curriculumVersion: { offerings: { some: { schoolId } } } } : undefined,
      select: { id: true, name: true, code: true, scaleType: true },
      orderBy: { name: "asc" },
    }),
  ])

  return <AssessmentPlansClient assignments={assignments} periods={periods} rubrics={rubrics} gradeScales={gradeScales} />
}
