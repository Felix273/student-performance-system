import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import ReportCardsClient from "./ReportCardsClient"

export default async function ReportCardsPage() {
  const session = await auth()
  if (!session || session.user.role !== "SCHOOL_ADMIN" || !session.user.schoolId) redirect("/dashboard")
  const schoolId = session.user.schoolId
  const schoolWhere = { schoolId }
  const academicYearWhere = { academicYear: { schoolId } }
  const [schools, periods, students, templates, versions, reportCards] = await Promise.all([
    prisma.school.findMany({ where: { id: schoolId }, select: { id: true, name: true } }),
    prisma.academicPeriod.findMany({ where: academicYearWhere, include: { academicYear: { select: { id: true, schoolId: true, school: { select: { name: true } } } } }, orderBy: [{ academicYear: { startsOn: "desc" } }, { sequence: "asc" }] }),
    prisma.student.findMany({ where: schoolWhere, select: { id: true, name: true, admissionNo: true, schoolId: true, class: { select: { name: true, grade: true } } }, orderBy: [{ class: { name: "asc" } }, { name: "asc" }], take: 1000 }),
    prisma.reportTemplate.findMany({ where: schoolWhere, include: { sections: { orderBy: { sequence: "asc" } } }, orderBy: [{ isDefault: "desc" }, { name: "asc" }] }),
    prisma.curriculumOffering.findMany({ where: { ...schoolWhere, status: { in: ["ACTIVE", "ARCHIVED"] }, curriculumVersion: { status: { in: ["PUBLISHED", "RETIRED"] } } }, select: { schoolId: true, school: { select: { name: true } }, curriculumVersionId: true, curriculumVersion: { select: { version: true, curriculum: { select: { name: true, code: true } } } } }, distinct: ["schoolId", "curriculumVersionId"], take: 300 }),
    prisma.reportCard.findMany({ where: schoolWhere, include: { student: { select: { id: true, name: true, admissionNo: true, schoolId: true, class: { select: { name: true } } } }, academicPeriod: { select: { id: true, name: true, code: true } }, template: { select: { id: true, name: true, code: true } }, comments: { select: { id: true, sectionCode: true, audience: true, body: true, createdAt: true, author: { select: { name: true } } }, orderBy: { createdAt: "asc" } }, _count: { select: { entries: true, comments: true, publications: true } } }, orderBy: [{ updatedAt: "desc" }], take: 100 }),
  ])

  return <ReportCardsClient
    role="SCHOOL_ADMIN"
    initialSchoolId={schoolId}
    schools={schools}
    periods={periods.map((period) => ({ id: period.id, name: period.name, code: period.code, academicYearId: period.academicYear.id, schoolId: period.academicYear.schoolId, schoolName: period.academicYear.school.name }))}
    students={students.map((student) => ({ id: student.id, name: student.name, admissionNo: student.admissionNo, schoolId: student.schoolId, className: student.class.name, grade: student.class.grade }))}
    versions={versions.map((offering) => ({ id: offering.curriculumVersionId, schoolId: offering.schoolId, schoolName: offering.school.name, curriculumName: offering.curriculumVersion.curriculum.name, curriculumCode: offering.curriculumVersion.curriculum.code, version: offering.curriculumVersion.version }))}
    templates={templates.map((template) => ({ id: template.id, schoolId: template.schoolId, curriculumVersionId: template.curriculumVersionId, name: template.name, code: template.code, description: template.description, isDefault: template.isDefault, sections: template.sections.map((section) => ({ code: section.code, title: section.title, sectionType: section.sectionType, sequence: section.sequence, isEnabled: section.isEnabled, isRequired: section.isRequired, ...(section.description ? { description: section.description } : {}) })) }))}
    reportCards={reportCards.map((card) => {
      const snapshot = card.snapshot as unknown as { template?: { sections?: FrozenSectionSnapshot[] } }
      return { id: card.id, schoolId: card.schoolId, status: card.status, version: card.version, generatedAt: card.createdAt.toISOString(), publishedAt: card.publishedAt?.toISOString() ?? null, student: card.student, period: card.academicPeriod, template: card.template, counts: card._count, sections: Array.isArray(snapshot?.template?.sections) ? snapshot.template.sections : [], comments: card.comments.map((comment) => ({ ...comment, createdAt: comment.createdAt.toISOString() })) }
    })}
  />
}

type FrozenSectionSnapshot = { code: string; title: string; sequence: number; isEnabled: boolean }
