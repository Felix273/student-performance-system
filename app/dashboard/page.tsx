import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import StatCard from "@/components/ui/StatCard"

export default async function DashboardPage() {
  const session = await auth()

  // Redirect based on role
  if (session?.user?.role === "TEACHER") {
    redirect("/dashboard/teacher")
  }
  
  if (session?.user?.role === "PARENT") {
    redirect("/dashboard/parent")
  }

  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN"
  const isSchoolAdmin = session?.user?.role === "SCHOOL_ADMIN"

  // Fetch real statistics
  const whereClause = isSchoolAdmin && session?.user?.schoolId ? { schoolId: session.user.schoolId } : {}

  const [totalStudents, activeClasses, totalAssessments, totalAnalyses] = await Promise.all([
    prisma.student.count({ where: whereClause }),
    prisma.class.count({ where: whereClause }),
    prisma.assessment.count({ where: whereClause }),
    prisma.performanceAnalysis.count({
      where: isSchoolAdmin && session?.user?.schoolId ? {
        student: { schoolId: session.user.schoolId }
      } : {}
    })
  ])

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 p-8 sm:p-10 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-blue-200 border border-white/10 mb-4 backdrop-blur-md">
            ✨ Overview & System Analytics
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Welcome back, {session?.user?.name || "Administrator"} 👋
          </h2>
          <p className="text-slate-300 mt-2 text-base sm:text-lg font-normal leading-relaxed">
            Here is your live high-level summary of academic analytics, student engagement, and administration tools.
          </p>
        </div>
      </div>

      {/* Quick Key Performance Metrics */}
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

      {/* Main Admin Quick Actions Grid */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Quick Actions & Workflows</h3>
            <p className="text-slate-500 text-sm mt-0.5">Direct shortcuts to essential school administration features</p>
          </div>
        </div>

        <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isSuperAdmin && (
            <Link
              href="/dashboard/schools"
              className="p-5 bg-slate-50/50 hover:bg-blue-50/50 rounded-2xl border border-slate-200/80 hover:border-blue-300 transition-all duration-200 group flex items-start gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">🏫</div>
              <div>
                <div className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition-colors">Manage Schools</div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">Register, inspect, and configure multi-tenant schools</div>
              </div>
            </Link>
          )}
          
          {(isSuperAdmin || isSchoolAdmin) && (
            <>
              <Link
                href="/dashboard/users"
                className="p-5 bg-slate-50/50 hover:bg-indigo-50/50 rounded-2xl border border-slate-200/80 hover:border-indigo-300 transition-all duration-200 group flex items-start gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">👥</div>
                <div>
                  <div className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition-colors">Manage Users</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">Assign roles to teachers, parents, and admins</div>
                </div>
              </Link>

              <Link
                href="/dashboard/students"
                className="p-5 bg-slate-50/50 hover:bg-emerald-50/50 rounded-2xl border border-slate-200/80 hover:border-emerald-300 transition-all duration-200 group flex items-start gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">👨‍🎓</div>
                <div>
                  <div className="font-bold text-slate-900 text-base group-hover:text-emerald-600 transition-colors">Manage Students</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">View student profiles, class rosters, and records</div>
                </div>
              </Link>
              
              <Link
                href="/dashboard/assessments"
                className="p-5 bg-slate-50/50 hover:bg-purple-50/50 rounded-2xl border border-slate-200/80 hover:border-purple-300 transition-all duration-200 group flex items-start gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">📝</div>
                <div>
                  <div className="font-bold text-slate-900 text-base group-hover:text-purple-600 transition-colors">Record Assessments</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">Create exams, quizzes, and input student marks</div>
                </div>
              </Link>
              
              <Link
                href="/dashboard/analysis"
                className="p-5 bg-slate-50/50 hover:bg-amber-50/50 rounded-2xl border border-slate-200/80 hover:border-amber-300 transition-all duration-200 group flex items-start gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">🤖</div>
                <div>
                  <div className="font-bold text-slate-900 text-base group-hover:text-amber-600 transition-colors">AI Analysis</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">Generate Claude-powered performance insights</div>
                </div>
              </Link>

              <Link
                href="/dashboard/attendance"
                className="p-5 bg-slate-50/50 hover:bg-cyan-50/50 rounded-2xl border border-slate-200/80 hover:border-cyan-300 transition-all duration-200 group flex items-start gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-cyan-100 text-cyan-600 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">📋</div>
                <div>
                  <div className="font-bold text-slate-900 text-base group-hover:text-cyan-600 transition-colors">Attendance</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">Track daily student presence and absentees</div>
                </div>
              </Link>

              <Link
                href="/dashboard/fees"
                className="p-5 bg-slate-50/50 hover:bg-yellow-50/50 rounded-2xl border border-slate-200/80 hover:border-yellow-300 transition-all duration-200 group flex items-start gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-yellow-100 text-yellow-600 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">💰</div>
                <div>
                  <div className="font-bold text-slate-900 text-base group-hover:text-yellow-600 transition-colors">Fee Management</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">Configure fee structures and track payments</div>
                </div>
              </Link>

              <Link
                href="/dashboard/notifications"
                className="p-5 bg-slate-50/50 hover:bg-pink-50/50 rounded-2xl border border-slate-200/80 hover:border-pink-300 transition-all duration-200 group flex items-start gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">📧</div>
                <div>
                  <div className="font-bold text-slate-900 text-base group-hover:text-pink-600 transition-colors">Email Notifications</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">Dispatch email communications to parents</div>
                </div>
              </Link>

              <Link
                href="/dashboard/bulk-upload"
                className="p-5 bg-slate-50/50 hover:bg-teal-50/50 rounded-2xl border border-slate-200/80 hover:border-teal-300 transition-all duration-200 group flex items-start gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">📤</div>
                <div>
                  <div className="font-bold text-slate-900 text-base group-hover:text-teal-600 transition-colors">Bulk Upload</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">Batch import CSV/Excel records into the system</div>
                </div>
              </Link>

              <Link
                href="/dashboard/reports"
                className="p-5 bg-slate-50/50 hover:bg-rose-50/50 rounded-2xl border border-slate-200/80 hover:border-rose-300 transition-all duration-200 group flex items-start gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">📄</div>
                <div>
                  <div className="font-bold text-slate-900 text-base group-hover:text-rose-600 transition-colors">Reports & Export</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">Generate formal PDF report cards & data exports</div>
                </div>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Operational System Status Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-slate-100">
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">System Operational Status</h3>
        </div>
        <div className="p-6 sm:p-8">
          {totalStudents > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 bg-emerald-50/80 border border-emerald-100 rounded-2xl">
                <span className="text-emerald-900 font-bold text-sm sm:text-base flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Active Enrollment
                </span>
                <span className="text-emerald-700 text-xs sm:text-sm font-semibold bg-emerald-100 px-3 py-1 rounded-full">
                  {totalStudents} students
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-blue-50/80 border border-blue-100 rounded-2xl">
                <span className="text-blue-900 font-bold text-sm sm:text-base flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Active Classes
                </span>
                <span className="text-blue-700 text-xs sm:text-sm font-semibold bg-blue-100 px-3 py-1 rounded-full">
                  {activeClasses} classes
                </span>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-center py-6 text-sm font-medium">
              No active students recorded yet. Click "Manage Students" or "Bulk Upload" to get started!
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
