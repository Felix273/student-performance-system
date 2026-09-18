import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

export default async function ParentDashboardPage() {
  const session = await auth()
  
  if (!session || session.user.role !== "PARENT") {
    redirect("/dashboard")
  }

  // Get parent's children
  const parentStudents = await prisma.parentStudent.findMany({
    where: { parentId: session.user.id },
    include: {
      student: {
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
            },
            take: 5
          },
          performances: {
            orderBy: {
              analysisDate: 'desc'
            },
            take: 1
          },
          _count: {
            select: {
              assessments: true,
              performances: true
            }
          }
        }
      }
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Parent Dashboard</h2>
        <p className="text-gray-600 mt-1">Welcome back, {session.user.name}!</p>
      </div>

      {parentStudents.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <div className="text-2xl">ℹ️</div>
            <div>
              <h3 className="font-semibold text-yellow-900">No Children Linked</h3>
              <p className="text-sm text-yellow-800 mt-1">
                Please contact your school administrator to link your children to your account.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Children Overview */}
      {parentStudents.map((ps) => {
        const student = ps.student
        const latestAnalysis = student.performances[0]
        
        // Calculate average from recent assessments
        const recentScores = student.assessments.slice(0, 5)
        const average = recentScores.length > 0
          ? (recentScores.reduce((sum, a) => sum + (a.score / a.assessment.maxScore * 100), 0) / recentScores.length).toFixed(1)
          : "N/A"

        return (
          <div key={ps.id} className="bg-white rounded-lg shadow">
            {/* Student Header */}
            <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{student.name}</h3>
                  <p className="text-gray-600 mt-1">
                    {student.class.name} • {student.school.name}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Admission No: {student.admissionNo}
                  </p>
                </div>
                <Link
                  href={`/dashboard/parent/student/${student.id}`}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition text-sm"
                >
                  View Details
                </Link>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="p-6 border-b">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm text-blue-600 font-medium">Current Average</div>
                  <div className="text-2xl font-bold text-blue-900 mt-1">{average}%</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-sm text-green-600 font-medium">Assessments</div>
                  <div className="text-2xl font-bold text-green-900 mt-1">{student._count.assessments}</div>
                </div>
                {latestAnalysis && (
                  <>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="text-sm text-purple-600 font-medium">Overall Grade</div>
                      <div className="text-2xl font-bold text-purple-900 mt-1">{latestAnalysis.overallGrade}</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4">
                      <div className="text-sm text-orange-600 font-medium">Trend</div>
                      <div className="text-2xl font-bold text-orange-900 mt-1">{latestAnalysis.trend}</div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Latest AI Analysis */}
            {latestAnalysis && (
              <div className="p-6 border-b bg-gray-50">
                <h4 className="font-semibold text-gray-900 mb-3">Latest AI Analysis</h4>
                <p className="text-gray-700 text-sm mb-3">{latestAnalysis.aiInsights}</p>
                <Link
                  href={`/dashboard/parent/student/${student.id}#analysis`}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View Full Analysis →
                </Link>
              </div>
            )}

            {/* Recent Assessments */}
            {student.assessments.length > 0 && (
              <div className="p-6">
                <h4 className="font-semibold text-gray-900 mb-3">Recent Assessments</h4>
                <div className="space-y-2">
                  {student.assessments.map((result) => (
                    <div key={result.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{result.assessment.subject.name}</div>
                        <div className="text-sm text-gray-600">{result.assessment.title}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900">
                          {result.score}/{result.assessment.maxScore}
                        </div>
                        <div className="text-sm text-gray-600">
                          {((result.score / result.assessment.maxScore) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {student.assessments.length === 0 && (
              <div className="p-6">
                <p className="text-center text-gray-500">No assessment records yet.</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
