import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

export default async function TeacherDashboardPage() {
  const session = await auth()
  
  if (!session || session.user.role !== "TEACHER") {
    redirect("/dashboard")
  }

  // Get teacher's assigned classes
  const teacherClasses = await prisma.teacherClass.findMany({
    where: { teacherId: session.user.id },
    include: {
      class: {
        include: {
          _count: {
            select: {
              students: true,
              assessments: true
            }
          }
        }
      },
      subject: true
    }
  })

  // Get recent assessments for teacher's classes
  const classIds = teacherClasses.map(tc => tc.classId)
  const recentAssessments = await prisma.assessment.findMany({
    where: {
      classId: { in: classIds }
    },
    include: {
      class: true,
      subject: true,
      _count: {
        select: {
          results: true
        }
      }
    },
    orderBy: {
      date: 'desc'
    },
    take: 5
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Teacher Dashboard</h2>
        <p className="text-gray-600 mt-1">Welcome back, {session.user.name}!</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">My Classes</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">{teacherClasses.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">Total Students</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">
            {teacherClasses.reduce((sum, tc) => sum + tc.class._count.students, 0)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">Assessments</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">
            {teacherClasses.reduce((sum, tc) => sum + tc.class._count.assessments, 0)}
          </div>
        </div>
      </div>

      {/* My Classes */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-xl font-semibold text-gray-900">My Classes</h3>
        </div>
        <div className="p-6">
          {teacherClasses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teacherClasses.map((tc) => (
                <Link
                  key={tc.id}
                  href={`/dashboard/teacher/classes/${tc.classId}`}
                  className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-gray-900">{tc.class.name}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {tc.subject ? tc.subject.name : "All Subjects"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">{tc.class._count.students}</div>
                      <div className="text-xs text-gray-500">Students</div>
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-gray-500">
                    {tc.class._count.assessments} assessments
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No classes assigned yet. Contact your school admin.
            </div>
          )}
        </div>
      </div>

      {/* Recent Assessments */}
      {recentAssessments.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-xl font-semibold text-gray-900">Recent Assessments</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assessment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Results</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentAssessments.map((assessment) => (
                  <tr key={assessment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {assessment.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {assessment.class.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {assessment.subject.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(assessment.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {assessment._count.results} recorded
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        href={`/dashboard/assessments/${assessment.id}/record`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Record Scores
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-xl font-semibold text-gray-900">Quick Actions</h3>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/dashboard/assessments/new"
            className="p-4 border-2 border-purple-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition"
          >
            <div className="text-purple-600 text-2xl mb-2">📝</div>
            <div className="font-semibold text-gray-900">Create Assessment</div>
            <div className="text-sm text-gray-600">Add new test or assignment</div>
          </Link>
          
          <Link
            href="/dashboard/assessments"
            className="p-4 border-2 border-blue-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
          >
            <div className="text-blue-600 text-2xl mb-2">📊</div>
            <div className="font-semibold text-gray-900">View Assessments</div>
            <div className="text-sm text-gray-600">See all assessments</div>
          </Link>
          
          <Link
            href="/dashboard/students"
            className="p-4 border-2 border-green-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition"
          >
            <div className="text-green-600 text-2xl mb-2">👨‍🎓</div>
            <div className="font-semibold text-gray-900">My Students</div>
            <div className="text-sm text-gray-600">View student list</div>
          </Link>
        </div>
      </div>
    </div>
  )
}
