import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import PerformanceChart from "@/components/analytics/PerformanceChart"
import SubjectPerformanceChart from "@/components/analytics/SubjectPerformanceChart"
import AssessmentTypeChart from "@/components/analytics/AssessmentTypeChart"
import GradeDistributionChart from "@/components/analytics/GradeDistributionChart"
import CbcTermReportDownload from "./CbcTermReportDownload"
import ParentReceiptsClient from "./ParentReceiptsClient"

async function getAnalyticsData(studentId: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL
    if (!baseUrl) return null
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/analytics/${studentId}`, { cache: "no-store" })
    if (!response.ok) return null
    return response.json()
  } catch (error) {
    console.error("Parent analytics unavailable:", error)
    return null
  }
}

export default async function ParentStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()

  if (!session || session.user.role !== "PARENT") {
    redirect("/dashboard")
  }

  const { id } = await params

  // Verify parent has access to this student
  const parentStudent = await prisma.parentStudent.findFirst({
    where: {
      parentId: session.user.id,
      studentId: id,
    },
  })

  if (!parentStudent) {
    redirect("/dashboard/parent")
  }

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      class: true,
      school: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          county: true,
          contactPhone: true,
          contactEmail: true,
        },
      },
      assessments: {
        include: {
          assessment: {
            include: {
              subject: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      },
      feePayments: {
        where: { status: "COMPLETED" },
        include: {
          feeStructure: {
            select: { term: true, academicYear: true, totalAmount: true, class: { select: { name: true } } },
          },
        },
        orderBy: { paymentDate: "desc" },
      },
      attendance: {
        orderBy: { date: "desc" },
        take: 30,
      },
      performances: {
        orderBy: { analysisDate: "desc" },
        take: 1,
      },
    },
  })

  if (!student) {
    redirect("/dashboard/parent")
  }

  const currentFeeStructure = await prisma.feeStructure.findFirst({
    where: { classId: student.classId },
    orderBy: { createdAt: "desc" },
  })

  const cbcReportPeriods = await prisma.academicPeriod.findMany({
    where: {
      academicYear: { schoolId: student.schoolId },
      assessmentPlans: {
        some: {
          schoolId: student.schoolId,
          OR: [
            { evidence: { some: { schoolId: student.schoolId, studentId: student.id, status: "PUBLISHED" } } },
            { legacyAssessments: { some: { cbcEvidence: { some: { schoolId: student.schoolId, studentId: student.id, status: "PUBLISHED" } } } } },
          ],
        },
      },
    },
    select: { id: true, name: true, code: true, academicYear: { select: { name: true } } },
    orderBy: [{ academicYear: { name: "desc" } }, { sequence: "asc" }],
  })

  // Calculate attendance statistics
  const totalDays = student.attendance.length
  const presentCount = student.attendance.filter((a) => a.status === "PRESENT").length
  const lateCount = student.attendance.filter((a) => a.status === "LATE").length
  const absentCount = student.attendance.filter((a) => a.status === "ABSENT").length
  const attRate = totalDays > 0 ? Math.round(((presentCount + lateCount) / totalDays) * 100) : 100

  // Fetch analytics data
  const analytics = await getAnalyticsData(id)
  const latestAnalysis = student.performances[0]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Student Banner */}
      <div className="bg-gradient-to-r from-emerald-700 to-teal-800 rounded-2xl shadow-lg p-6 sm:p-7 text-white">
        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-3xl font-bold tracking-tight">{student.name}</h2>
              <span className="rounded-full bg-white/20 px-3 py-0.5 text-xs font-semibold">
                {student.class.name}
              </span>
            </div>
            <p className="text-emerald-100 text-sm mt-1">
              Admission No: <span className="font-mono font-bold">{student.admissionNo}</span> · {student.school.name}
            </p>
          </div>
          <Link
            href="/dashboard/parent"
            className="miro-pill bg-white text-emerald-800 px-4 py-2 hover:bg-emerald-50 transition text-xs font-bold self-start"
          >
            ← Back to All Children
          </Link>
        </div>
      </div>

      {/* Official CBC Term Report Card Download */}
      <CbcTermReportDownload studentId={student.id} periods={cbcReportPeriods} />

      {/* Fee Statement & Interactive Receipts */}
      <div id="fees">
        <ParentReceiptsClient
          school={student.school}
          student={{
            id: student.id,
            name: student.name,
            admissionNo: student.admissionNo,
            class: student.class,
          }}
          currentFeeStructure={currentFeeStructure}
          payments={student.feePayments.map((p) => ({
            id: p.id,
            receiptNumber: p.receiptNumber,
            amountPaid: p.amountPaid,
            paymentDate: p.paymentDate.toISOString(),
            paymentMethod: p.paymentMethod,
            transactionId: p.transactionId,
            paidBy: p.paidBy,
            collectedBy: p.collectedBy,
            remarks: p.remarks,
            feeStructure: {
              term: p.feeStructure?.term || "Term",
              academicYear: p.feeStructure?.academicYear || "Year",
              class: { name: student.class.name },
            },
          }))}
        />
      </div>

      {/* Attendance Record Section */}
      <section id="attendance" className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Attendance History</h3>
            <p className="text-xs text-gray-500">Daily morning roll-call entries for {student.name}.</p>
          </div>
          <span className="miro-pill bg-blue-50 text-blue-800 px-3 py-1 text-xs font-bold self-start sm:self-auto">
            {attRate}% Overall Attendance
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-emerald-50 p-3.5 text-center">
            <span className="text-[10px] uppercase font-bold text-emerald-700">Present</span>
            <p className="text-2xl font-bold font-mono text-emerald-800 mt-1">{presentCount}</p>
          </div>
          <div className="rounded-xl bg-amber-50 p-3.5 text-center">
            <span className="text-[10px] uppercase font-bold text-amber-700">Late</span>
            <p className="text-2xl font-bold font-mono text-amber-800 mt-1">{lateCount}</p>
          </div>
          <div className="rounded-xl bg-red-50 p-3.5 text-center">
            <span className="text-[10px] uppercase font-bold text-red-700">Absent</span>
            <p className="text-2xl font-bold font-mono text-red-800 mt-1">{absentCount}</p>
          </div>
        </div>

        {student.attendance.length > 0 ? (
          <div className="mt-5 border-t border-gray-100 pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
              Recent 30-Day Roll-Call Logs
            </h4>
            <div className="divide-y divide-gray-100 text-xs max-h-48 overflow-y-auto">
              {student.attendance.map((att) => (
                <div key={att.id} className="flex items-center justify-between py-2">
                  <span className="font-medium text-slate-700">
                    {new Date(att.date).toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <div className="flex items-center gap-2">
                    {att.remarks && <span className="text-[11px] text-slate-400 italic">({att.remarks})</span>}
                    <span
                      className={`miro-pill px-2.5 py-0.5 text-[10px] font-bold ${
                        att.status === "PRESENT"
                          ? "bg-emerald-100 text-emerald-800"
                          : att.status === "ABSENT"
                          ? "bg-red-100 text-red-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {att.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-4 text-xs text-gray-500">No attendance entries recorded yet.</p>
        )}
      </section>

      {/* Analytics Summary Stats */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="text-xs font-semibold text-gray-500">Assessment Average</div>
            <div className="text-3xl font-bold text-blue-600 mt-1.5">{analytics.summary.currentAverage}%</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="text-xs font-semibold text-gray-500">Highest Score</div>
            <div className="text-3xl font-bold text-emerald-600 mt-1.5">{analytics.summary.highest}%</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="text-xs font-semibold text-gray-500">Lowest Score</div>
            <div className="text-3xl font-bold text-amber-600 mt-1.5">{analytics.summary.lowest}%</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="text-xs font-semibold text-gray-500">Total Checkpoints</div>
            <div className="text-3xl font-bold text-purple-600 mt-1.5">{analytics.summary.totalAssessments}</div>
          </div>
        </div>
      )}

      {/* Analytics Charts */}
      {analytics && analytics.performanceTrend.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="lg:col-span-2">
            <PerformanceChart
              data={analytics.performanceTrend}
              studentName={student.name}
              showClassAverage={false}
            />
          </div>
          {analytics.subjectPerformance.length > 0 && (
            <SubjectPerformanceChart data={analytics.subjectPerformance} />
          )}
          {analytics.assessmentTypePerformance.length > 0 && (
            <AssessmentTypeChart data={analytics.assessmentTypePerformance} />
          )}
        </div>
      )}
    </div>
  )
}
