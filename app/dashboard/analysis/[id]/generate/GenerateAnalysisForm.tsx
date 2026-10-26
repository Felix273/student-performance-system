"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface Assessment {
  score: number
  assessment: {
    title: string
    maxScore: number
    type: string
    subject: {
      name: string
      code?: string
    }
  }
}

interface Student {
  id: string
  name: string
  admissionNo: string
  class: { name: string }
  school: { name: string }
  assessments: Assessment[]
  performances?: Array<{
    id: string
    overallGrade: string
    trend: string
    strengths: string
    weaknesses: string
    recommendations: string
    aiInsights: string
    analysisDate: string
  }>
}

function getMasteryBadge(grade: string) {
  const g = grade.trim().toUpperCase()
  if (g === "EE" || g === "A") {
    return {
      label: "EE · Exceeding Expectations",
      classes: "bg-[#c3faf5] text-[#187574] border border-[#7bbdb5]",
    }
  }
  if (g === "ME" || g === "B") {
    return {
      label: "ME · Meeting Expectations",
      classes: "bg-[#e7edff] text-[#4262ff] border border-[#b5c7ff]",
    }
  }
  if (g === "AE" || g === "C") {
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

function getTrendBadge(trend: string) {
  const t = trend.trim().toUpperCase()
  if (t === "IMPROVING") {
    return {
      label: "↗ Upward Momentum",
      classes: "bg-emerald-50 text-emerald-800 border border-emerald-200",
    }
  }
  if (t === "DECLINING") {
    return {
      label: "↘ Needs Support",
      classes: "bg-amber-50 text-amber-800 border border-amber-200",
    }
  }
  return {
    label: "→ Steady & Consistent",
    classes: "bg-slate-100 text-slate-700 border border-slate-200",
  }
}

export default function GenerateAnalysisForm({ student }: { student: Student }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Use newly generated analysis or latest saved performance analysis
  const existingPerformance = student.performances?.[0]
  const [analysis, setAnalysis] = useState<any>(
    existingPerformance
      ? {
          overallGrade: existingPerformance.overallGrade,
          trend: existingPerformance.trend,
          strengths: JSON.parse(existingPerformance.strengths || "[]"),
          weaknesses: JSON.parse(existingPerformance.weaknesses || "[]"),
          recommendations: JSON.parse(existingPerformance.recommendations || "[]"),
          aiInsights: existingPerformance.aiInsights,
        }
      : null
  )

  const handleGenerate = async () => {
    setError("")
    setLoading(true)

    try {
      const response = await fetch(`/api/analysis/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: student.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate diagnostic insights")
      }

      setAnalysis({
        overallGrade: data.overallGrade,
        trend: data.trend,
        strengths: typeof data.strengths === "string" ? JSON.parse(data.strengths) : data.strengths,
        weaknesses: typeof data.weaknesses === "string" ? JSON.parse(data.weaknesses) : data.weaknesses,
        recommendations:
          typeof data.recommendations === "string" ? JSON.parse(data.recommendations) : data.recommendations,
        aiInsights: data.aiInsights,
      })

      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error generating diagnostic insights")
    } finally {
      setLoading(false)
    }
  }

  // Calculate current average
  const currentAverage =
    student.assessments.length > 0
      ? (
          student.assessments.reduce((sum, a) => sum + (a.score / (a.assessment.maxScore || 100)) * 100, 0) /
          student.assessments.length
        ).toFixed(1)
      : "—"

  return (
    <div className="space-y-6">
      {/* 1. Academic Performance Summary Surface */}
      <section className="miro-surface p-6 sm:p-8">
        <div className="flex items-center justify-between border-b border-[#eef0f3] pb-4 mb-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#8e91a0]">Continuous Record</p>
            <h2 className="text-xl font-bold tracking-tight text-[#1c1c1e]">Evaluation Baseline</h2>
          </div>
          <span className="miro-pill bg-[#f7f8fa] border border-[#e0e2e8] px-3 py-1 text-xs font-semibold text-[#555a6a]">
            {student.assessments.length} checkpoints
          </span>
        </div>

        {/* Pulse Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 mb-6">
          <div className="rounded-2xl bg-[#e7edff] p-5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#4262ff]">Evaluations Recorded</span>
            <p className="mt-3 font-mono text-3xl font-bold text-[#1c1c1e]">{student.assessments.length}</p>
            <p className="mt-1 text-xs text-[#5263a6]">Continuous checkpoints</p>
          </div>

          <div className="rounded-2xl bg-[#c3faf5] p-5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#187574]">Cumulative Mean</span>
            <p className="mt-3 font-mono text-3xl font-bold text-[#187574]">{currentAverage}%</p>
            <p className="mt-1 text-xs text-[#2c6e6d]">Score aggregate</p>
          </div>

          <div className="col-span-2 sm:col-span-1 rounded-2xl bg-[#fff4c4] p-5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#746019]">Class Standing</span>
            <p className="mt-3 text-lg font-bold text-[#1c1c1e] truncate">{student.class.name}</p>
            <p className="mt-1 text-xs text-[#746019]">Active cohort</p>
          </div>
        </div>

        {/* Recent Assessments List */}
        {student.assessments.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8e91a0]">Recent Assessment Results</h3>
            <div className="divide-y divide-[#eef0f3] rounded-2xl border border-[#e0e2e8] bg-[#fafbfc] overflow-hidden">
              {student.assessments.slice(0, 5).map((r, idx) => {
                const pct = ((r.score / (r.assessment.maxScore || 100)) * 100).toFixed(0)
                return (
                  <div key={idx} className="flex items-center justify-between p-3.5 px-4 text-xs">
                    <div>
                      <p className="font-bold text-[#1c1c1e]">{r.assessment.subject.name}</p>
                      <p className="text-[11px] text-[#8e91a0]">{r.assessment.title}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-[#1c1c1e]">
                        {r.score} / {r.assessment.maxScore}
                      </span>
                      <span className="ml-2 miro-pill bg-white border border-[#e0e2e8] px-2 py-0.5 text-[10px] font-semibold text-[#555a6a]">
                        {pct}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#e0e2e8] bg-[#fffdf5] p-8 text-center text-xs text-[#746019]">
            No assessment checkpoints recorded yet. Record marks before generating insights.
          </div>
        )}
      </section>

      {/* 2. Executive Action Bar (Replaces the big red button) */}
      <section className="miro-surface p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-[#1c1c1e]">Synthesize Diagnostic Report</h3>
          <p className="text-xs text-[#6b6f7e]">
            Runs rule-based CBC pedagogical analysis against official KICD mastery standards.
          </p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || student.assessments.length === 0}
          className="miro-pill inline-flex items-center justify-center gap-2 bg-[#1c1c1e] px-6 py-3.5 text-xs font-bold text-white transition hover:bg-[#2c2c34] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-[#ffd02f]" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Analyzing Performance…</span>
            </>
          ) : (
            <>
              <span className="text-sm">⚡</span>
              <span>{analysis ? "Regenerate Diagnostics" : "Generate Learning Diagnostics"}</span>
            </>
          )}
        </button>
      </section>

      {error && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
          {error}
        </div>
      )}

      {/* 3. Diagnostic Results Surface */}
      {analysis && (
        <section className="miro-surface p-6 sm:p-8 space-y-6 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#eef0f3] pb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#187574]">Pedagogical Diagnosis</p>
              <h3 className="text-xl font-bold tracking-tight text-[#1c1c1e]">Diagnostic Assessment Report</h3>
            </div>
            <span className="miro-pill bg-[#c3faf5] text-[#187574] px-3 py-1 text-xs font-bold">
              ✓ Active & Saved
            </span>
          </div>

          {/* Core CBC Badges */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#e0e2e8] bg-[#fbfbfc] p-4 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8e91a0]">
                CBC Mastery Classification
              </span>
              <div className="mt-3">
                <span className={`miro-pill inline-block px-3.5 py-1.5 text-xs font-bold ${getMasteryBadge(analysis.overallGrade).classes}`}>
                  {getMasteryBadge(analysis.overallGrade).label}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-[#e0e2e8] bg-[#fbfbfc] p-4 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8e91a0]">
                Learning Trajectory & Momentum
              </span>
              <div className="mt-3">
                <span className={`miro-pill inline-block px-3.5 py-1.5 text-xs font-bold ${getTrendBadge(analysis.trend).classes}`}>
                  {getTrendBadge(analysis.trend).label}
                </span>
              </div>
            </div>
          </div>

          {/* Qualitative Synthesis Box */}
          {analysis.aiInsights && (
            <div className="rounded-2xl border border-amber-200 bg-[#fffdf0] p-5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8a5a09]">
                Diagnostic Evaluation Summary
              </span>
              <p className="mt-2 text-xs leading-6 text-[#66521d] font-medium">
                {analysis.aiInsights}
              </p>
            </div>
          )}

          {/* 3 Pillars Grid: Strengths, Areas for Growth, Recommendations */}
          <div className="grid gap-5 md:grid-cols-3 pt-2">
            {/* Strengths */}
            <div className="rounded-2xl border border-[#e0e2e8] bg-white p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
                  ✓
                </span>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#1c1c1e]">
                  Demonstrated Strengths
                </h4>
              </div>
              <ul className="space-y-2 text-xs text-[#555a6a]">
                {analysis.strengths?.map((s: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2 rounded-lg bg-emerald-50/60 p-2.5 text-emerald-950 font-medium">
                    <span className="text-emerald-700 font-bold">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Growth Priorities */}
            <div className="rounded-2xl border border-[#e0e2e8] bg-white p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-800">
                  !
                </span>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#1c1c1e]">
                  Targeted Support Needs
                </h4>
              </div>
              <ul className="space-y-2 text-xs text-[#555a6a]">
                {analysis.weaknesses?.map((w: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2 rounded-lg bg-amber-50/60 p-2.5 text-amber-950 font-medium">
                    <span className="text-amber-700 font-bold">•</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Actionable Directives */}
            <div className="rounded-2xl border border-[#e0e2e8] bg-white p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-800">
                  →
                </span>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#1c1c1e]">
                  Action Directives
                </h4>
              </div>
              <ul className="space-y-2 text-xs text-[#555a6a]">
                {analysis.recommendations?.map((r: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2 rounded-lg bg-blue-50/60 p-2.5 text-blue-950 font-medium">
                    <span className="font-mono text-[10px] font-bold text-blue-600 shrink-0">0{idx + 1}</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
