import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import GenerateAnalysisForm from "./GenerateAnalysisForm"

export default async function GenerateAnalysisPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const session = await auth()
  
  if (!session) {
    redirect("/login")
  }

  const { id } = await params

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      class: true,
      school: true,
      assessments: {
        include: {
          assessment: {
            include: {
              subject: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      },
      performances: {
        orderBy: {
          analysisDate: 'desc'
        },
        take: 1
      }
    }
  })

  if (!student) {
    redirect("/dashboard/analysis")
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Generate AI Analysis</h2>
        <p className="text-gray-600 mt-1">
          {student.name} - {student.class.name} - {student.school.name}
        </p>
      </div>

      <GenerateAnalysisForm student={student} />
    </div>
  )
}
