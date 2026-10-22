import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

export const metadata = {
  title: "Assessments Oversight | Fentech StudentOS",
}

export default async function AssessmentsPage() {
  const session = await auth()
  if (!session || !["SCHOOL_ADMIN", "TEACHER"].includes(session.user.role || "") || !session.user.schoolId) {
    redirect("/dashboard")
  }

  const schoolId = session.user.schoolId
  const isSchoolAdmin = session.user.role === "SCHOOL_ADMIN"

  const [assessments, pendingModerations] = await Promise.all([
    prisma.assessment.findMany({
      where: {
        schoolId,
        ...(isSchoolAdmin ? {} : { class: { teachers: { some: { teacherId: session.user.id } } } }),
      },
      include: {
        class: true,
        subject: true,
        school: true,
        _count: { select: { results: true } },
      },
      orderBy: { date: "desc" },
    }),
    isSchoolAdmin
      ? prisma.assessmentEvidence.count({
          where: { schoolId, status: "SUBMITTED" },
        })
      : 0,
  ])

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-[#e0e2e8] pb-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#8e91a0]">
            CBC Academics & Quality
          </p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight text-[#1c1c1e] sm:text-4xl">
            Assessments Hub
          </h1>
          <p className="mt-1 text-sm text-[#6b6f7e]">
            Track assessment checkpoints, recorded marks, and moderation quality control across your school.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {isSchoolAdmin && (
            <Link
              href="/dashboard/assessments/moderation"
              className={`miro-pill inline-flex items-center gap-2 border px-4 py-2.5 text-xs font-semibold transition ${
                pendingModerations > 0
                  ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                  : "border-[#e0e2e8] bg-white text-[#1c1c1e] hover:bg-[#f7f8fa]"
              }`}
            >
              <span>Moderation Queue</span>
              {pendingModerations > 0 && (
                <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                  {pendingModerations}
                </span>
              )}
            </Link>
          )}

          <Link
            href="/dashboard/assessments/new"
            className="miro-pill inline-flex items-center justify-center bg-[#1c1c1e] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#2c2c34]"
          >
            + New Assessment
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="miro-surface p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-[#8e91a0]">Total Checkpoints</p>
          <p className="mt-2 font-mono text-3xl font-semibold text-[#1c1c1e]">{assessments.length}</p>
          <p className="mt-1 text-xs text-[#8e91a0]">Created assessments</p>
        </div>
        <div className="miro-surface p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-[#8e91a0]">Scores Recorded</p>
          <p className="mt-2 font-mono text-3xl font-semibold text-[#4262ff]">
            {assessments.reduce((sum, item) => sum + item._count.results, 0)}
          </p>
          <p className="mt-1 text-xs text-[#8e91a0]">Learner entries</p>
        </div>
        <div className="miro-surface p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-[#8e91a0]">Moderation Queue</p>
          <p className={`mt-2 font-mono text-3xl font-semibold ${pendingModerations > 0 ? "text-amber-600" : "text-[#187574]"}`}>
            {pendingModerations}
          </p>
          <p className="mt-1 text-xs text-[#8e91a0]">
            {pendingModerations > 0 ? "Awaiting your sign-off" : "All reviewed"}
          </p>
        </div>
        <div className="miro-surface p-5 hidden sm:block">
          <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-[#8e91a0]">Latest Assessment</p>
          <p className="mt-2 text-base font-semibold text-[#1c1c1e]">
            {assessments[0]
              ? new Date(assessments[0].date).toLocaleDateString(undefined, { month: "short", day: "numeric" })
              : "—"}
          </p>
          <p className="mt-1 text-xs text-[#8e91a0] truncate">{assessments[0]?.title || "None yet"}</p>
        </div>
      </div>

      {/* Activity Table */}
      <div className="overflow-hidden miro-surface">
        <div className="border-b border-[#eef0f3] p-5 sm:p-6">
          <h2 className="text-xl font-bold tracking-tight text-[#1c1c1e]">Assessment Activity</h2>
          <p className="mt-1 text-xs text-[#6b6f7e]">Recent checkpoints across your classes and learning areas</p>
        </div>

        <div className="overflow-x-auto" tabIndex={0} aria-label="Assessments table">
          <table className="min-w-[760px] w-full divide-y divide-[#eef0f3]">
            <thead className="bg-[#f7f8fa]">
              <tr>
                {["Assessment Title", "Type", "Class", "Subject", "Date", "Results", "Actions"].map((heading) => (
                  <th key={heading} className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-[.12em] text-[#8e91a0]">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef0f3]">
              {assessments.map((a) => (
                <tr key={a.id} className="transition hover:bg-[#fafbfc]">
                  <td className="px-5 py-4">
                    <span className="block text-sm font-bold text-[#1c1c1e]">{a.title}</span>
                    <span className="mt-0.5 block text-xs text-[#8e91a0]">Max score: {a.maxScore}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="miro-pill bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                      {a.type}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs font-semibold text-[#1c1c1e]">{a.class.name}</td>
                  <td className="px-5 py-4 text-xs font-medium text-[#4262ff]">{a.subject.name}</td>
                  <td className="px-5 py-4 text-xs text-[#6b6f7e]">
                    {new Date(a.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-5 py-4">
                    <span className="miro-pill bg-[#f7f8fa] border border-[#e0e2e8] px-2.5 py-0.5 text-xs font-medium text-[#555a6a]">
                      {a._count.results} recorded
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <Link
                      href={`/dashboard/assessments/${a.id}/record`}
                      className="mr-3 text-xs font-bold text-[#4262ff] hover:underline"
                    >
                      Record
                    </Link>
                    <Link
                      href={`/dashboard/assessments/${a.id}`}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {assessments.length === 0 && (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e7edff] text-xl text-[#4262ff]">
                📝
              </div>
              <h3 className="font-bold text-[#1c1c1e]">No assessments created yet</h3>
              <p className="mt-1 text-xs text-[#6b6f7e]">
                Click &quot;+ New Assessment&quot; to set up your first CBC evaluation checkpoint.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
