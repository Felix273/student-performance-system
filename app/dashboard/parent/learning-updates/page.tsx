import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

type Snapshot = {
  planTitle?: string
  numericScore?: number | null
  maxScore?: number | null
  masteryLevel?: string | null
  narrative?: string | null
  learningOutcome?: { code?: string; statement?: string } | null
  competency?: { name?: string } | null
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
    <div className="space-y-8">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#8c7318]">Parent portal</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Learning updates</h1>
        <p className="mt-2 text-sm text-[#6b6f7e]">Official results shared by the school. Draft and review-stage evidence is intentionally excluded.</p>
      </header>
      {links.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#cfd5df] bg-[#fffdf5] p-12 text-center">
          <h2 className="text-xl font-semibold">No learners linked yet</h2>
          <p className="mt-2 text-sm text-[#6b6f7e]">Ask the school to link your parent account to a learner.</p>
        </div>
      ) : links.map(({ student }) => (
        <section key={student.id} className="rounded-3xl border border-[#e2e5eb] bg-white p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div><h2 className="text-2xl font-semibold">{student.name}</h2><p className="text-sm text-[#6b6f7e]">{student.class.name}</p></div>
            <span className="rounded-full bg-[#e7edff] px-3 py-1 text-xs font-bold text-[#4c5fa8]">{student.cbcEvidence.length} published updates</span>
          </div>
          {student.cbcEvidence.length === 0 ? <p className="mt-8 rounded-2xl bg-[#f5f7fb] p-5 text-sm text-[#6b6f7e]">Published learning evidence will appear here after school review.</p> : (
            <div className="mt-6 space-y-3">{student.cbcEvidence.map(evidence => {
              const snapshot = evidence.publishedSnapshot as Snapshot | null
              return <article key={evidence.id} className="rounded-2xl bg-[#fffdf5] p-5">
                <div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-semibold">{snapshot?.planTitle || evidence.assessmentPlan?.title || "Learning evidence"}</h3><p className="mt-1 text-xs text-[#8e91a0]">{evidence.publishedAt ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(evidence.publishedAt) : "Published"}{evidence.publishedVersion > 1 ? " · Corrected result" : ""}</p></div>{snapshot?.masteryLevel && <span className="rounded-full bg-[#ffd02f] px-3 py-1 text-xs font-bold">{snapshot.masteryLevel}</span>}</div>
                <div className="mt-4 grid gap-3 text-sm md:grid-cols-3"><p><span className="block text-[10px] font-bold uppercase text-[#8e91a0]">Score</span>{snapshot?.numericScore != null ? `${snapshot.numericScore}${snapshot.maxScore ? ` / ${snapshot.maxScore}` : ""}` : "Not scored"}</p><p><span className="block text-[10px] font-bold uppercase text-[#8e91a0]">Outcome</span>{snapshot?.learningOutcome?.statement || "Not linked"}</p><p><span className="block text-[10px] font-bold uppercase text-[#8e91a0]">Competency</span>{snapshot?.competency?.name || "Not linked"}</p></div>
                {snapshot?.narrative && <p className="mt-4 border-t border-[#ece8d7] pt-4 text-sm text-[#4e5361]">{snapshot.narrative}</p>}
              </article>
            })}</div>
          )}
        </section>
      ))}
    </div>
  )
}
