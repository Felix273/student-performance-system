import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import StatCard from "@/components/ui/StatCard"

const baseActions = [
  { href: "/dashboard/students", label: "Students", detail: "View records and performance", tone: "yellow", roles: ["SCHOOL_ADMIN"] },
  { href: "/dashboard/assessments/moderation", label: "Moderation Queue", detail: "Review & approve teacher marks", tone: "blue", roles: ["SCHOOL_ADMIN"] },
  { href: "/dashboard/attendance", label: "Take attendance", detail: "Mark today in seconds", tone: "teal", roles: ["SCHOOL_ADMIN", "TEACHER"] },
  { href: "/dashboard/settings", label: "School settings", detail: "Manage profile & terms", tone: "rose", roles: ["SCHOOL_ADMIN"] },
]

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role === "SUPER_ADMIN") redirect("/dashboard/platform")
  if (session.user.role === "TEACHER") redirect("/dashboard/teacher")
  if (session.user.role === "PARENT") redirect("/dashboard/parent")
  if (session.user.role === "STUDENT") redirect("/dashboard/student")

  const schoolId = session.user.schoolId
  const schoolFilter = session.user.role === "SCHOOL_ADMIN" && schoolId ? { schoolId } : {}

  const [
    totalStudents,
    activeClasses,
    totalAssessments,
    totalAnalyses,
    pendingModerationCount,
    activeAcademicYear,
  ] = await Promise.all([
    prisma.student.count({ where: schoolFilter }),
    prisma.class.count({ where: schoolFilter }),
    prisma.assessment.count({ where: schoolFilter }),
    prisma.performanceAnalysis.count({
      where: session.user.role === "SCHOOL_ADMIN" && schoolId ? { student: { schoolId } } : {},
    }),
    schoolId
      ? prisma.assessmentEvidence.count({
          where: { schoolId, status: "SUBMITTED" },
        })
      : 0,
    schoolId
      ? prisma.academicYear.findFirst({
          where: { schoolId, isCurrent: true },
          include: { periods: { orderBy: { sequence: "asc" } } },
        })
      : null,
  ])

  // Determine active term/period based on current date
  const now = new Date()
  const activeTerm = activeAcademicYear?.periods.find(
    (p) => now >= new Date(p.startsOn) && now <= new Date(p.endsOn)
  ) || activeAcademicYear?.periods[0]

  const visibleActions = baseActions.filter((action) => action.roles.includes(session.user.role || ""))

  return (
    <div className="space-y-10 animate-fade-in">
      {/* 1. Attention Banner for Pending Moderation */}
      {pendingModerationCount > 0 && (
        <section
          role="status"
          aria-live="polite"
          className="relative overflow-hidden rounded-[24px] border border-[#e0ad35] bg-[#fff2c2] p-5 text-[#49390e] shadow-[0_10px_28px_rgba(185,128,17,.12)]"
        >
          <div aria-hidden="true" className="absolute inset-y-0 left-0 w-2 bg-[#d99412]" />
          <div className="relative flex flex-col justify-between gap-4 sm:flex-row sm:items-center sm:pl-3">
            <div className="flex items-center gap-3.5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#ffd02f] text-lg font-black text-[#49390e]">
                !
              </span>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#8a5a09]">
                  Action Required • Assessment Operations
                </p>
                <h2 className="mt-0.5 text-base font-bold sm:text-lg">
                  {pendingModerationCount} {pendingModerationCount === 1 ? "assessment" : "assessments"} awaiting review
                </h2>
                <p className="text-xs leading-5 text-[#66521d]">
                  Teachers have submitted learner evidence that must be verified before appearing on official report cards.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/assessments/moderation"
              className="miro-pill bg-[#1c1c1e] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#2c2c34] shrink-0 text-center"
            >
              Review queue ({pendingModerationCount}) →
            </Link>
          </div>
        </section>
      )}

      {/* 2. Hero Header with Academic Year & Term Badge */}
      <section className="relative overflow-hidden rounded-[28px] bg-[#ffd02f] px-7 py-10 sm:px-12 sm:py-14">
        <div className="absolute -right-10 -top-16 h-64 w-64 rounded-full border-[32px] border-[#fcb900]/50" />
        <div className="absolute bottom-[-90px] right-48 h-48 w-48 rounded-full border-[22px] border-[#fff4c4]/70" />
        <div className="relative max-w-3xl">
          <div className="mb-5 flex flex-wrap items-center gap-2.5">
            <span className="text-[11px] font-bold uppercase tracking-[.2em] text-[#746019]">
              School Administrator Workspace
            </span>
            {activeAcademicYear ? (
              <span className="miro-pill bg-[#1c1c1e] px-3 py-1 text-xs font-bold text-[#ffd02f]">
                {activeAcademicYear.name} {activeTerm ? `• ${activeTerm.name}` : ""}
              </span>
            ) : (
              <Link
                href="/dashboard/settings"
                className="miro-pill bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-700 transition"
              >
                ⚠ No Active Academic Year (Set Up)
              </Link>
            )}
          </div>
          <h1 className="max-w-2xl text-4xl font-medium leading-[1.05] tracking-[-.055em] text-[#1c1c1e] sm:text-6xl">
            Make space for better decisions.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-[#746019]">
            Welcome back, {session.user.name?.split(" ")[0]}. Your school records, academic calendar, and moderation workflows are synced.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/dashboard/reports"
              className="miro-pill bg-[#1c1c1e] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#2c2c34]"
            >
              View reports <span className="ml-2">↗</span>
            </Link>
            <Link
              href="/dashboard/assessments/moderation"
              className="miro-pill border border-[#1c1c1e]/20 bg-white/35 px-5 py-3 text-sm font-medium text-[#1c1c1e] transition hover:bg-white/60"
            >
              Moderation queue ({pendingModerationCount})
            </Link>
          </div>
        </div>
      </section>

      {/* 3. Metrics at a Glance */}
      <section>
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#8e91a0]">The workspace</p>
            <h2 className="mt-2 text-2xl font-medium tracking-tight text-[#1c1c1e]">School at a glance</h2>
          </div>
          <span className="miro-pill border border-[#e0e2e8] px-3 py-1.5 text-xs font-medium text-[#6b6f7e]">
            Live data
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard title="Students" value={totalStudents} color="blue" href="/dashboard/students" />
          <StatCard title="Classes" value={activeClasses} color="green" />
          <StatCard title="Assessments" value={totalAssessments} color="purple" href="/dashboard/assessments" />
          <StatCard title="Pending Review" value={pendingModerationCount} color="orange" href="/dashboard/assessments/moderation" />
        </div>
      </section>

      {/* 4. Canvas Quick Actions & Status */}
      <section className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <div className="miro-surface p-6 sm:p-8">
          <div className="mb-7 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#8e91a0]">Canvas</p>
              <h2 className="mt-2 text-2xl font-medium tracking-tight text-[#1c1c1e]">Keep the work moving</h2>
            </div>
            <span className="text-xs text-[#8e91a0]">{visibleActions.length} actions</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {visibleActions.map((action, i) => (
              <Link
                key={action.href}
                href={action.href}
                className={`group min-h-36 rounded-[20px] p-5 transition hover:-translate-y-1 ${
                  action.tone === "yellow"
                    ? "bg-[#fff4c4]"
                    : action.tone === "blue"
                    ? "bg-[#e7edff]"
                    : action.tone === "teal"
                    ? "bg-[#c3faf5]"
                    : "bg-[#ffd8f4]"
                }`}
              >
                <span className="block text-2xl font-medium text-[#1c1c1e]">0{i + 1}</span>
                <span className="mt-8 block">
                  <strong className="block text-sm font-medium text-[#1c1c1e]">{action.label}</strong>
                  <small className="mt-1 block text-xs text-[#555a6a]">{action.detail}</small>
                </span>
                <span className="mt-3 block text-[#555a6a] transition group-hover:translate-x-1">→</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-[20px] bg-[#1c1c1e] p-6 text-white sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#a5a8b5]">Academic status</p>
          <h2 className="mt-3 text-2xl font-medium tracking-tight">System synchrony.</h2>
          <p className="mt-3 text-sm leading-6 text-[#a5a8b5]">
            Key metrics for your active academic session and operational compliance.
          </p>
          <div className="mt-9 space-y-4">
            {[
              ["Active Academic Year", activeAcademicYear?.name || "None set"],
              ["Current Term", activeTerm?.name || "None set"],
              ["Enrolled Learners", totalStudents],
              ["Active Classes", activeClasses],
              ["Moderation Queue", pendingModerationCount > 0 ? `${pendingModerationCount} waiting` : "All clear"],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex items-center justify-between border-b border-white/10 pb-4">
                <span className="text-sm text-[#a5a8b5]">{label}</span>
                <strong className="font-mono text-sm text-[#ffd02f]">{value}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
