import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

export default async function StudentsPage() {
  const session = await auth()
  
  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "SCHOOL_ADMIN")) {
    redirect("/dashboard")
  }

  // Get students based on role
  const students = await prisma.student.findMany({
    where: session.user.role === "SCHOOL_ADMIN" && session.user.schoolId
      ? { schoolId: session.user.schoolId }
      : undefined,
    include: {
      class: true,
      school: true,
      _count: {
        select: {
          assessments: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Students Management</h2>
          <p className="text-gray-600 mt-1">Manage students and their information</p>
        </div>
        <Link
          href="/dashboard/students/new"
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition"
        >
          + Add Student
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="overflow-x-auto" tabIndex={0} aria-label="Students table. Scroll horizontally to view all columns.">
        <table className="min-w-[720px] divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Admission No
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
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
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {students.map((student) => (
              <tr key={student.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{student.admissionNo}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{student.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-600">{student.class?.name}</div>
                </td>
                {session.user.role === "SUPER_ADMIN" && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">{student.school?.name}</div>
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {student._count?.assessments ?? 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-3">
                  <Link
                    href={`/dashboard/students/${student.id}`}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    📊 Analytics
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        
        {students.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No students yet. Add your first student!</p>
          </div>
        )}
      </div>
    </div>
  )
}
