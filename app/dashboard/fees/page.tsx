import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

export default async function FeesPage() {
  const session = await auth()
  
  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "SCHOOL_ADMIN")) {
    redirect("/dashboard")
  }

  const whereClause = session.user.role === "SCHOOL_ADMIN" 
    ? { schoolId: session.user.schoolId }
    : {}

  const [feeStructures, totalCollected, pendingPayments] = await Promise.all([
    prisma.feeStructure.findMany({
      where: whereClause,
      include: {
        class: true,
        school: true,
        payments: true,
        _count: {
          select: {
            payments: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    }),
    prisma.feePayment.aggregate({
      where: {
        status: 'COMPLETED',
        feeStructure: whereClause
      },
      _sum: {
        amountPaid: true
      }
    }),
    prisma.feePayment.count({
      where: {
        status: 'PENDING',
        feeStructure: whereClause
      }
    })
  ])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Fee Management 💰</h2>
        <p className="text-gray-800 mt-1 font-medium">Manage fee structures and track payments</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-bold text-gray-800">Total Collected</div>
          <div className="text-3xl font-bold text-green-600 mt-2">
            KES {totalCollected._sum.amountPaid?.toLocaleString() || 0}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-bold text-gray-800">Fee Structures</div>
          <div className="text-3xl font-bold text-blue-600 mt-2">{feeStructures.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-bold text-gray-800">Pending Payments</div>
          <div className="text-3xl font-bold text-orange-600 mt-2">{pendingPayments}</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/dashboard/fees/structures"
          className="p-4 bg-white border-2 border-blue-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
        >
          <div className="text-blue-600 text-2xl mb-2">📋</div>
          <div className="font-bold text-gray-900">Fee Structures</div>
          <div className="text-sm text-gray-800 font-medium">Create & manage</div>
        </Link>

        <Link
          href="/dashboard/fees/payments"
          className="p-4 bg-white border-2 border-green-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition"
        >
          <div className="text-green-600 text-2xl mb-2">💵</div>
          <div className="font-bold text-gray-900">Record Payment</div>
          <div className="text-sm text-gray-800 font-medium">Process fees</div>
        </Link>

        <Link
          href="/dashboard/fees/reports"
          className="p-4 bg-white border-2 border-purple-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition"
        >
          <div className="text-purple-600 text-2xl mb-2">📊</div>
          <div className="font-bold text-gray-900">Fee Reports</div>
          <div className="text-sm text-gray-800 font-medium">View analytics</div>
        </Link>

        <Link
          href="/dashboard/fees/defaulters"
          className="p-4 bg-white border-2 border-red-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition"
        >
          <div className="text-red-600 text-2xl mb-2">⚠️</div>
          <div className="font-bold text-gray-900">Defaulters</div>
          <div className="text-sm text-gray-800 font-medium">Outstanding fees</div>
        </Link>
      </div>

      {/* Recent Fee Structures */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="text-xl font-semibold text-gray-900">Recent Fee Structures</h3>
          <Link
            href="/dashboard/fees/structures/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition font-bold text-sm"
          >
            + Create New
          </Link>
        </div>
        
        {feeStructures.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">
                    Class
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">
                    Term / Year
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">
                    Payments
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {feeStructures.map((structure) => {
                  const totalPaid = structure.payments
                    .filter(p => p.status === 'COMPLETED')
                    .reduce((sum, p) => sum + p.amountPaid, 0)
                  
                  return (
                    <tr key={structure.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-gray-900">{structure.class.name}</div>
                        {session.user.role === "SUPER_ADMIN" && (
                          <div className="text-sm text-gray-700 font-medium">{structure.school.name}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{structure.term}</div>
                        <div className="text-sm text-gray-700">{structure.academicYear}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-gray-900">
                          KES {structure.totalAmount.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-800 font-medium">
                          {new Date(structure.dueDate).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="font-bold text-green-700">
                            KES {totalPaid.toLocaleString()}
                          </div>
                          <div className="text-gray-700 font-medium">
                            {structure._count.payments} payment(s)
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link
                          href={`/dashboard/fees/structures/${structure.id}`}
                          className="text-blue-600 hover:text-blue-900 font-bold"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">💰</div>
            <p className="text-gray-700 font-medium mb-4">No fee structures created yet</p>
            <Link
              href="/dashboard/fees/structures/new"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition font-bold"
            >
              Create First Fee Structure
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
