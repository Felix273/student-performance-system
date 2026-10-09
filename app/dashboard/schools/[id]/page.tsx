import { auth } from "@/lib/auth-config"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import SchoolProfileForm from "./SchoolProfileForm"

export default async function SchoolProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== "SUPER_ADMIN") redirect("/dashboard")

  const { id } = await params
  const school = await prisma.school.findUnique({
    where: { id },
    include: {
      _count: { select: { users: true, students: true, classes: true, curriculumOfferings: true, timetableEntries: true } },
    },
  })
  if (!school) notFound()

  const checks = [
    { label: "School administrator", complete: school._count.users > 0 },
    { label: "Classes", complete: school._count.classes > 0 },
    { label: "Curriculum", complete: school._count.curriculumOfferings > 0 },
    { label: "Timetable", complete: school._count.timetableEntries > 0 },
  ]
  const score = Math.round((checks.filter((check) => check.complete).length / checks.length) * 100)

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col gap-4 border-b border-[#e0e2e8] pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/dashboard/schools" className="text-xs font-semibold text-[#4262ff]">← Platform directory</Link>
          <p className="mt-6 text-[11px] font-bold uppercase tracking-[.2em] text-[#4262ff]">Platform profile</p>
          <h1 className="mt-2 text-4xl font-medium tracking-[-.055em] text-[#1c1c1e] sm:text-5xl">{school.name}</h1>
          <p className="mt-3 text-sm text-[#6b6f7e]">Aggregate onboarding view for <span className="font-mono">{school.domain}</span>. No learner or staff records are shown here.</p>
        </div>
        <span className={`miro-pill self-start px-4 py-2 text-xs font-semibold sm:self-auto ${score === 100 ? "bg-[#c3faf5] text-[#187574]" : "bg-[#fff4c4] text-[#746019]"}`}>{score === 100 ? "Ready" : `${score}% ready`}</span>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[['Users', school._count.users], ['Learners', school._count.students], ['Classes', school._count.classes], ['Curriculum', school._count.curriculumOfferings], ['Timetable entries', school._count.timetableEntries]].map(([label, value]) => <div key={label} className="miro-surface p-5"><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#8e91a0]">{label}</p><p className="mt-3 font-mono text-3xl font-medium text-[#1c1c1e]">{value}</p><p className="mt-1 text-xs text-[#8e91a0]">Aggregate only</p></div>)}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_.85fr]">
        <section className="miro-surface p-6 sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#8e91a0]">Tenant metadata</p>
          <h2 className="mt-2 text-2xl font-medium tracking-tight">Keep the school profile current.</h2>
          <p className="mt-2 text-sm leading-6 text-[#6b6f7e]">Update only platform identity fields. School operations remain inside the school administrator workspace.</p>
          <SchoolProfileForm school={{ id: school.id, name: school.name, domain: school.domain }} />
        </section>

        <aside className="miro-surface p-6 sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#8e91a0]">Onboarding health</p>
          <h2 className="mt-2 text-2xl font-medium tracking-tight">What still needs attention?</h2>
          <div className="mt-6 space-y-3">{checks.map((check, index) => <div key={check.label} className="flex items-center gap-3 rounded-2xl bg-[#fafbfc] px-4 py-3"><span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${check.complete ? "bg-[#c3faf5] text-[#187574]" : "bg-[#fff4c4] text-[#746019]"}`}>{check.complete ? "✓" : String(index + 1)}</span><span className="text-sm font-semibold text-[#1c1c1e]">{check.label}</span><span className="ml-auto text-xs font-semibold text-[#8e91a0]">{check.complete ? "Complete" : "Pending"}</span></div>)}</div>
          <Link href="/dashboard/schools" className="mt-6 inline-flex rounded-xl bg-[#1c1c1e] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2c2c34]">Back to directory →</Link>
        </aside>
      </section>
    </div>
  )
}
