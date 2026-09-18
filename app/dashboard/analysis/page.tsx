import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

export default async function AnalysisPage() {
  const session = await auth()
  
  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "SCHOOL_ADMIN")) {
    redirect("/dashboard")
  }

  const students = await prisma.student.findMany({
    where: session.user.role === "SCHOOL_ADMIN" && session.user.schoolId
      ? { schoolId: session.user.schoolId }
      : undefined,
    include: {
      class: true,
      school: true,
      _count: {
        select: {
          assessments: true,
          performances: true
        }
      }
    },
    orderBy: {
      name: 'asc'
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">AI Performance Analysis</h2>
        <p className="text-gray-600 mt-1">Generate AI-powered insights and recommendations for students</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">🤖</div>
          <div>
            <h3 className="font-semibold text-blue-900">How it works</h3>
            <p className="text-sm text-blue-800 mt-1">
              Our AI analyzes each student's assessment scores, identifies strengths and weaknesses, 
              detects performance trends, and generates personalized recommendations for improvement.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Class
              </th>
              {session.user.role === "SUPER_ADMIN" && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  School
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assessments
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Analyses
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {students.map((student) => (
              <tr key={student.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">{student.name}</div>
                  <div className="text-sm text-gray-500">Adm: {student.admissionNo}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {student.class.name}
                </td>
                {session.user.role === "SUPER_ADMIN" && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {student.school.name}
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {student._count.assessments}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {student._count.performances}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-3">
                  {student._count.assessments > 0 ? (
                    <>
                      <Link
                        href={`/dashboard/analysis/${student.id}/generate`}
                        className="text-orange-600 hover:text-orange-800 font-medium"
                      >
                        🤖 Generate Analysis
                      </Link>
                      {student._count.performances > 0 && (
                        <Link
                          href={`/dashboard/analysis/${student.id}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          View Reports
                        </Link>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-400 text-sm">No assessments yet</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {students.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No students yet. Add students first!</p>
          </div>
        )}
      </div>
    </div>
  )
}
