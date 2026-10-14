import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { canEditAssessment } from "@/lib/authorization"
import RecordScoresFormOffline from "./RecordScoresFormOffline"
import EvidenceCaptureForm from "./EvidenceCaptureForm"

export default async function RecordScoresPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const session = await auth()
  
  if (!session) {
    redirect("/login")
  }
  if (session.user.role !== "TEACHER") redirect("/dashboard/assessments")

  const { id } = await params

  const assessment = await prisma.assessment.findUnique({
    where: { id },
    include: {
      class: {
        include: {
          students: {
            orderBy: { name: 'asc' }
          }
        }
      },
      subject: true,
      school: true,
      results: true
    }
  })

  if (!assessment) {
    redirect("/dashboard/assessments")
  }
  const assessmentAccess = await canEditAssessment(session, assessment)
  if (!assessmentAccess.ok) redirect("/dashboard/assessments")

  const curriculumContext = await prisma.curriculumOffering.findFirst({
    where: { schoolId: assessment.schoolId, status: "ACTIVE" },
    select: {
      curriculumVersion: {
        select: {
          nodes: { where: { outcomes: { some: {} } }, orderBy: { sequence: "asc" }, select: { outcomes: { orderBy: { sequence: "asc" }, select: { id: true, code: true, statement: true } }, competencies: { select: { competency: { select: { id: true, code: true, name: true } } } } } },
          rubrics: { orderBy: { name: "asc" }, select: { id: true, code: true, name: true, criteria: { orderBy: { sequence: "asc" }, select: { id: true, code: true, name: true, levels: { orderBy: { sequence: "asc" }, select: { id: true, code: true, label: true, points: true } } } } } },
        },
      },
    },
  })
  const outcomes = curriculumContext?.curriculumVersion.nodes.flatMap((node) => node.outcomes) || []
  const competencies = [...new Map(curriculumContext?.curriculumVersion.nodes.flatMap((node) => node.competencies.map((item) => item.competency)).map((item) => [item.id, item])).values()]
  const rubrics = curriculumContext?.curriculumVersion.rubrics || []

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="border-b border-[#e0e2e8] pb-5">
        <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#68767b]">Assessment entry</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#172c36]">Record scores</h1>
        <p className="mt-1 text-sm text-[#68767b]">
          {assessment.title} <span aria-hidden="true">·</span> {assessment.subject.name} <span aria-hidden="true">·</span> {assessment.class.name}
        </p>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#68767b]">
          <span>Maximum score: <strong className="font-semibold text-[#172c36]">{assessment.maxScore}</strong></span>
          <span>Date: <strong className="font-semibold text-[#172c36]">{new Date(assessment.date).toLocaleDateString()}</strong></span>
        </div>
      </div>

      <RecordScoresFormOffline 
        assessment={assessment}
        students={assessment.class.students}
        existingResults={assessment.results}
      />
      <div className="[&>section]:rounded-xl! [&>section]:border-[#e0e2e8]! [&>section]:bg-white! [&>section]:shadow-sm! [&>section>div:first-child]:border-[#e0e2e8]!">
        <EvidenceCaptureForm assessmentId={assessment.id} students={assessment.class.students} outcomes={outcomes} competencies={competencies} rubrics={rubrics} />
      </div>
    </div>
  )
}
