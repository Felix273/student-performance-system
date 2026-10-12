import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

/**
 * Student self-service portal.
 *
 * A Student-role user can only see their own profile, class, subjects,
 * assessment scores, and attendance. They cannot see other students'
 * data — enforced via the session.user.id lookup.
 *
 * Learner data is scoped through the explicit User-to-Student relationship.
 */
export default async function StudentPortalPage() {
  const session = await auth()

  // Only STUDENT role may access this page
  if (!session?.user) redirect("/login")
  if (session.user.role !== "STUDENT") redirect("/dashboard")

  // Look up the student record associated with this user account.
  // Convention: the User.email for a student account matches the Student
  // record's school email. If no direct Student record exists we show a
  // "setup pending" state rather than a hard error.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      schoolId: true,
      school: { select: { name: true } },
    },
  })

  if (!user || !user.schoolId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md rounded-[20px] bg-[#fff4c4] p-8 text-center">
          <p className="text-2xl">⚠️</p>
          <h1 className="mt-3 text-xl font-semibold text-[#1c1c1e]">Account not linked</h1>
          <p className="mt-2 text-sm leading-6 text-[#746019]">
            Your student account has not been linked to a school yet. Please contact your school
            administrator.
          </p>
        </div>
      </div>
    )
  }

  const student = await prisma.student.findUnique({
    where: { userId: user.id },
    include: {
      class: { select: { name: true, grade: true } },
      assessments: {
        include: {
          assessment: {
            include: { subject: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
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

  if (!student || student.schoolId !== user.schoolId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md rounded-[20px] bg-[#e7edff] p-8 text-center">
          <p className="text-2xl">📋</p>
          <h1 className="mt-3 text-xl font-semibold text-[#1c1c1e]">Account not linked</h1>
          <p className="mt-2 text-sm leading-6 text-[#555a6a]">
            Your student account is not linked to a learner record yet. Please contact your school
            administrator.
          </p>
        </div>
      </div>
    )
  }

  // Attendance summary
  const presentCount = student.attendance.filter((a) => a.status === "PRESENT").length
  const absentCount = student.attendance.filter((a) => a.status === "ABSENT").length
  const lateCount = student.attendance.filter((a) => a.status === "LATE").length
  const attendanceRate =
    student.attendance.length > 0
      ? Math.round(
          ((presentCount + lateCount) / student.attendance.length) * 100,
        )
      : null

  // Latest AI analysis
  const latestAnalysis = student.performances[0] ?? null

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[28px] bg-[#e7edff] px-7 py-10 sm:px-12 sm:py-14">
        <div className="absolute -right-10 -top-16 h-64 w-64 rounded-full border-[32px] border-[#c3d0ff]/50" />
        <div className="relative">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[.2em] text-[#4a5da0]">
            Student Portal · {user.school?.name}
          </p>
          <h1 className="text-4xl font-medium leading-tight tracking-tight text-[#1c1c1e] sm:text-5xl">
            Welcome back,<br />
            <span className="text-[#2e4fff]">{student.name.split(" ")[0]}.</span>
          </h1>
          <p className="mt-3 text-sm text-[#555a6a]">
            {student.class.name} · {student.class.grade} · Admission&nbsp;{student.admissionNo}
          </p>
        </div>
      </section>

      {/* Stats row */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Recent assessments",
            value: student.assessments.length,
            note: "last 10",
            color: "bg-[#e7edff]",
          },
          {
            label: "Attendance rate",
            value: attendanceRate !== null ? `${attendanceRate}%` : "—",
            note: "last 30 days",
            color: "bg-[#c3faf5]",
          },
          {
            label: "Days present",
            value: presentCount,
            note: "last 30 days",
            color: "bg-[#d4f5d4]",
          },
          {
            label: "Latest grade",
            value: latestAnalysis?.overallGrade ?? "—",
            note: latestAnalysis ? "AI analysis" : "No analysis yet",
            color: "bg-[#fff4c4]",
          },
        ].map(({ label, value, note, color }) => (
          <div key={label} className={`${color} rounded-[20px] p-5`}>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#555a6a]">
              {label}
            </p>
            <p className="mt-2 text-3xl font-semibold text-[#1c1c1e]">{value}</p>
            <p className="mt-1 text-xs text-[#8e91a0]">{note}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent assessments */}
        <section className="rounded-[20px] border border-[#e0e2e8] bg-white p-6">
          <h2 className="mb-5 text-lg font-semibold text-[#1c1c1e]">Recent assessments</h2>
          {student.assessments.length === 0 ? (
            <p className="text-sm text-[#8e91a0]">No assessments recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {student.assessments.map(({ assessment, score }) => {
                const pct =
                  assessment.maxScore > 0
                    ? Math.round((score / assessment.maxScore) * 100)
                    : 0
                return (
                  <div
                    key={assessment.id}
                    className="flex items-center justify-between rounded-xl bg-[#f7f8fa] px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-[#1c1c1e]">{assessment.title}</p>
                      <p className="text-xs text-[#8e91a0]">
                        {assessment.subject.name} · {assessment.type.replace("_", " ")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#1c1c1e]">
                        {score}/{assessment.maxScore}
                      </p>
                      <p
                        className={`text-xs font-medium ${
                          pct >= 70
                            ? "text-green-600"
                            : pct >= 50
                              ? "text-yellow-600"
                              : "text-red-500"
                        }`}
                      >
                        {pct}%
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* AI Performance analysis */}
        <section className="rounded-[20px] border border-[#e0e2e8] bg-white p-6">
          <h2 className="mb-5 text-lg font-semibold text-[#1c1c1e]">Performance insights</h2>
          {latestAnalysis ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-[#e7edff] px-4 py-1.5 text-sm font-semibold text-[#2e4fff]">
                  Grade {latestAnalysis.overallGrade}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    latestAnalysis.trend === "IMPROVING"
                      ? "bg-green-100 text-green-700"
                      : latestAnalysis.trend === "DECLINING"
                        ? "bg-red-100 text-red-600"
                        : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {latestAnalysis.trend}
                </span>
              </div>

              <p className="text-sm leading-6 text-[#555a6a]">{latestAnalysis.aiInsights}</p>

              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[#8e91a0]">
                  Strengths
                </p>
                <ul className="space-y-1">
                  {(JSON.parse(latestAnalysis.strengths) as string[]).map((s) => (
                    <li key={s} className="flex items-start gap-2 text-sm text-[#1c1c1e]">
                      <span className="mt-0.5 text-green-500">✓</span> {s}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[#8e91a0]">
                  Focus areas
                </p>
                <ul className="space-y-1">
                  {(JSON.parse(latestAnalysis.weaknesses) as string[]).map((w) => (
                    <li key={w} className="flex items-start gap-2 text-sm text-[#1c1c1e]">
                      <span className="mt-0.5 text-yellow-500">→</span> {w}
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-[11px] text-[#8e91a0]">
                Generated on{" "}
                {new Date(latestAnalysis.analysisDate).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          ) : (
            <div className="rounded-xl bg-[#f7f8fa] p-5 text-center">
              <p className="text-sm text-[#8e91a0]">
                No AI analysis has been generated for your profile yet. Ask your teacher or
                administrator to run an analysis.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Attendance breakdown */}
      <section className="rounded-[20px] border border-[#e0e2e8] bg-white p-6">
        <h2 className="mb-5 text-lg font-semibold text-[#1c1c1e]">
          Attendance — last 30 days
        </h2>
        {student.attendance.length === 0 ? (
          <p className="text-sm text-[#8e91a0]">No attendance records yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {student.attendance.map((record) => (
              <div
                key={record.id}
                title={`${new Date(record.date).toLocaleDateString()} — ${record.status}`}
                className={`h-7 w-7 rounded-md text-[10px] font-bold flex items-center justify-center ${
                  record.status === "PRESENT"
                    ? "bg-green-100 text-green-700"
                    : record.status === "ABSENT"
                      ? "bg-red-100 text-red-500"
                      : record.status === "LATE"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-500"
                }`}
              >
                {record.status[0]}
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-[#8e91a0]">
          <span>
            <strong className="text-green-600">{presentCount}</strong> Present
          </span>
          <span>
            <strong className="text-yellow-600">{lateCount}</strong> Late
          </span>
          <span>
            <strong className="text-red-500">{absentCount}</strong> Absent
          </span>
        </div>
      </section>
    </div>
  )
}
