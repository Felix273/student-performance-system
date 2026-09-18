import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import PerformanceChart from "@/components/analytics/PerformanceChart"
import SubjectPerformanceChart from "@/components/analytics/SubjectPerformanceChart"
import AssessmentTypeChart from "@/components/analytics/AssessmentTypeChart"
import GradeDistributionChart from "@/components/analytics/GradeDistributionChart"

async function getAnalyticsData(studentId: string) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/analytics/${studentId}`, {
    cache: 'no-store'
  })
  
  if (!response.ok) {
    return null
  }
  
  return response.json()
}

export default async function StudentDetailPage({ 
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
        },
        take: 10
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
    redirect("/dashboard/students")
  }

  // Fetch analytics data
  const analytics = await getAnalyticsData(id)

  const latestAnalysis = student.performances[0]

  return (
    <div className="space-y-6">
      {/* Student Header */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold">{student.name}</h2>
            <p className="text-blue-100 mt-2">
              {student.class.name} • {student.school.name}
            </p>
            <p className="text-blue-100 text-sm mt-1">
              Admission No: {student.admissionNo}
            </p>
          </div>
          <Link
            href="/dashboard/students"
            className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition text-sm font-medium"
          >
            ← Back to Students
          </Link>
        </div>
      </div>

      {/* Summary Stats */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Current Average</div>
            <div className="text-3xl font-bold text-blue-600 mt-2">
              {analytics.summary.currentAverage}%
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Highest Score</div>
            <div className="text-3xl font-bold text-green-600 mt-2">
              {analytics.summary.highest}%
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Lowest Score</div>
            <div className="text-3xl font-bold text-orange-600 mt-2">
              {analytics.summary.lowest}%
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Total Assessments</div>
            <div className="text-3xl font-bold text-purple-600 mt-2">
              {analytics.summary.totalAssessments}
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      {analytics && analytics.performanceTrend.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="lg:col-span-2">
            <PerformanceChart 
              data={analytics.performanceTrend} 
              studentName={student.name}
            />
          </div>
          
          {analytics.subjectPerformance.length > 0 && (
            <SubjectPerformanceChart data={analytics.subjectPerformance} />
          )}
          
          {analytics.assessmentTypePerformance.length > 0 && (
            <AssessmentTypeChart data={analytics.assessmentTypePerformance} />
          )}
          
          {analytics.gradeDistribution.length > 0 && (
            <div className="lg:col-span-2">
              <GradeDistributionChart data={analytics.gradeDistribution} />
            </div>
          )}
        </div>
      )}

      {/* Latest AI Analysis */}
      {latestAnalysis && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b bg-gradient-to-r from-orange-50 to-amber-50">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🤖</span>
              <h3 className="text-xl font-semibold text-gray-900">Latest AI Analysis</h3>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm text-blue-600 font-medium">Overall Grade</div>
                <div className="text-2xl font-bold text-blue-900 mt-1">{latestAnalysis.overallGrade}</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-sm text-purple-600 font-medium">Trend</div>
                <div className="text-2xl font-bold text-purple-900 mt-1">{latestAnalysis.trend}</div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">💪 Strengths</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                {JSON.parse(latestAnalysis.strengths).map((strength: string, idx: number) => (
                  <li key={idx}>{strength}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">📈 Areas for Improvement</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                {JSON.parse(latestAnalysis.weaknesses).map((weakness: string, idx: number) => (
                  <li key={idx}>{weakness}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">💡 AI Recommendations</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                {JSON.parse(latestAnalysis.recommendations).map((rec: string, idx: number) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">🤖 AI Insights</h4>
              <p className="text-gray-700 whitespace-pre-line">{latestAnalysis.aiInsights}</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Assessments */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-xl font-semibold text-gray-900">Recent Assessments</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assessment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Percentage</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {student.assessments.map((result) => {
                const percentage = (result.score / result.assessment.maxScore) * 100
                const gradeColor = percentage >= 80 ? 'text-green-600' : percentage >= 60 ? 'text-blue-600' : 'text-orange-600'
                
                return (
                  <tr key={result.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {result.assessment.subject.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {result.assessment.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                        {result.assessment.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.score}/{result.assessment.maxScore}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-bold ${gradeColor}`}>
                        {percentage.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {student.assessments.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No assessment records yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
