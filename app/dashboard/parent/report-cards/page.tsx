import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import ReportCardAcknowledgement from "./ReportCardAcknowledgement"

type Snapshot = {
  student: { name: string; admissionNo: string; className: string; grade?: string | null }
  period: { name: string; code: string }
  school: { name: string }
  summary: { cbcEvidenceCount: number; legacyAssessmentCount: number; cbcAveragePercentage: number | null; legacyAveragePercentage: number | null }
}

export default async function ParentReportCardsPage() {
  const session = await auth()
  if (!session || session.user.role !== "PARENT" || !session.user.id) redirect("/dashboard")

  const publications = await prisma.reportPublication.findMany({
    where: { recipientId: session.user.id, channel: "PARENT_PORTAL" },
    include: {
      reportCard: {
        include: {
          entries: { orderBy: { sequence: "asc" } },
          comments: { where: { audience: "FAMILY" }, orderBy: { createdAt: "asc" } },
        },
      },
    },
    orderBy: { publishedAt: "desc" },
    take: 100,
  })
  const reports = publications.filter(({ version, reportCard }) => version === reportCard.version && ["PUBLISHED", "AMENDED", "ARCHIVED"].includes(reportCard.status))

  return <div className="mx-auto max-w-5xl space-y-8">
    <header className="border-b border-slate-200 pb-6">
      <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#8c7318]">Family portal</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Report cards</h1>
      <p className="mt-2 text-sm text-slate-600">Published report snapshots for your linked learners.</p>
    </header>

    {reports.length === 0 ? <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600">No report cards have been published to your account yet.</section> : <div className="space-y-6">
      {reports.map(({ id: publicationId, reportCard, publishedAt, acknowledgedAt }) => {
        const snapshot = reportCard.snapshot as unknown as Snapshot
        const grouped = new Map<string, typeof reportCard.entries>()
        for (const entry of reportCard.entries) {
          const rows = grouped.get(entry.sectionTitle) ?? []
          rows.push(entry)
          grouped.set(entry.sectionTitle, rows)
        }
        return <article key={publicationId} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 bg-slate-50 p-5 sm:p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{snapshot.period.name} · {snapshot.period.code}</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">{snapshot.student.name}</h2>
              <p className="mt-1 text-sm text-slate-600">{snapshot.student.className}{snapshot.student.grade ? ` · Grade ${snapshot.student.grade}` : ""} · {snapshot.school.name}</p>
              <p className="mt-1 text-xs text-slate-500">Published {new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(publishedAt)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={`/api/report-cards/${reportCard.id}/pdf`} className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100">Download PDF</a>
              <ReportCardAcknowledgement reportCardId={reportCard.id} acknowledgedAt={acknowledgedAt?.toISOString() ?? null} />
            </div>
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
            <div className="rounded-xl bg-[#fff8d7] p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-600">CBC evidence</p><p className="mt-1 text-lg font-semibold text-slate-950">{snapshot.summary.cbcEvidenceCount} entries</p><p className="text-xs text-slate-600">{snapshot.summary.cbcAveragePercentage == null ? "No numeric average" : `${snapshot.summary.cbcAveragePercentage}% average where scored`}</p></div>
            <div className="rounded-xl bg-[#e8f7f4] p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-600">Assessment history</p><p className="mt-1 text-lg font-semibold text-slate-950">{snapshot.summary.legacyAssessmentCount} entries</p><p className="text-xs text-slate-600">{snapshot.summary.legacyAveragePercentage == null ? "No numeric average" : `${snapshot.summary.legacyAveragePercentage}% average where scored`}</p></div>
          </div>
          <div className="space-y-6 px-5 pb-6 sm:px-6">
            {[...grouped.entries()].map(([section, entries]) => <section key={section}>
              <h3 className="mb-3 text-sm font-semibold text-slate-900">{section}</h3>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {entries.map((entry) => <div key={entry.id} className="grid gap-2 p-4 sm:grid-cols-[1fr_auto]">
                  <div><p className="text-sm font-medium text-slate-900">{entry.label}</p>{entry.subjectName && <p className="mt-0.5 text-xs text-slate-500">{entry.subjectName}</p>}{entry.narrative && <p className="mt-2 text-sm leading-6 text-slate-600">{entry.narrative}</p>}</div>
                  <div className="text-left sm:text-right">{entry.masteryLevel && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">{entry.masteryLevel}</span>}{entry.numericValue != null && <p className="mt-2 text-sm font-semibold text-slate-900">{entry.numericValue}{entry.maxValue == null ? "" : ` / ${entry.maxValue}`}</p>}</div>
                </div>)}
              </div>
            </section>)}
            {reportCard.comments.length > 0 && <section><h3 className="mb-3 text-sm font-semibold text-slate-900">School comments</h3><div className="space-y-3">{reportCard.comments.map((comment) => <blockquote key={comment.id} className="rounded-xl border-l-4 border-[#ffd02f] bg-slate-50 p-4 text-sm leading-6 text-slate-700">{comment.body}</blockquote>)}</div></section>}
          </div>
        </article>
      })}
    </div>}
  </div>
}
