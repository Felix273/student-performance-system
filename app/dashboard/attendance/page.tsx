import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

export default async function AttendancePage() {
  const session = await auth()
  
  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "SCHOOL_ADMIN" && session.user.role !== "TEACHER")) {
    redirect("/dashboard")
  }

  // Fetch classes based on role
  const classes = await prisma.class.findMany({
    where: session.user.role === "SCHOOL_ADMIN" && session.user.schoolId
      ? { schoolId: session.user.schoolId }
      : session.user.role === "TEACHER"
        ? {
            teachers: {
              some: {
                teacherId: session.user.id
              }
            }
          }
        : undefined,
    include: {
      school: true,
      _count: {
        select: {
          students: true
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
        <h2 className="text-3xl font-bold text-gray-900">Attendance Management</h2>
        <p className="text-gray-600 mt-1">Track and manage student attendance</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">Total Classes</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">{classes.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">Total Students</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">
            {classes.reduce((sum, c) => sum + c._count.students, 0)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">Today's Date</div>
          <div className="text-xl font-bold text-gray-900 mt-2">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'short', 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            })}
          </div>
        </div>
      </div>

      {/* Classes List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-xl font-semibold text-gray-900">Select Class to Mark Attendance</h3>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((cls) => (
            <Link
              key={cls.id}
              href={`/dashboard/attendance/${cls.id}`}
              className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition group"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900 text-lg group-hover:text-blue-600 transition">
                    {cls.name}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">Grade {cls.grade}</p>
                </div>
                <div className="text-3xl">📋</div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <span className="text-sm text-gray-600">Students</span>
                <span className="text-xl font-bold text-gray-900">{cls._count.students}</span>
              </div>
              {session.user.role === "SUPER_ADMIN" && (
                <div className="mt-2 text-xs text-gray-500">{cls.school.name}</div>
              )}
            </Link>
          ))}
        </div>

        {classes.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            <div className="text-6xl mb-4">📚</div>
            <p>No classes available. Add classes first to track attendance.</p>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">📝 How to Mark Attendance</h3>
        <ol className="space-y-2 text-sm text-blue-800 list-decimal list-inside">
          <li>Select a class from the list above</li>
          <li>Choose the date (defaults to today)</li>
          <li>Mark each student as Present, Absent, Late, or Excused</li>
          <li>Add remarks if needed (optional)</li>
          <li>Save attendance - it will be recorded instantly</li>
        </ol>
      </div>
    </div>
  )
}
