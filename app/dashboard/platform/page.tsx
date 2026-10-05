import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

export default async function PlatformOperationsPage() {
  const session = await auth()
  if (!session || session.user.role !== "SUPER_ADMIN") redirect("/dashboard")

  const schools = await prisma.school.findMany({
    include: {
      _count: { select: { users: true, students: true, classes: true, curriculumOfferings: true, timetableEntries: true } },
      users: { where: { role: "SCHOOL_ADMIN" }, select: { id: true } },
    },
    orderBy: { name: "asc" },
  })

  const health = schools.map((school) => ({
    ...school,
    ready: school.users.length > 0 && school._count.classes > 0 && school._count.curriculumOfferings > 0,
    signals: [
      ["School admin", school.users.length > 0],
      ["Classes", school._count.classes > 0],
      ["Curriculum", school._count.curriculumOfferings > 0],
      ["Timetable", school._count.timetableEntries > 0],
    ] as [string, boolean][],
  }))
  const ready = health.filter((school) => school.ready).length
  const needsSetup = health.length - ready

  return <div className="space-y-10 animate-fade-in">
    <section className="relative overflow-hidden rounded-[28px] bg-[#1c1c1e] px-7 py-10 text-white sm:px-12 sm:py-14">
      <div className="absolute -right-12 -top-20 h-72 w-72 rounded-full border-[34px] border-[#ffd02f]/25" />
      <div className="relative max-w-3xl"><p className="mb-4 text-[11px] font-bold uppercase tracking-[.2em] text-[#ffd02f]">Platform operations</p><h1 className="text-4xl font-medium leading-[1.05] tracking-[-.055em] sm:text-6xl">Keep every school ready.</h1><p className="mt-5 max-w-xl text-base leading-7 text-[#a5a8b5]">A platform-level view of onboarding and configuration health. No learner, teacher, parent, assessment, or finance records are exposed here.</p></div>
    </section>

    <section className="grid gap-3 sm:grid-cols-3"><div className="rounded-[20px] bg-[#e7edff] p-5"><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#4262ff]">Schools</p><p className="mt-4 font-mono text-4xl font-medium text-[#4262ff]">{schools.length}</p><p className="mt-2 text-xs text-[#555a6a]">Registered platforms</p></div><div className="rounded-[20px] bg-[#c3faf5] p-5"><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#187574]">Ready</p><p className="mt-4 font-mono text-4xl font-medium text-[#187574]">{ready}</p><p className="mt-2 text-xs text-[#555a6a]">Core setup complete</p></div><div className="rounded-[20px] bg-[#fff4c4] p-5"><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#746019]">Needs setup</p><p className="mt-4 font-mono text-4xl font-medium text-[#746019]">{needsSetup}</p><p className="mt-2 text-xs text-[#555a6a]">Requires attention</p></div></section>

    <section className="miro-surface overflow-hidden"><div className="flex items-center justify-between border-b border-[#eef0f3] px-6 py-5 sm:px-8"><div><p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#8e91a0]">School health</p><h2 className="mt-2 text-2xl font-medium tracking-tight">Configuration readiness</h2></div><Link href="/dashboard/schools/new" className="miro-pill bg-[#1c1c1e] px-4 py-2.5 text-xs font-medium text-white">Add school +</Link></div>{schools.length ? <div className="divide-y divide-[#eef0f3]">{health.map((school) => <div key={school.id} className="grid gap-5 px-6 py-6 sm:grid-cols-[minmax(220px,1.2fr)_1fr_auto] sm:items-center sm:px-8"><div><p className="text-sm font-semibold text-[#1c1c1e]">{school.name}</p><p className="mt-1 text-xs text-[#8e91a0]">{school.domain}</p></div><div className="flex flex-wrap gap-2">{school.signals.map(([label, complete]) => <span key={label} className={`miro-pill px-3 py-1.5 text-[11px] font-medium ${complete ? "bg-[#c3faf5] text-[#187574]" : "bg-[#fff4c4] text-[#746019]"}`}>{complete ? "✓" : "○"} {label}</span>)}</div><span className={`miro-pill justify-self-start px-3 py-1.5 text-xs font-semibold sm:justify-self-end ${school.ready ? "bg-[#c3faf5] text-[#187574]" : "bg-[#fff4c4] text-[#746019]"}`}>{school.ready ? "Ready" : "Needs setup"}</span></div>)}</div> : <div className="px-6 py-16 text-center"><p className="text-lg font-medium">No schools registered.</p><p className="mt-2 text-sm text-[#8e91a0]">Create the first school to begin platform onboarding.</p></div>}</section>
  </div>
}
