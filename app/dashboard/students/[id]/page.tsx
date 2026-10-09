import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import PerformanceChart from "@/components/analytics/PerformanceChart"
import SubjectPerformanceChart from "@/components/analytics/SubjectPerformanceChart"
import AssessmentTypeChart from "@/components/analytics/AssessmentTypeChart"
import GradeDistributionChart from "@/components/analytics/GradeDistributionChart"
import { canAccessStudent } from "@/lib/authorization"

function safeList(value: string): string[] {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map(String) : [String(parsed)]
  } catch {
    return value ? [value] : []
  }
}

async function getAnalyticsData(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      classId: true,
      schoolId: true,
      assessments: {
        include: { assessment: { include: { subject: true } } },
        orderBy: { assessment: { date: "asc" } },
      },
    },
  })
  if (!student) return null

  const results = student.assessments.filter((result) => result.assessment.maxScore > 0)
  const classResults = await prisma.assessmentResult.findMany({
    where: {
      student: { classId: student.classId, schoolId: student.schoolId },
      assessmentId: { in: results.map((result) => result.assessmentId) },
    },
    select: { score: true, assessmentId: true, assessment: { select: { maxScore: true } } },
  })
  const classTotals = new Map<string, number>()
  const classCounts = new Map<string, number>()
  classResults.forEach((result) => {
    classTotals.set(result.assessmentId, (classTotals.get(result.assessmentId) || 0) + (result.score / result.assessment.maxScore) * 100)
    classCounts.set(result.assessmentId, (classCounts.get(result.assessmentId) || 0) + 1)
  })
  const percentages = results.map((result) => (result.score / result.assessment.maxScore) * 100)
  const average = (values: number[]) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 10) / 10 : 0
  const grade = (score: number) => score >= 80 ? "A" : score >= 70 ? "B" : score >= 60 ? "C" : score >= 50 ? "D" : "F"
  const subjects = new Map<string, number[]>()
  const types = new Map<string, number[]>()
  results.forEach((result) => {
    const percentage = (result.score / result.assessment.maxScore) * 100
    subjects.set(result.assessment.subject.name, [...(subjects.get(result.assessment.subject.name) || []), percentage])
    types.set(result.assessment.type, [...(types.get(result.assessment.type) || []), percentage])
  })
  const gradeCounts = new Map<string, number>()
  percentages.forEach((percentage) => gradeCounts.set(grade(percentage), (gradeCounts.get(grade(percentage)) || 0) + 1))
  return {
    summary: { currentAverage: average(percentages), highest: percentages.length ? Math.round(Math.max(...percentages) * 10) / 10 : 0, lowest: percentages.length ? Math.round(Math.min(...percentages) * 10) / 10 : 0, totalAssessments: results.length },
    performanceTrend: results.map((result) => ({ date: result.assessment.date.toISOString().slice(0, 10), score: Math.round((result.score / result.assessment.maxScore) * 1000) / 10, average: Math.round((classTotals.get(result.assessmentId) || 0) / (classCounts.get(result.assessmentId) || 1) * 10) / 10 })),
    subjectPerformance: [...subjects.entries()].map(([subject, values]) => ({ subject, score: average(values), classAverage: average(values) })),
    assessmentTypePerformance: [...types.entries()].map(([type, values]) => ({ type, score: average(values), maxScore: 100 })),
    gradeDistribution: [...gradeCounts.entries()].map(([gradeName, count]) => ({ grade: gradeName, count })),
  }
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

  const access = await canAccessStudent(session, id)
  if (!access.ok || !["SCHOOL_ADMIN", "TEACHER"].includes(access.role)) {
    redirect("/dashboard")
  }

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
    <div className="space-y-10 animate-fade-in">
      {/* Student Header */}
      <div className="rounded-[24px] bg-[#e7edff] p-7 sm:p-9">
        <div className="flex justify-between items-start">
          <div>
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[.2em] text-[#4262ff]">Student profile</p><h2 className="text-4xl font-medium tracking-[-.055em] text-[#1c1c1e] sm:text-5xl">{student.name}</h2>
            <p className="mt-2 text-[#555a6a]">
              {student.class.name} • {student.school.name}
            </p>
            <p className="mt-1 text-sm text-[#6b6f7e]">
              Admission No: {student.admissionNo}
            </p>
          </div>
            <div className="flex flex-wrap gap-3">
              <Link href={`/dashboard/students/${student.id}/competency-progress`} className="miro-pill bg-[#187574] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#12615f]">CBC progress ↗</Link>
              <Link href="/dashboard/students" className="miro-pill bg-[#1c1c1e] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#2c2c34]">← Back to Students</Link>
            </div>
        </div>
      </div>

      {/* Summary Stats */}
      {analytics && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="miro-surface p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[.14em] text-[#8e91a0]">Current average</div>
            <div className="mt-3 font-mono text-3xl font-medium text-[#4262ff]">
              {analytics.summary.currentAverage}%
            </div>
          </div>
          <div className="miro-surface p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[.14em] text-[#8e91a0]">Highest score</div>
            <div className="mt-3 font-mono text-3xl font-medium text-[#187574]">
              {analytics.summary.highest}%
            </div>
          </div>
          <div className="miro-surface p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[.14em] text-[#8e91a0]">Lowest score</div>
            <div className="mt-3 font-mono text-3xl font-medium text-[#746019]">
              {analytics.summary.lowest}%
            </div>
          </div>
          <div className="miro-surface p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[.14em] text-[#8e91a0]">Assessments</div>
            <div className="mt-3 font-mono text-3xl font-medium text-[#6f35c8]">
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
        <div className="miro-surface overflow-hidden">
          <div className="border-b border-[#eef0f3] bg-[#fff4c4] p-6">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-[#746019]">AI</span>
              <h3 className="text-2xl font-medium tracking-tight text-[#1c1c1e]">Latest insight</h3>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-[16px] bg-[#e7edff] p-4">
                <div className="text-sm text-blue-600 font-medium">Overall Grade</div>
                <div className="text-2xl font-bold text-blue-900 mt-1">{latestAnalysis.overallGrade}</div>
              </div>
              <div className="rounded-[16px] bg-[#f2e9ff] p-4">
                <div className="text-sm text-purple-600 font-medium">Trend</div>
                <div className="text-2xl font-bold text-purple-900 mt-1">{latestAnalysis.trend}</div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Strengths</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                {safeList(latestAnalysis.strengths).map((strength: string, idx: number) => (
                  <li key={idx}>{strength}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Areas for improvement</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                {safeList(latestAnalysis.weaknesses).map((weakness: string, idx: number) => (
                  <li key={idx}>{weakness}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Recommendations</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                {safeList(latestAnalysis.recommendations).map((rec: string, idx: number) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-[16px] bg-[#f7f8fa] p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Context</h4>
              <p className="text-gray-700 whitespace-pre-line">{latestAnalysis.aiInsights}</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Assessments */}
      <div className="miro-surface overflow-hidden">
        <div className="border-b border-[#eef0f3] p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#8e91a0]">Records</p><h3 className="mt-2 text-2xl font-medium tracking-tight text-[#1c1c1e]">Recent assessments</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-[#f7f8fa]">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-[.16em] text-[#8e91a0]">Subject</th>
                <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-[.16em] text-[#8e91a0]">Assessment</th>
                <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-[.16em] text-[#8e91a0]">Type</th>
                <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-[.16em] text-[#8e91a0]">Score</th>
                <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-[.16em] text-[#8e91a0]">Percentage</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {student.assessments.map((result) => {
                const percentage = (result.score / result.assessment.maxScore) * 100
                const gradeColor = percentage >= 80 ? 'text-green-600' : percentage >= 60 ? 'text-blue-600' : 'text-orange-600'
                
                return (
                  <tr key={result.id} className="transition hover:bg-[#fafbfc]">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {result.assessment.subject.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {result.assessment.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-[#f2e9ff] text-[#6f35c8]">
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
            <div className="px-6 py-12 text-center text-sm text-[#8e91a0]">
              No assessment records yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
