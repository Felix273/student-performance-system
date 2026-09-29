import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
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
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Record Scores</h2>
        <p className="text-gray-600 mt-1">
          {assessment.title} - {assessment.subject.name} - {assessment.class.name}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Max Score: {assessment.maxScore} | Date: {new Date(assessment.date).toLocaleDateString()}
        </p>
      </div>

      <RecordScoresFormOffline 
        assessment={assessment}
        students={assessment.class.students}
        existingResults={assessment.results}
      />
      <EvidenceCaptureForm assessmentId={assessment.id} students={assessment.class.students} outcomes={outcomes} competencies={competencies} rubrics={rubrics} />
    </div>
  )
}
