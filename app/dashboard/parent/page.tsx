import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

export const metadata = {
  title: "Parent Portal | Fentech StudentOS",
}

export default async function ParentDashboardPage() {
  const session = await auth()
  
  if (!session || session.user.role !== "PARENT") {
    redirect("/dashboard")
  }

  // Get parent's children with school, class, assessments, and fee payments
  const parentStudents = await prisma.parentStudent.findMany({
    where: { parentId: session.user.id },
    include: {
      student: {
        include: {
          class: true,
          school: true,
          feePayments: {
            where: { status: "COMPLETED" },
            orderBy: { paymentDate: "desc" },
            take: 3,
          },
          assessments: {
            include: {
              assessment: {
                include: { subject: true },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 5,
          },
          performances: {
            orderBy: { analysisDate: "desc" },
            take: 1,
          },
          _count: {
            select: { assessments: true, performances: true },
          },
        },
      },
    },
  })

  // Published CBC evidence counts per student
  const publishedCbcCounts = parentStudents.length
    ? await prisma.assessmentEvidence.groupBy({
        by: ["studentId"],
        where: {
          status: "PUBLISHED",
          OR: parentStudents.map(({ student }) => ({
            studentId: student.id,
            schoolId: student.schoolId,
          })),
        },
        _count: { _all: true },
      })
    : []
  const publishedCbcCountByStudent = new Map(
    publishedCbcCounts.map((item) => [item.studentId, item._count._all])
  )

  // Fetch active fee structures for each student's class
  const classIds = Array.from(new Set(parentStudents.map((ps) => ps.student.classId)))
  const feeStructures = await prisma.feeStructure.findMany({
    where: { classId: { in: classIds } },
    orderBy: { createdAt: "desc" },
  })
  const feeStructureByClass = new Map(feeStructures.map((fs) => [fs.classId, fs]))

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Hero Welcome Banner */}
      <header className="relative overflow-hidden rounded-[28px] bg-[#ffd02f] px-6 py-8 sm:px-10 sm:py-10">
        <div className="relative max-w-3xl">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[.2em] text-[#746019]">
            Parent & Guardian Portal
          </p>
          <h1 className="text-3xl font-medium tracking-tight text-[#1c1c1e] sm:text-5xl">
            Learning, made clear.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#746019]">
            Welcome back, {session.user.name}. Track your children&apos;s CBC competency progress, official term reports, and fee statements in real time.
          </p>
        </div>
      </header>

      {parentStudents.length === 0 && (
        <div className="miro-surface border-dashed bg-[#fffdf5] p-8 sm:p-12 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#8e91a0]">Parent Account</p>
          <h2 className="mt-2 text-2xl font-medium text-[#1c1c1e]">No learners linked yet</h2>
          <p className="mt-2 text-sm text-[#6b6f7e]">
            Contact your school administrator to link your child&apos;s admission number to your parent account.
          </p>
        </div>
      )}

      {/* Children Overview Cards */}
      <div className="space-y-8">
        {parentStudents.map((ps) => {
          const student = ps.student
          const publishedCbcCount = publishedCbcCountByStudent.get(student.id) || 0
          const feeStructure = feeStructureByClass.get(student.classId)
          const totalPaid = student.feePayments.reduce((sum, p) => sum + p.amountPaid, 0)
          const totalBilled = feeStructure?.totalAmount || 0
          const feeBalance = Math.max(0, totalBilled - totalPaid)
          const isFeeCleared = totalBilled > 0 && feeBalance === 0

          return (
            <section key={ps.id} className="miro-surface overflow-hidden">
              {/* Child Header */}
              <header className="flex flex-col gap-4 border-b border-[#eef0f3] p-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#ffd02f] text-lg font-bold text-[#1c1c1e] shadow-sm">
                    {student.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-2xl font-bold tracking-tight text-[#1c1c1e]">
                      {student.name}
                    </h2>
                    <p className="mt-0.5 text-xs text-[#6b6f7e]">
                      {student.class.name} · {student.school.name} ·{" "}
                      <span className="font-mono text-[11px] text-[#8e91a0]">
                        Adm: {student.admissionNo}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/dashboard/parent/student/${student.id}`}
                    className="miro-pill inline-flex items-center justify-center bg-[#1c1c1e] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#2c2c34]"
                  >
                    Learner Profile & Transcripts ↗
                  </Link>
                </div>
              </header>

              {/* 3 Core Overview Cards: CBC Progress, Fee Status, Performance */}
              <div className="grid gap-3 p-5 sm:grid-cols-3 sm:p-7 border-b border-[#eef0f3] bg-[#fafbfc]">
                {/* 1. CBC Competency Evidence */}
                <div className="rounded-[20px] bg-[#c3faf5] p-5 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[.16em] text-[#187574]">
                      CBC Competencies
                    </span>
                    <p className="mt-3 font-mono text-3xl font-bold text-[#187574]">
                      {publishedCbcCount}
                    </p>
                    <p className="mt-1 text-xs text-[#2c6e6d]">
                      {publishedCbcCount === 1 ? "official learning update" : "official learning updates"}
                    </p>
                  </div>
                  <Link
                    href="/dashboard/parent/learning-updates"
                    className="mt-4 text-xs font-bold text-[#187574] hover:underline"
                  >
                    View CBC Updates →
                  </Link>
                </div>

                {/* 2. Fee Balance & Financial Status */}
                <div
                  className={`rounded-[20px] p-5 flex flex-col justify-between ${
                    isFeeCleared ? "bg-[#e5f7f3]" : feeBalance > 0 ? "bg-[#fff2f2]" : "bg-[#f5f6f8]"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-[.16em] text-[#6b6f7e]">
                        Fee Statement
                      </span>
                      {isFeeCleared ? (
                        <span className="miro-pill bg-[#187574] px-2 py-0.5 text-[10px] font-bold text-white">
                          Cleared ✓
                        </span>
                      ) : feeBalance > 0 ? (
                        <span className="miro-pill bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
                          Balance Due
                        </span>
                      ) : (
                        <span className="miro-pill bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          Not Invoiced
                        </span>
                      )}
                    </div>
                    <p className="mt-3 font-mono text-2xl font-bold text-[#1c1c1e]">
                      {feeBalance > 0
                        ? `KES ${feeBalance.toLocaleString()}`
                        : totalBilled > 0
                        ? "KES 0.00"
                        : "No Fees Due"}
                    </p>
                    <p className="mt-1 text-xs text-[#6b6f7e]">
                      Paid KES {totalPaid.toLocaleString()} of KES {totalBilled.toLocaleString()}
                    </p>
                  </div>
                  {student.feePayments.length > 0 ? (
                    <p className="mt-3 text-[11px] text-[#8e91a0] truncate">
                      Last: {student.feePayments[0].receiptNumber} (KES {student.feePayments[0].amountPaid.toLocaleString()})
                    </p>
                  ) : (
                    <span className="mt-3 text-[11px] text-[#8e91a0]">No payments recorded yet</span>
                  )}
                </div>

                {/* 3. Official Report Card Access */}
                <div className="rounded-[20px] bg-[#e7edff] p-5 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[.16em] text-[#4262ff]">
                      Official Term Report
                    </span>
                    <p className="mt-2 text-base font-bold text-[#1c1c1e]">
                      CBC Term Report Card
                    </p>
                    <p className="mt-1 text-xs text-[#5263a6]">
                      Includes school seal, mastery bands, and principal remarks.
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/parent/student/${student.id}`}
                    className="mt-4 miro-pill inline-block w-fit bg-[#1c1c1e] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2c2c34]"
                  >
                    Download PDF 📥
                  </Link>
                </div>
              </div>

              {/* Recent Payment Receipts */}
              {student.feePayments.length > 0 && (
                <div className="border-b border-[#eef0f3] p-5 sm:px-7">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#8e91a0]">
                      Recent Payment Receipts
                    </h3>
                    <span className="text-xs text-[#6b6f7e]">Verified by School Accounts</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {student.feePayments.map((p) => (
                      <div
                        key={p.id}
                        className="rounded-xl border border-[#e0e2e8] bg-white p-3 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-[#1c1c1e]">{p.receiptNumber}</span>
                          <span className="miro-pill bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                            {p.paymentMethod}
                          </span>
                        </div>
                        <p className="font-bold text-[#187574]">KES {p.amountPaid.toLocaleString()}</p>
                        <p className="text-[10px] text-[#8e91a0]">
                          {new Date(p.paymentDate).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Assessment Scores Section */}
              {student.assessments.length > 0 && (
                <div className="p-5 sm:px-7">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#8e91a0]">
                      Recent Learning Checkpoints
                    </h3>
                    <Link
                      href={`/dashboard/parent/student/${student.id}`}
                      className="text-xs font-bold text-[#4262ff] hover:underline"
                    >
                      View All Assessment History →
                    </Link>
                  </div>
                  <div className="divide-y divide-[#eef0f3]">
                    {student.assessments.map((result) => (
                      <div
                        key={result.id}
                        className="flex items-center justify-between py-2.5 text-xs"
                      >
                        <div>
                          <p className="font-bold text-[#1c1c1e]">{result.assessment.subject.name}</p>
                          <p className="text-[#8e91a0]">{result.assessment.title}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-[#1c1c1e]">
                            {result.score} / {result.assessment.maxScore}
                          </span>
                          <span className="ml-2 miro-pill bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            {((result.score / result.assessment.maxScore) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
