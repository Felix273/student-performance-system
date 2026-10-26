import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

export const metadata = {
  title: "Diagnostic Report | Fentech StudentOS",
}

function getMasteryBadge(grade: string) {
  const g = grade.trim().toUpperCase()
  if (g === "EE" || g === "A") {
    return { label: "EE · Exceeding Expectations", classes: "bg-[#c3faf5] text-[#187574] border border-[#7bbdb5]" }
  }
  if (g === "ME" || g === "B") {
    return { label: "ME · Meeting Expectations", classes: "bg-[#e7edff] text-[#4262ff] border border-[#b5c7ff]" }
  }
  if (g === "AE" || g === "C") {
    return { label: "AE · Approaching Expectations", classes: "bg-[#fff4c4] text-[#746019] border border-[#d7c66c]" }
  }
  return { label: "BE · Below Expectations", classes: "bg-[#ffe3e3] text-[#a33a3a] border border-[#f5b3b3]" }
}

export default async function StudentAnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session || !["SCHOOL_ADMIN", "TEACHER", "PARENT"].includes(session.user.role || "")) {
    redirect("/dashboard")
  }

  const { id } = await params

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      class: { select: { id: true, name: true, grade: true } },
      school: { select: { id: true, name: true } },
      performances: {
        orderBy: { analysisDate: "desc" },
        take: 1,
      },
    },
  })

  if (!student) redirect("/dashboard/analysis")

  const performance = student.performances[0]
  if (!performance) {
    redirect(`/dashboard/analysis/${id}/generate`)
  }

  const strengths: string[] = JSON.parse(performance.strengths || "[]")
  const weaknesses: string[] = JSON.parse(performance.weaknesses || "[]")
  const recommendations: string[] = JSON.parse(performance.recommendations || "[]")
  const badge = getMasteryBadge(performance.overallGrade)

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/analysis" className="text-xs font-bold text-[#4262ff] hover:underline">
          ← Back to Insights Directory
        </Link>
        <Link
          href={`/dashboard/analysis/${id}/generate`}
          className="miro-pill bg-[#1c1c1e] text-white px-4 py-2 text-xs font-semibold hover:bg-[#2c2c34]"
        >
          Regenerate Report ⚡
        </Link>
      </div>

      <section className="relative overflow-hidden rounded-[28px] bg-[#ffd02f] p-6 sm:p-9 text-[#1c1c1e]">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-[10px] font-bold uppercase tracking-[.2em] text-[#746019]">Diagnostic Report</span>
          <span className="miro-pill bg-[#1c1c1e] text-[#ffd02f] px-2.5 py-0.5 text-[11px] font-bold">
            {student.class.name}
          </span>
          <span className="miro-pill bg-white/70 text-[#1c1c1e] px-2.5 py-0.5 text-[11px] font-semibold">
            Adm: {student.admissionNo}
          </span>
        </div>
        <h1 className="text-3xl font-medium tracking-tight text-[#1c1c1e] sm:text-4xl">{student.name}</h1>
        <p className="mt-1 text-xs text-[#746019]">
          Generated on {new Date(performance.analysisDate).toLocaleDateString(undefined, { dateStyle: "long" })}
        </p>
      </section>

      <section className="miro-surface p-6 sm:p-8 space-y-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#e0e2e8] bg-[#fbfbfc] p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8e91a0]">Mastery Level</span>
            <div className="mt-2">
              <span className={`miro-pill px-3.5 py-1 text-xs font-bold ${badge.classes}`}>{badge.label}</span>
            </div>
          </div>
          <div className="rounded-2xl border border-[#e0e2e8] bg-[#fbfbfc] p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8e91a0]">Trajectory</span>
            <div className="mt-2">
              <span className="miro-pill bg-slate-100 text-slate-800 px-3.5 py-1 text-xs font-bold">
                {performance.trend}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-[#fffdf0] p-5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8a5a09]">Summary Diagnosis</span>
          <p className="mt-2 text-xs leading-6 text-[#66521d] font-medium">{performance.aiInsights}</p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-[#e0e2e8] p-5 space-y-3">
            <h4 className="text-xs font-bold uppercase text-[#1c1c1e]">Strengths</h4>
            <ul className="space-y-2 text-xs">
              {strengths.map((s, i) => (
                <li key={i} className="rounded-lg bg-emerald-50 p-2 text-emerald-950 font-medium">✓ {s}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-[#e0e2e8] p-5 space-y-3">
            <h4 className="text-xs font-bold uppercase text-[#1c1c1e]">Support Needs</h4>
            <ul className="space-y-2 text-xs">
              {weaknesses.map((w, i) => (
                <li key={i} className="rounded-lg bg-amber-50 p-2 text-amber-950 font-medium">! {w}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-[#e0e2e8] p-5 space-y-3">
            <h4 className="text-xs font-bold uppercase text-[#1c1c1e]">Directives</h4>
            <ul className="space-y-2 text-xs">
              {recommendations.map((r, i) => (
                <li key={i} className="rounded-lg bg-blue-50 p-2 text-blue-950 font-medium">0{i + 1}. {r}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
