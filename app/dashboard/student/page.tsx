import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

export const metadata = {
  title: "My Learning | Fentech StudentOS",
}

type Snapshot = {
  planTitle?: string
  numericScore?: number | null
  maxScore?: number | null
  masteryLevel?: string | null
  narrative?: string | null
  learningOutcome?: { code?: string; statement?: string } | null
  competency?: { name?: string } | null
}

function getMasteryBadge(level?: string | null) {
  if (!level) return null
  const code = level.trim().toUpperCase()

  if (code === "EE" || code.includes("EXCEEDING") || code === "A") {
    return {
      label: "EE · Exceeding Expectations",
      classes: "bg-[#c3faf5] text-[#187574] border border-[#7bbdb5]",
    }
  }
  if (code === "ME" || code.includes("MEETING") || code === "B") {
    return {
      label: "ME · Meeting Expectations",
      classes: "bg-[#e7edff] text-[#4262ff] border border-[#b5c7ff]",
    }
  }
  if (code === "AE" || code.includes("APPROACHING") || code === "C") {
    return {
      label: "AE · Approaching Expectations",
      classes: "bg-[#fff4c4] text-[#746019] border border-[#d7c66c]",
    }
  }
  return {
    label: "BE · Below Expectations",
    classes: "bg-[#ffe3e3] text-[#a33a3a] border border-[#f5b3b3]",
  }
}

