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

  // Get today's normalized date for attendance lookup
  const todayString = new Date().toISOString().split("T")[0]
  const todayDate = new Date(`${todayString}T00:00:00.000Z`)

  // Get parent's linked children with fees, attendance, and CBC evidence
  const parentStudents = await prisma.parentStudent.findMany({
    where: { parentId: session.user.id },
    include: {
      student: {
        include: {
          class: true,
          school: { select: { id: true, name: true, logoUrl: true, county: true } },
          feePayments: {
            where: { status: "COMPLETED" },
            select: { amountPaid: true, paymentDate: true },
          },
          attendance: {
            where: { date: todayDate },
            select: { status: true },
            take: 1,
          },
          _count: {
            select: {
              assessments: true,
              cbcEvidence: { where: { status: "PUBLISHED" } },
              attendance: true,
            },
          },
        },
      },
    },
  })

  // Fetch active fee structures and full attendance counts for each student
  const studentIds = parentStudents.map((ps) => ps.student.id)
  const classIds = parentStudents.map((ps) => ps.student.classId)

  const [feeStructures, attendanceStats] = await Promise.all([
    prisma.feeStructure.findMany({
      where: { classId: { in: classIds } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.attendance.groupBy({
      by: ["studentId", "status"],
      where: { studentId: { in: studentIds } },
      _count: { _all: true },
    }),
  ])

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Hero Welcome Header */}
      <header className="relative overflow-hidden rounded-[28px] bg-[#ffd02f] px-6 py-8 sm:px-10 sm:py-10">
        <div className="relative max-w-3xl">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[.2em] text-[#746019]">
            Parent Workspace & Portal
          </p>
          <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-[#1c1c1e]">
            Welcome back, {session.user.name?.split(" ")[0]}.
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#746019]">
            Stay connected with your child&apos;s CBC learning updates, term attendance, fee statements, and official report cards.
          </p>
        </div>
      </header>

      {parentStudents.length === 0 && (
        <div className="miro-surface border-dashed bg-[#fffdf5] p-8 sm:p-12 text-center">
          <span className="text-3xl">👨‍👩‍👧</span>
          <h2 className="mt-3 text-xl font-bold text-[#1c1c1e]">No learners linked yet</h2>
          <p className="mt-1 text-xs text-[#6b6f7e]">
            Please contact your school administrator to link your parent account to your child&apos;s record.
          </p>
        </div>
      )}

      {/* Children Overview Cards */}
      <div className="space-y-6">
        {parentStudents.map((ps) => {
          const student = ps.student
          const structure = feeStructures.find((f) => f.classId === student.classId)
          const totalPaid = student.feePayments.reduce((s, p) => s + p.amountPaid, 0)
          const totalInvoiced = structure?.totalAmount || 0
          const feeBalance = Math.max(0, totalInvoiced - totalPaid)
          const isFeeCleared = structure && feeBalance === 0

          // Calculate student's overall attendance rate
          const studentAttRecords = attendanceStats.filter((a) => a.studentId === student.id)
          const presentCount = studentAttRecords.find((a) => a.status === "PRESENT")?._count._all || 0
          const lateCount = studentAttRecords.find((a) => a.status === "LATE")?._count._all || 0
          const absentCount = studentAttRecords.find((a) => a.status === "ABSENT")?._count._all || 0
          const totalDays = presentCount + lateCount + absentCount
          const attRate = totalDays > 0 ? Math.round(((presentCount + lateCount) / totalDays) * 100) : 100

          const todayAtt = student.attendance[0]?.status

          return (
            <section key={ps.id} className="miro-surface overflow-hidden transition hover:border-[#1c1c1e]/40">
              {/* Header: Student Name & Badges */}
              <div className="flex flex-col gap-4 border-b border-[#eef0f3] p-5 sm:p-7 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#ffd02f] text-lg font-bold text-[#1c1c1e]">
                    {student.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-2xl font-bold text-[#1c1c1e]">{student.name}</h2>
                      <span className="miro-pill bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                        {student.class.name}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-[#8e91a0]">
                      Admission No: <span className="font-mono font-semibold text-slate-700">{student.admissionNo}</span> · {student.school.name}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/dashboard/parent/student/${student.id}`}
                    className="miro-pill bg-[#1c1c1e] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2c2c34] transition"
                  >
                    View Full Profile & Statement →
                  </Link>
                </div>
              </div>

              {/* 3 Pillar Summary: CBC Learning + Fees + Attendance */}
              <div className="grid gap-3 p-5 sm:p-7 sm:grid-cols-3 bg-[#fafbfc]">
                {/* 1. CBC Learning Evidence */}
                <div className="rounded-2xl border border-[#e0e2e8] bg-white p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8e91a0]">
                      CBC Competency Evidence
                    </span>
                    <p className="mt-2 font-mono text-2xl font-bold text-[#187574]">
                      {student._count.cbcEvidence}
                    </p>
                    <p className="mt-0.5 text-xs text-[#6b6f7e]">Verified learning updates</p>
                  </div>
                  <Link
                    href="/dashboard/parent/learning-updates"
                    className="mt-3 text-xs font-semibold text-[#187574] hover:underline"
                  >
                    View learning updates →
                  </Link>
                </div>

                {/* 2. Fees Status */}
                <div className={`rounded-2xl border p-4 flex flex-col justify-between ${
                  isFeeCleared ? "border-[#b7e1d9] bg-[#eff9f6]" : "border-amber-200 bg-[#fffdf0]"
                }`}>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8e91a0]">
                      School Fees Balance
                    </span>
                    <p className={`mt-2 font-mono text-2xl font-bold ${isFeeCleared ? "text-emerald-700" : "text-amber-800"}`}>
                      {structure ? (isFeeCleared ? "KES 0" : `KES ${feeBalance.toLocaleString()}`) : "Not Billed"}
                    </p>
                    <p className="mt-0.5 text-xs text-[#6b6f7e]">
                      {isFeeCleared ? "Term fees fully cleared ✓" : structure ? `Due: ${new Date(structure.dueDate).toLocaleDateString()}` : "No fee structure"}
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/parent/student/${student.id}#fees`}
                    className="mt-3 text-xs font-semibold text-slate-800 hover:underline"
                  >
                    Fee statement & receipts →
                  </Link>
                </div>

                {/* 3. Daily Attendance */}
                <div className="rounded-2xl border border-[#e0e2e8] bg-white p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8e91a0]">
                      Attendance Rate
                    </span>
                    <div className="mt-2 flex items-baseline gap-2">
                      <p className="font-mono text-2xl font-bold text-[#4262ff]">{attRate}%</p>
                      {todayAtt && (
                        <span className={`miro-pill px-2 py-0.5 text-[10px] font-bold ${
                          todayAtt === "PRESENT" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                        }`}>
                          {todayAtt === "PRESENT" ? "Present Today" : todayAtt}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-[#6b6f7e]">{totalDays} days recorded</p>
                  </div>
                  <Link
                    href={`/dashboard/parent/student/${student.id}#attendance`}
                    className="mt-3 text-xs font-semibold text-[#4262ff] hover:underline"
                  >
                    Attendance details →
                  </Link>
                </div>
              </div>

              {/* Quick Actions Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eef0f3] px-5 py-3.5 sm:px-7 bg-white">
                <span className="text-xs text-[#8e91a0]">
                  Official documents published by {student.school.name}
                </span>
                <div className="flex gap-2">
                  <Link
                    href={`/dashboard/parent/student/${student.id}`}
                    className="miro-pill bg-[#ffd02f] px-3.5 py-1.5 text-xs font-bold text-[#1c1c1e] hover:bg-[#fcb900] transition"
                  >
                    Download Official Term Report Card ↗
                  </Link>
                </div>
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
