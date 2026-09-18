import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

export default async function UsersPage() {
  const session = await auth()
  
  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "SCHOOL_ADMIN")) {
    redirect("/dashboard")
  }

  const users = await prisma.user.findMany({
    where: {
      role: { in: ["TEACHER", "PARENT"] },
      schoolId: session.user.role === "SCHOOL_ADMIN" 
        ? session.user.schoolId 
        : undefined
    },
    include: {
      school: true,
      teacherClasses: {
        include: {
          class: true
        }
      },
      children: {
        include: {
          student: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  const teachers = users.filter(u => u.role === "TEACHER")
  const parents = users.filter(u => u.role === "PARENT")

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Users Management</h2>
          <p className="text-gray-600 mt-1">Manage teachers and parents</p>
        </div>
        <Link
          href="/dashboard/users/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
        >
          + Add User
        </Link>
      </div>

      {/* Teachers Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-xl font-semibold text-gray-900">
            Teachers ({teachers.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                {session.user.role === "SUPER_ADMIN" && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">School</th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Classes</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {teachers.map((teacher) => (
                <tr key={teacher.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{teacher.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {teacher.email}
                  </td>
                  {session.user.role === "SUPER_ADMIN" && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {teacher.school?.name}
                    </td>
                  )}
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {teacher.teacherClasses.length > 0 ? (
                      <div className="space-y-1">
                        {teacher.teacherClasses.map((tc) => (
                          <div key={tc.id}>{tc.class.name}</div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">No classes assigned</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {teachers.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No teachers yet. Add your first teacher!
            </div>
          )}
        </div>
      </div>

      {/* Parents Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-xl font-semibold text-gray-900">
            Parents ({parents.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                {session.user.role === "SUPER_ADMIN" && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">School</th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Children</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {parents.map((parent) => (
                <tr key={parent.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{parent.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {parent.email}
                  </td>
                  {session.user.role === "SUPER_ADMIN" && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {parent.school?.name}
                    </td>
                  )}
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {parent.children.length > 0 ? (
                      <div className="space-y-1">
                        {parent.children.map((ps) => (
                          <div key={ps.id}>{ps.student.name}</div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">No children linked</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {parents.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No parents yet. Add your first parent!
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
