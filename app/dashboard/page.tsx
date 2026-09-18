import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import StatCard from "@/components/ui/StatCard"

export default async function DashboardPage() {
  const session = await auth()

  // Redirect based on role
  if (session?.user.role === "TEACHER") {
    redirect("/dashboard/teacher")
  }
  
  if (session?.user.role === "PARENT") {
    redirect("/dashboard/parent")
  }

  const isSuperAdmin = session?.user.role === "SUPER_ADMIN"
  const isSchoolAdmin = session?.user.role === "SCHOOL_ADMIN"

  // Fetch real statistics
  const whereClause = isSchoolAdmin ? { schoolId: session.user.schoolId } : {}

  const [totalStudents, activeClasses, totalAssessments, totalAnalyses] = await Promise.all([
    prisma.student.count({ where: whereClause }),
    prisma.class.count({ where: whereClause }),
    prisma.assessment.count({ where: whereClause }),
    prisma.performanceAnalysis.count({
      where: isSchoolAdmin ? {
        student: { schoolId: session.user.schoolId }
      } : {}
    })
  ])

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Welcome back, {session?.user.name}! 👋
        </h2>
        <p className="text-gray-800 mt-1 text-sm sm:text-base font-medium">
          Here's what's happening with your students today.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Total Students"
          value={totalStudents}
          icon="👨‍🎓"
          color="green"
          href="/dashboard/students"
        />
        <StatCard
          title="Active Classes"
          value={activeClasses}
          icon="📚"
          color="blue"
        />
        <StatCard
          title="Assessments"
          value={totalAssessments}
          icon="📝"
          color="purple"
          href="/dashboard/assessments"
        />
        <StatCard
          title="AI Analyses"
          value={totalAnalyses}
          icon="🤖"
          color="orange"
          href="/dashboard/analysis"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 sm:p-6 border-b">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Quick Actions</h3>
        </div>
        <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {isSuperAdmin && (
            <Link
              href="/dashboard/schools"
              className="p-4 border-2 border-blue-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
            >
              <div className="text-blue-600 text-2xl mb-2">🏫</div>
              <div className="font-bold text-gray-900 text-sm sm:text-base">Manage Schools</div>
              <div className="text-xs sm:text-sm text-gray-800 font-medium">Add and configure schools</div>
            </Link>
          )}
          
          {(isSuperAdmin || isSchoolAdmin) && (
            <>
              <Link
                href="/dashboard/users"
                className="p-4 border-2 border-indigo-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition"
              >
                <div className="text-indigo-600 text-2xl mb-2">👥</div>
                <div className="font-bold text-gray-900 text-sm sm:text-base">Manage Users</div>
                <div className="text-xs sm:text-sm text-gray-800 font-medium">Add teachers and parents</div>
              </Link>

              <Link
                href="/dashboard/students"
                className="p-4 border-2 border-green-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition"
              >
                <div className="text-green-600 text-2xl mb-2">👨‍🎓</div>
                <div className="font-bold text-gray-900 text-sm sm:text-base">Manage Students</div>
                <div className="text-xs sm:text-sm text-gray-800 font-medium">Add and view students</div>
              </Link>
              
              <Link
                href="/dashboard/assessments"
                className="p-4 border-2 border-purple-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition"
              >
                <div className="text-purple-600 text-2xl mb-2">📝</div>
                <div className="font-bold text-gray-900 text-sm sm:text-base">Record Assessments</div>
                <div className="text-xs sm:text-sm text-gray-800 font-medium">Input student scores</div>
              </Link>
              
              <Link
                href="/dashboard/analysis"
                className="p-4 border-2 border-orange-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition"
              >
                <div className="text-orange-600 text-2xl mb-2">🤖</div>
                <div className="font-bold text-gray-900 text-sm sm:text-base">AI Analysis</div>
                <div className="text-xs sm:text-sm text-gray-800 font-medium">Generate performance insights</div>
              </Link>

              <Link
                href="/dashboard/attendance"
                className="p-4 border-2 border-cyan-200 rounded-lg hover:border-cyan-500 hover:bg-cyan-50 transition"
              >
                <div className="text-cyan-600 text-2xl mb-2">📋</div>
                <div className="font-bold text-gray-900 text-sm sm:text-base">Attendance</div>
                <div className="text-xs sm:text-sm text-gray-800 font-medium">Mark daily attendance</div>
              </Link>

              <Link
                href="/dashboard/fees"
                className="p-4 border-2 border-yellow-200 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition"
              >
                <div className="text-yellow-600 text-2xl mb-2">💰</div>
                <div className="font-bold text-gray-900 text-sm sm:text-base">Fee Management</div>
                <div className="text-xs sm:text-sm text-gray-800 font-medium">Manage fees & payments</div>
              </Link>

              <Link
                href="/dashboard/notifications"
                className="p-4 border-2 border-pink-200 rounded-lg hover:border-pink-500 hover:bg-pink-50 transition"
              >
                <div className="text-pink-600 text-2xl mb-2">📧</div>
                <div className="font-bold text-gray-900 text-sm sm:text-base">Email Notifications</div>
                <div className="text-xs sm:text-sm text-gray-800 font-medium">Send emails to users</div>
              </Link>

              <Link
                href="/dashboard/bulk-upload"
                className="p-4 border-2 border-teal-200 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition"
              >
                <div className="text-teal-600 text-2xl mb-2">📤</div>
                <div className="font-bold text-gray-900 text-sm sm:text-base">Bulk Upload</div>
                <div className="text-xs sm:text-sm text-gray-800 font-medium">Import CSV/Excel data</div>
              </Link>

              <Link
                href="/dashboard/reports"
                className="p-4 border-2 border-red-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition"
              >
                <div className="text-red-600 text-2xl mb-2">📄</div>
                <div className="font-bold text-gray-900 text-sm sm:text-base">Reports & Export</div>
                <div className="text-xs sm:text-sm text-gray-800 font-medium">Generate PDF/Excel reports</div>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 sm:p-6 border-b">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900">System Status</h3>
        </div>
        <div className="p-4 sm:p-6">
          {totalStudents > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-green-900 font-bold text-sm sm:text-base">✓ System Active</span>
                <span className="text-green-700 text-xs sm:text-sm font-semibold">{totalStudents} students enrolled</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-blue-900 font-bold text-sm sm:text-base">📚 Classes Running</span>
                <span className="text-blue-700 text-xs sm:text-sm font-semibold">{activeClasses} active classes</span>
              </div>
            </div>
          ) : (
            <p className="text-gray-800 text-center py-8 text-sm sm:text-base font-medium">
              No students yet. Click "Manage Students" or "Bulk Upload" to get started!
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
