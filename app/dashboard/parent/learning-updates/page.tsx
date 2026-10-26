import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export const metadata = {
  title: "CBC Learning Updates | Fentech StudentOS",
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

  if (code === "EE" || code.includes("EXCEEDING")) {
    return {
      label: "EE · Exceeding Expectations",
      classes: "bg-[#c3faf5] text-[#187574] border border-[#7bbdb5]",
    }
  }
  if (code === "ME" || code.includes("MEETING")) {
    return {
      label: "ME · Meeting Expectations",
      classes: "bg-[#e7edff] text-[#4262ff] border border-[#b5c7ff]",
    }
  }
  if (code === "AE" || code.includes("APPROACHING")) {
    return {
      label: "AE · Approaching Expectations",
      classes: "bg-[#fff4c4] text-[#746019] border border-[#d7c66c]",
    }
  }
  if (code === "BE" || code.includes("BELOW")) {
    return {
      label: "BE · Below Expectations",
      classes: "bg-[#ffe3e3] text-[#a33a3a] border border-[#f5b3b3]",
    }
  }

  return {
    label: code,
    classes: "bg-slate-100 text-slate-700 border border-slate-200",
  }
}

export default async function ParentLearningUpdatesPage() {
  const session = await auth()
  if (!session || session.user.role !== "PARENT") redirect("/dashboard")

  const links = await prisma.parentStudent.findMany({
    where: { parentId: session.user.id },
    select: {
      student: {
        select: {
          id: true,
          name: true,
          class: { select: { name: true } },
          cbcEvidence: {
            where: { status: "PUBLISHED" },
            orderBy: { publishedAt: "desc" },
            take: 20,
            select: {
              id: true,
              publishedVersion: true,
              publishedAt: true,
              publishedSnapshot: true,
              assessmentPlan: { select: { title: true, date: true } },
            },
          },
        },
      },
    },
  })

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="border-b border-[#e0e2e8] pb-6">
        <p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#8c7318]">
          Parent & Guardian Portal
        </p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight text-[#1c1c1e] sm:text-4xl">
          CBC Learning Updates
        </h1>
        <p className="mt-1 text-sm text-[#6b6f7e]">
          Official learning updates and competency assessments reviewed and published by your child&apos;s teachers.
        </p>
      </header>

      {/* CBC Parent Guide Banner */}
      <section className="rounded-2xl border border-[#e0e2e8] bg-[#fbfbfc] p-5 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#4f5664]">
          Understanding Kenya CBC Mastery Bands
        </h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          <div className="rounded-xl border border-[#7bbdb5] bg-[#c3faf5] p-3">
            <strong className="block text-[#187574]">EE · Exceeding Expectations</strong>
            <span className="text-[11px] text-[#2c6e6d] mt-0.5 block">Learner demonstrates advanced mastery beyond the grade outcome.</span>
          </div>
          <div className="rounded-xl border border-[#b5c7ff] bg-[#e7edff] p-3">
            <strong className="block text-[#4262ff]">ME · Meeting Expectations</strong>
            <span className="text-[11px] text-[#5263a6] mt-0.5 block">Learner successfully meets all criteria required for this level.</span>
          </div>
          <div className="rounded-xl border border-[#d7c66c] bg-[#fff4c4] p-3">
            <strong className="block text-[#746019]">AE · Approaching Expectations</strong>
            <span className="text-[11px] text-[#635114] mt-0.5 block">Learner is progressing but requires practice in specific areas.</span>
          </div>
          <div className="rounded-xl border border-[#f5b3b3] bg-[#ffe3e3] p-3">
            <strong className="block text-[#a33a3a]">BE · Below Expectations</strong>
            <span className="text-[11px] text-[#7a2828] mt-0.5 block">Learner needs focused teacher intervention and support.</span>
          </div>
        </div>
      </section>

      {links.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#cfd5df] bg-[#fffdf5] p-12 text-center">
          <h2 className="text-xl font-semibold">No learners linked yet</h2>
          <p className="mt-2 text-sm text-[#6b6f7e]">Contact your school administrator to link your account.</p>
        </div>
      ) : (
        links.map(({ student }) => (
          <section key={student.id} className="rounded-3xl border border-[#e2e5eb] bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[#eef0f3] pb-4">
              <div>
                <h2 className="text-2xl font-bold text-[#1c1c1e]">{student.name}</h2>
                <p className="text-xs text-[#6b6f7e]">{student.class.name}</p>
              </div>
              <span className="miro-pill bg-[#e7edff] px-3 py-1 text-xs font-bold text-[#4262ff]">
                {student.cbcEvidence.length} Published Updates
              </span>
            </div>

            {student.cbcEvidence.length === 0 ? (
              <p className="mt-6 rounded-2xl bg-[#f5f7fb] p-6 text-center text-sm text-[#6b6f7e]">
                No published learning evidence has been shared for this learner yet.
              </p>
            ) : (
              <div className="mt-6 space-y-4">
                {student.cbcEvidence.map((evidence) => {
                  const snapshot = evidence.publishedSnapshot as Snapshot | null
                  const badge = getMasteryBadge(snapshot?.masteryLevel)

                  return (
                    <article
                      key={evidence.id}
                      className="rounded-2xl border border-[#e0e2e8] bg-[#fffdf8] p-5 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f0ece1] pb-3">
                        <div>
                          <h3 className="font-bold text-base text-[#1c1c1e]">
                            {snapshot?.planTitle || evidence.assessmentPlan?.title || "CBC Evaluation Task"}
                          </h3>
                          <p className="text-[11px] text-[#8e91a0]">
                            Published on{" "}
                            {evidence.publishedAt
                              ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(
                                  evidence.publishedAt
                                )
                              : "Recently"}
                            {evidence.publishedVersion > 1 ? " · (Corrected result)" : ""}
                          </p>
                        </div>

                        {badge && (
                          <span className={`miro-pill px-3 py-1 text-xs font-bold ${badge.classes}`}>
                            {badge.label}
                          </span>
                        )}
                      </div>

                      {/* Criteria & Competencies */}
                      <div className="grid gap-3 text-xs md:grid-cols-3">
                        <div className="rounded-xl bg-white p-3 border border-[#ede9df]">
                          <span className="block text-[10px] font-bold uppercase text-[#8e91a0]">
                            Learning Outcome
                          </span>
                          <p className="mt-1 font-medium text-[#1c1c1e]">
                            {snapshot?.learningOutcome?.statement || "Core Outcome"}
                          </p>
                        </div>

                        <div className="rounded-xl bg-white p-3 border border-[#ede9df]">
                          <span className="block text-[10px] font-bold uppercase text-[#8e91a0]">
                            Competency
                          </span>
                          <p className="mt-1 font-medium text-[#1c1c1e]">
                            {snapshot?.competency?.name || "General Competency"}
                          </p>
                        </div>

                        <div className="rounded-xl bg-white p-3 border border-[#ede9df]">
                          <span className="block text-[10px] font-bold uppercase text-[#8e91a0]">
                            Score / Performance
                          </span>
                          <p className="mt-1 font-mono font-bold text-[#1c1c1e]">
                            {snapshot?.numericScore != null
                              ? `${snapshot.numericScore}${snapshot.maxScore ? ` / ${snapshot.maxScore}` : ""}`
                              : "Competency Assessed"}
                          </p>
                        </div>
                      </div>

                      {/* Qualitative Teacher Remarks */}
                      {snapshot?.narrative && (
                        <div className="rounded-xl bg-[#fff8e5] p-3.5 border border-amber-200">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8a5a09]">
                            Teacher Observation & Remarks
                          </span>
                          <p className="mt-1 text-xs leading-5 text-[#5e410b]">
                            &ldquo;{snapshot.narrative}&rdquo;
                          </p>
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        ))
      )}
    </div>
  )
}