export default async function StudentPortalPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role !== "STUDENT") redirect("/dashboard")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      schoolId: true,
      school: { select: { name: true, logoUrl: true } },
    },
  })

  if (!user || !user.schoolId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <div className="max-w-md rounded-[24px] bg-[#fff4c4] p-8 text-center shadow-sm">
          <p className="text-3xl">⚠️</p>
          <h1 className="mt-3 text-xl font-bold text-[#1c1c1e]">Account Setup Required</h1>
          <p className="mt-2 text-xs leading-6 text-[#746019]">
            Your student account is not linked to a school. Please contact your school administrator.
          </p>
        </div>
      </div>
    )
  }

  // Fetch student profile, CBC evidence, assessments, attendance, and reports
  const student = await prisma.student.findUnique({
    where: { userId: user.id },
    include: {
      class: { select: { id: true, name: true, grade: true } },
      cbcEvidence: {
        where: { status: "PUBLISHED" },
        orderBy: { publishedAt: "desc" },
        take: 15,
        select: {
          id: true,
          publishedAt: true,
          publishedSnapshot: true,
          masteryLevel: true,
          narrative: true,
          learningOutcome: { select: { code: true, statement: true } },
          competency: { select: { code: true, name: true } },
        },
      },
      assessments: {
        include: {
          assessment: {
            include: { subject: { select: { name: true, code: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
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
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <div className="max-w-md rounded-[24px] bg-[#e7edff] p-8 text-center shadow-sm">
          <p className="text-3xl">📋</p>
          <h1 className="mt-3 text-xl font-bold text-[#1c1c1e]">Learner Profile Pending</h1>
          <p className="mt-2 text-xs leading-6 text-[#555a6a]">
            Your user account is not linked to an official student record yet. Contact your school administrator to link your admission number.
          </p>
        </div>
      </div>
    )
  }

  // Attendance metrics
  const presentCount = student.attendance.filter((a) => a.status === "PRESENT").length
  const lateCount = student.attendance.filter((a) => a.status === "LATE").length
  const absentCount = student.attendance.filter((a) => a.status === "ABSENT").length
  const attendanceRate =
    student.attendance.length > 0
      ? Math.round(((presentCount + lateCount) / student.attendance.length) * 100)
      : null

  // Fetch latest academic period for term report card download
  const currentPeriod = await prisma.academicPeriod.findFirst({
    where: { academicYear: { schoolId: user.schoolId, isCurrent: true } },
    orderBy: { sequence: "asc" },
  })

  const latestAnalysis = student.performances[0] ?? null

  return (
    <div className="space-y-8 animate-fade-in pb-12 max-w-6xl mx-auto">
      {/* 1. Learner Hero Header */}
      <section className="relative overflow-hidden rounded-[28px] bg-[#ffd02f] p-7 sm:p-12 text-[#1c1c1e]">
        <div className="absolute -right-10 -top-16 h-64 w-64 rounded-full border-[32px] border-[#fcb900]/50" />
        <div className="relative max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-[10px] font-bold uppercase tracking-[.2em] text-[#746019]">
              Student Portal · {user.school?.name}
            </span>
            <span className="miro-pill bg-[#1c1c1e] text-[#ffd02f] px-2.5 py-0.5 text-[11px] font-bold">
              {student.class.name}
            </span>
          </div>

          <h1 className="text-4xl font-medium tracking-tight text-[#1c1c1e] sm:text-5xl">
            Welcome back, <br className="hidden sm:inline" />
            <span className="font-bold">{student.name.split(" ")[0]}!</span>
          </h1>

          <p className="mt-2 text-xs sm:text-sm text-[#746019]">
            Grade {student.class.grade} · Admission No: <strong className="font-mono">{student.admissionNo}</strong>
          </p>

          {currentPeriod && (
            <div className="mt-6 flex flex-wrap gap-2.5">
              <a
                href={`/api/reports/cbc-student-pdf?studentId=${student.id}&periodId=${currentPeriod.id}`}
                target="_blank"
                rel="noreferrer"
                className="miro-pill inline-flex items-center gap-2 bg-[#1c1c1e] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#2c2c34] transition shadow-sm"
              >
                <span>Download Term Report Card (PDF)</span>
                <span>📥</span>
              </a>
            </div>
          )}
        </div>
      </section>

      {/* 2. Pulse Metrics Row */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-[20px] bg-[#c3faf5] p-5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#187574]">
            CBC Competencies
          </span>
          <p className="mt-3 font-mono text-3xl font-bold text-[#187574]">
            {student.cbcEvidence.length}
          </p>
          <p className="mt-1 text-xs text-[#2c6e6d]">Published achievements</p>
        </div>

        <div className="rounded-[20px] bg-[#e7edff] p-5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#4262ff]">
            Attendance Rate
          </span>
          <p className="mt-3 font-mono text-3xl font-bold text-[#4262ff]">
            {attendanceRate !== null ? `${attendanceRate}%` : "—"}
          </p>
          <p className="mt-1 text-xs text-[#5263a6]">Last 30 school days</p>
        </div>

        <div className="rounded-[20px] bg-[#d4f5d4] p-5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#216e21]">
            Days Present
          </span>
          <p className="mt-3 font-mono text-3xl font-bold text-[#216e21]">{presentCount}</p>
          <p className="mt-1 text-xs text-[#356d35]">Recorded on time</p>
        </div>

        <div className="rounded-[20px] bg-[#fff4c4] p-5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#746019]">
            Assessments
          </span>
          <p className="mt-3 font-mono text-3xl font-bold text-[#1c1c1e]">
            {student.assessments.length}
          </p>
          <p className="mt-1 text-xs text-[#746019]">Checkpoints completed</p>
        </div>
      </section>

      {/* 3. Main Content: CBC Competency Achievements & Assessment History */}
      <div className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
        {/* Left Column: CBC Competency Achievements */}
        <section className="miro-surface p-6 sm:p-8 space-y-5">
          <div className="flex items-center justify-between border-b border-[#eef0f3] pb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#187574]">
                Official Achievements
              </p>
              <h2 className="text-xl font-bold tracking-tight text-[#1c1c1e]">
                My Competency Badges
              </h2>
            </div>
            <span className="miro-pill bg-[#c3faf5] px-3 py-1 text-xs font-bold text-[#187574]">
              {student.cbcEvidence.length} Published
            </span>
          </div>

          {student.cbcEvidence.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#e0e2e8] bg-[#fffdf8] p-8 text-center text-xs text-[#746019]">
              No CBC competency updates published yet. Your teachers will share updates as assessments are completed.
            </div>
          ) : (
            <div className="space-y-4">
              {student.cbcEvidence.map((evidence) => {
                const snapshot = evidence.publishedSnapshot as Snapshot | null
                const badge = getMasteryBadge(evidence.masteryLevel || snapshot?.masteryLevel)

                return (
                  <article
                    key={evidence.id}
                    className="rounded-2xl border border-[#e0e2e8] bg-[#fffdf8] p-4 sm:p-5 space-y-3 transition hover:border-[#1c1c1e]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f0ece1] pb-3">
                      <div>
                        <h3 className="font-bold text-sm text-[#1c1c1e]">
                          {snapshot?.planTitle || "CBC Learning Evaluation"}
                        </h3>
                        <p className="text-[10px] text-[#8e91a0]">
                          Published on{" "}
                          {evidence.publishedAt
                            ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(
                                evidence.publishedAt
                              )
                            : "Recently"}
                        </p>
                      </div>

                      {badge && (
                        <span className={`miro-pill px-3 py-0.5 text-[11px] font-bold ${badge.classes}`}>
                          {badge.label}
                        </span>
                      )}
                    </div>

                    <div className="text-xs space-y-1">
                      <p className="text-[#1c1c1e]">
                        <strong className="text-[#8e91a0] uppercase text-[10px] block">Learning Outcome</strong>
                        {evidence.learningOutcome?.statement || snapshot?.learningOutcome?.statement || "Core Curricular Outcome"}
                      </p>
                      {evidence.competency && (
                        <p className="text-[#4262ff] font-medium text-[11px]">
                          Competency: {evidence.competency.name}
                        </p>
                      )}
                    </div>

                    {/* Teacher Encouraging Remarks */}
                    {(evidence.narrative || snapshot?.narrative) && (
                      <div className="rounded-xl bg-[#fff8e5] p-3 border border-amber-200">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8a5a09]">
                          Teacher Observation
                        </span>
                        <p className="mt-0.5 text-xs text-[#5e410b] italic leading-relaxed">
                          &ldquo;{evidence.narrative || snapshot?.narrative}&rdquo;
                        </p>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </section>

        {/* Right Column: Recent Scores & Attendance */}
        <div className="space-y-6">
          {/* Assessment Checkpoints */}
          <section className="miro-surface p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#1c1c1e]">Continuous Checkpoints</h2>
            {student.assessments.length === 0 ? (
              <p className="text-xs text-[#8e91a0]">No assessment checkpoints recorded yet.</p>
            ) : (
              <div className="divide-y divide-[#eef0f3]">
                {student.assessments.map(({ assessment, score }) => {
                  const pct =
                    assessment.maxScore > 0
                      ? Math.round((score / assessment.maxScore) * 100)
                      : 0
                  return (
                    <div key={assessment.id} className="flex items-center justify-between py-2.5 text-xs">
                      <div>
                        <p className="font-bold text-[#1c1c1e]">{assessment.subject.name}</p>
                        <p className="text-[10px] text-[#8e91a0]">{assessment.title}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-[#1c1c1e]">
                          {score}/{assessment.maxScore}
                        </span>
                        <span
                          className={`ml-2 miro-pill px-2 py-0.5 text-[10px] font-bold ${
                            pct >= 80
                              ? "bg-[#c3faf5] text-[#187574]"
                              : pct >= 60
                              ? "bg-[#e7edff] text-[#4262ff]"
                              : "bg-[#fff4c4] text-[#746019]"
                          }`}
                        >
                          {pct}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* Attendance Visualization */}
          <section className="miro-surface p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1c1c1e]">Attendance Streak</h2>
              <span className="text-[11px] text-[#8e91a0]">Last 30 Days</span>
            </div>

            {student.attendance.length === 0 ? (
              <p className="text-xs text-[#8e91a0]">No attendance records taken yet.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {student.attendance.map((record) => (
                    <div
                      key={record.id}
                      title={`${new Date(record.date).toLocaleDateString()} — ${record.status}`}
                      className={`h-7 w-7 rounded-lg text-[10px] font-bold flex items-center justify-center transition hover:scale-110 ${
                        record.status === "PRESENT"
                          ? "bg-emerald-100 text-emerald-800"
                          : record.status === "LATE"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {record.status[0]}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between border-t border-[#eef0f3] pt-3 text-[11px] text-[#6b6f7e]">
                  <span>🟢 Present: {presentCount}</span>
                  <span>🟡 Late: {lateCount}</span>
                  <span>🔴 Absent: {absentCount}</span>
                </div>
              </div>
            )}
          </section>

          {/* Performance Insight Summary (If Available) */}
          {latestAnalysis && (
            <section className="rounded-2xl border border-amber-200 bg-[#fffdf0] p-5 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8a5a09]">
                Learning Growth Advice
              </span>
              <p className="text-xs leading-relaxed text-[#66521d] font-medium">
                {latestAnalysis.aiInsights}
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
