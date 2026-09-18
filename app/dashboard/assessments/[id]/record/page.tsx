import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import RecordScoresFormOffline from "./RecordScoresFormOffline"

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
    </div>
  )
}
