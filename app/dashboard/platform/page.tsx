import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { loadReadinessPeopleCounts, scoreReadiness } from "@/lib/platform/readiness"
import { loadWeeklyPlatformMetrics } from "@/lib/platform/metrics"
import { isEmailDeliveryConfigured } from "@/lib/email/emailService"
import OperationsTrendChart from "./OperationsTrendChart"
import SystemHealthPanel from "./SystemHealthPanel"

export default async function PlatformOperationsPage() {
  const session = await auth()
  if (!session || session.user.role !== "SUPER_ADMIN") redirect("/dashboard")

  const schools = await prisma.school.findMany({
    include: {
      _count: { select: { users: true, students: true, classes: true, subjects: true, academicYears: true, curriculumOfferings: true, timetableEntries: true } },
    },
    orderBy: { name: "asc" },
  })
  const [peopleCounts, weeklyMetrics] = await Promise.all([
    loadReadinessPeopleCounts(schools.map((school) => school.id)),
    loadWeeklyPlatformMetrics(),
  ])

  const health = schools.map((school) => {
    const { checks, score, ready } = scoreReadiness({ ...peopleCounts.get(school.id)!, academicYears: school._count.academicYears, classes: school._count.classes, subjects: school._count.subjects, curriculum: school._count.curriculumOfferings, timetable: school._count.timetableEntries })
    const signals = checks.map((check) => [check.label, check.complete] as [string, boolean])
    return { ...school, signals, score, ready }
  })
  const activeSchools = health.filter((school) => school.status === "ACTIVE")
  const ready = activeSchools.filter((school) => school.ready).length
  const needsSetup = activeSchools.length - ready
  const averageReadiness = activeSchools.length ? Math.round(activeSchools.reduce((sum, school) => sum + school.score, 0) / activeSchools.length) : 0
  const totalLearners = schools.reduce((sum, school) => sum + school._count.students, 0)
  const totalClasses = schools.reduce((sum, school) => sum + school._count.classes, 0)
  const nextSchool = health.find((school) => !school.ready && school.status === "ACTIVE")
  const stalledCutoff = Date.now() - 14 * 24 * 60 * 60 * 1000
  const stalledSchools = health.filter((school) => !school.ready && school.status === "ACTIVE" && school.createdAt.getTime() < stalledCutoff)
  let databaseHealthy = false
  try {
    await prisma.$queryRaw`SELECT 1`
    databaseHealthy = true
  } catch {
    databaseHealthy = false
  }
  const systemHealth = {
    database: databaseHealthy,
    email: isEmailDeliveryConfigured(),
    ai: Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local",
    deployment: process.env.VERCEL_DEPLOYMENT_ID?.slice(-12) || "local",
  }
  const readinessLabels = ["School administrator", "Administrator signed in", "Academic year", "Classes", "Subjects", "Teachers assigned", "Curriculum", "Timetable"]

  return <div className="space-y-8 animate-fade-in">
    <section className="relative overflow-hidden rounded-[28px] bg-[#1c1c1e] px-7 py-9 text-white sm:px-10 sm:py-11">
      <div className="absolute -right-20 -top-28 h-80 w-80 rounded-full border-[36px] border-[#ffd02f]/20" />
      <div className="absolute -bottom-28 right-40 h-64 w-64 rounded-full bg-[#4262ff]/20 blur-3xl" />
      <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
        <div className="max-w-2xl"><p className="mb-4 text-[11px] font-bold uppercase tracking-[.2em] text-[#ffd02f]">Platform operations</p><h1 className="text-4xl font-medium leading-[1.05] tracking-[-.055em] sm:text-6xl">Keep every school ready.</h1><p className="mt-5 max-w-xl text-sm leading-7 text-[#c7cad5]">A platform-level command center for onboarding and configuration health. This view uses aggregate signals only—no learner, teacher, parent, assessment, or finance records.</p></div>
        <div className="flex flex-wrap gap-3"><Link href="/dashboard/schools" className="miro-pill bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20">Open directory →</Link><Link href="/dashboard/schools/new" className="miro-pill bg-[#ffd02f] px-4 py-2.5 text-sm font-semibold text-[#1c1c1e] transition hover:bg-[#ffe477]">Add school +</Link></div>
      </div>
    </section>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <div className="rounded-[20px] bg-[#e7edff] p-5"><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#4262ff]">Schools</p><p className="mt-4 font-mono text-4xl font-medium text-[#4262ff]">{schools.length}</p><p className="mt-2 text-xs text-[#555a6a]">Registered platforms</p></div>
      <div className="rounded-[20px] bg-[#c3faf5] p-5"><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#187574]">Ready</p><p className="mt-4 font-mono text-4xl font-medium text-[#187574]">{ready}</p><p className="mt-2 text-xs text-[#555a6a]">Core setup complete</p></div>
      <div className="rounded-[20px] bg-[#fff4c4] p-5"><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#746019]">Attention</p><p className="mt-4 font-mono text-4xl font-medium text-[#746019]">{needsSetup}</p><p className="mt-2 text-xs text-[#555a6a]">Requires onboarding</p></div>
      <div className="rounded-[20px] bg-[#f2e9ff] p-5"><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#6f35c8]">Readiness</p><p className="mt-4 font-mono text-4xl font-medium text-[#6f35c8]">{averageReadiness}%</p><p className="mt-2 text-xs text-[#555a6a]">Portfolio average</p></div>
      <div className="rounded-[20px] bg-[#f7f8fa] p-5"><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#6b6f7e]">Footprint</p><p className="mt-4 font-mono text-3xl font-medium text-[#1c1c1e]">{totalLearners.toLocaleString()}</p><p className="mt-2 text-xs text-[#555a6a]">Learners · {totalClasses} classes</p></div>
    </section>

    <section className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
      <section className="miro-surface p-6 sm:p-8"><div><p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#8e91a0]">Platform activity</p><h2 className="mt-2 text-2xl font-medium tracking-tight">A 12-week operating view</h2><p className="mt-2 text-sm text-[#6b6f7e]">Weekly school creation and aggregate audited platform actions.</p></div><div className="mt-5"><OperationsTrendChart data={weeklyMetrics} /></div></section>
      <SystemHealthPanel health={systemHealth} />
    </section>

    <section className="miro-surface overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#eef0f3] px-6 py-5 sm:px-8"><div><p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#8e91a0]">Follow-up queue</p><h2 className="mt-2 text-2xl font-medium tracking-tight">Stalled onboarding</h2><p className="mt-2 text-sm text-[#6b6f7e]">Active schools created more than 14 days ago that still have incomplete setup.</p></div><span className="rounded-full bg-[#fff4c4] px-3 py-1.5 text-xs font-semibold text-[#746019]">{stalledSchools.length} schools</span></div>
      {stalledSchools.length ? <div className="divide-y divide-[#eef0f3]">{stalledSchools.map((school) => <div key={school.id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 sm:px-8"><div><Link href={`/dashboard/schools/${school.id}`} className="text-sm font-semibold text-[#1c1c1e] hover:text-[#4262ff]">{school.name}</Link><p className="mt-1 text-xs text-[#8e91a0]">Created {school.createdAt.toLocaleDateString()} · {school.score}% ready</p></div><div className="flex flex-wrap gap-2">{school.signals.filter(([, complete]) => !complete).map(([label]) => <span key={label} className="rounded-full bg-[#f7f8fa] px-2.5 py-1 text-[11px] text-[#6b6f7e]">{label}</span>)}</div></div>)}</div> : <p className="px-6 py-8 text-sm text-[#6b6f7e]">No active schools are stalled beyond 14 days.</p>}
    </section>

    <section className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
      <section className="miro-surface overflow-hidden"><div className="flex items-center justify-between border-b border-[#eef0f3] px-6 py-5 sm:px-8"><div><p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#8e91a0]">School health</p><h2 className="mt-2 text-2xl font-medium tracking-tight">Configuration readiness</h2></div><Link href="/dashboard/schools" className="text-sm font-semibold text-[#4262ff]">View directory →</Link></div>{schools.length ? <div className="divide-y divide-[#eef0f3]">{health.map((school) => <div key={school.id} className="grid gap-5 px-6 py-6 sm:grid-cols-[minmax(200px,1.1fr)_1fr_auto] sm:items-center sm:px-8"><div><p className="text-sm font-semibold text-[#1c1c1e]">{school.name}</p><p className="mt-1 text-xs text-[#8e91a0]">{school.domain}</p></div><div><div className="mb-2 flex flex-wrap gap-2">{school.signals.map(([label, complete]) => <span key={label} className={`miro-pill px-3 py-1.5 text-[11px] font-medium ${complete ? "bg-[#c3faf5] text-[#187574]" : "bg-[#fff4c4] text-[#746019]"}`}>{complete ? "✓" : "○"} {label}</span>)}</div><div className="h-1.5 overflow-hidden rounded-full bg-[#eef0f3]"><div className={`h-full rounded-full ${school.ready ? "bg-[#62c6bc]" : "bg-[#ffd02f]"}`} style={{ width: `${school.score}%` }} /></div></div><span className={`miro-pill justify-self-start px-3 py-1.5 text-xs font-semibold sm:justify-self-end ${school.ready ? "bg-[#c3faf5] text-[#187574]" : "bg-[#fff4c4] text-[#746019]"}`}>{school.ready ? "Ready" : `${school.score}% ready`}</span></div>)}</div> : <div className="px-6 py-16 text-center"><p className="text-lg font-medium">No schools registered.</p><p className="mt-2 text-sm text-[#8e91a0]">Create the first school to begin platform onboarding.</p></div>}</section>

      <aside className="space-y-5"><section className="rounded-[24px] bg-[#ffd02f] p-6"><p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#746019]">Next best action</p>{nextSchool ? <><h2 className="mt-4 text-2xl font-medium tracking-tight text-[#1c1c1e]">Finish onboarding {nextSchool.name}.</h2><p className="mt-3 text-sm leading-6 text-[#5c501a]">This school is at {nextSchool.score}% readiness. Review its missing setup signals with the school administrator.</p><Link href={`/dashboard/schools/${nextSchool.id}`} className="mt-6 inline-flex rounded-xl bg-[#1c1c1e] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2c2c34]">Open school profile →</Link></> : <><h2 className="mt-4 text-2xl font-medium tracking-tight text-[#1c1c1e]">Your active portfolio is ready.</h2><p className="mt-3 text-sm leading-6 text-[#5c501a]">All active schools have passed the onboarding checks.</p><Link href="/dashboard/schools/new" className="mt-6 inline-flex rounded-xl bg-[#1c1c1e] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2c2c34]">Add another school →</Link></>}</section><section className="miro-surface p-6"><p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#8e91a0]">Readiness checks</p><div className="mt-5 space-y-3">{readinessLabels.map((label, index) => <div key={label} className="flex gap-3"><span className="font-mono text-xs text-[#4262ff]">{String(index + 1).padStart(2, "0")}</span><p className="text-sm font-semibold text-[#1c1c1e]">{label}</p></div>)}</div></section></aside>
    </section>
  </div>
}
