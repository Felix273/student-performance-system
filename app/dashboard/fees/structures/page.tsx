import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

export default async function FeeStructuresPage() {
  const session = await auth()
  
  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "SCHOOL_ADMIN")) {
    redirect("/dashboard")
  }

  const whereClause = session.user.role === "SCHOOL_ADMIN" 
    ? { schoolId: session.user.schoolId }
    : {}

  const feeStructures = await prisma.feeStructure.findMany({
    where: whereClause,
    include: {
      class: true,
      school: true,
      _count: {
        select: {
          payments: true
        }
      }
    },
    orderBy: [
      { academicYear: 'desc' },
      { term: 'desc' }
    ]
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Fee Structures</h2>
          <p className="text-gray-800 mt-1 font-medium">Define fee structures for each class</p>
        </div>
        <Link
          href="/dashboard/fees/structures/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition font-bold shadow-lg"
        >
          + Create Fee Structure
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow">
        {feeStructures.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-800 uppercase">Class</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-800 uppercase">Term</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-800 uppercase">Academic Year</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-800 uppercase">Tuition</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-800 uppercase">Other Fees</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-800 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-800 uppercase">Due Date</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-800 uppercase">Payments</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-800 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {feeStructures.map((structure) => (
                  <tr key={structure.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{structure.class.name}</div>
                      {session.user.role === "SUPER_ADMIN" && (
                        <div className="text-sm text-gray-700 font-medium">{structure.school.name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">{structure.term}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{structure.academicYear}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">
                      KES {structure.tuitionFee.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-800 font-medium">
                        Lab: {structure.labFee.toLocaleString()}<br/>
                        Library: {structure.libraryFee.toLocaleString()}<br/>
                        Sports: {structure.sportsFee.toLocaleString()}<br/>
                        Exam: {structure.examFee.toLocaleString()}<br/>
                        Other: {structure.otherFees.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-green-700 text-lg">
                        KES {structure.totalAmount.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-800">
                      {new Date(structure.dueDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-blue-700">
                        {structure._count.payments} payment(s)
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <Link
                          href={`/dashboard/fees/structures/${structure.id}`}
                          className="text-blue-600 hover:text-blue-900 font-bold text-sm"
                        >
                          View
                        </Link>
                        <Link
                          href={`/dashboard/fees/structures/${structure.id}/edit`}
                          className="text-green-600 hover:text-green-900 font-bold text-sm"
                        >
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-gray-700 font-medium mb-4">No fee structures yet</p>
            <Link
              href="/dashboard/fees/structures/new"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition font-bold"
            >
              Create First Fee Structure
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
