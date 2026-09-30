import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

function Arrow() {
  return <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="h-4 w-4"><path d="M3.5 8h8.5M8.5 4.5 12 8l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function Icon({ name }: { name: "plan" | "competency" | "assessment" | "students" | "calendar" }) {
  const paths = {
    plan: <><path d="M5 3.5h8l2 2v9H5z" /><path d="M8 8h4M8 11h4M8 5.5v1" /></>,
    competency: <><path d="M4 15V9M8 15V5M12 15V7M16 15V3" /><path d="M3 15h14" /></>,
    assessment: <><path d="M4 4h12v12H4z" /><path d="m7 10 2 2 4-4" /></>,
    students: <><circle cx="9" cy="8" r="2.5" /><path d="M4 16c.6-2.5 2.2-3.8 5-3.8s4.4 1.3 5 3.8M15 6.5a2.5 2.5 0 0 1 0 4.7M15 12.5c1.8.5 2.8 1.6 3.2 3.5" /></>,
    calendar: <><rect x="3" y="4.5" width="14" height="12" rx="1.5" /><path d="M6 3v3M14 3v3M3 8h14M6 11h2M10 11h2M6 14h2" /></>,
  }
  return <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">{paths[name]}</svg>
}

export default async function TeacherDashboardPage() {
  const session = await auth()
  if (!session || session.user.role !== "TEACHER") redirect("/dashboard")

  const teacherClasses = await prisma.teacherClass.findMany({
    where: { teacherId: session.user.id },
    include: { class: { include: { _count: { select: { students: true, assessments: true } } } }, subject: true },
    orderBy: [{ class: { name: "asc" } }, { subject: { name: "asc" } }],
  })
  const classIds = [...new Set(teacherClasses.map((tc) => tc.classId))]
  const recentAssessments = await prisma.assessment.findMany({
    where: { classId: { in: classIds } },
    include: { class: true, subject: true, _count: { select: { results: true } } },
    orderBy: { date: "desc" }, take: 5,
  })
  const classes = [...new Map(teacherClasses.map((item) => [item.classId, item.class])).values()]
  const totalStudents = classes.reduce((sum, item) => sum + item._count.students, 0)
  const totalAssessments = classes.reduce((sum, item) => sum + item._count.assessments, 0)
  const today = new Date()
  const greeting = today.getHours() < 12 ? "Good morning" : today.getHours() < 17 ? "Good afternoon" : "Good evening"
  const dateLabel = today.toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long" })

  return (
    <div className="space-y-7 pb-8">
      <section className="relative overflow-hidden rounded-[30px] bg-[#c8faf5] px-6 py-8 sm:px-10 sm:py-10">
        <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full border-[38px] border-[#82ddd6] opacity-80" />
        <div className="absolute bottom-[-85px] right-[23%] h-40 w-40 rounded-full bg-[#f9c5b8] opacity-70" />
        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.2em] text-[#187574]"><span className="h-2 w-2 rounded-full bg-[#e9775c]" /> Teacher workspace</div>
            <h1 className="max-w-xl text-[clamp(2.5rem,6vw,4.7rem)] font-medium leading-[.95] tracking-[-.07em] text-[#1c1c1e]">{greeting}, {session.user.name?.split(" ")[0] || "teacher"}.</h1>
            <p className="mt-5 max-w-lg text-sm leading-6 text-[#397e7b]">{dateLabel}. Keep your classes moving with one focused view of lessons, learners, and assessment work.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/timetable" className="miro-pill inline-flex items-center gap-2 bg-[#1c1c1e] px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5">Open timetable <Arrow /></Link>
            <Link href="/dashboard/teacher/assessment-plans" className="miro-pill inline-flex items-center gap-2 border border-[#78cbc5] bg-white/50 px-4 py-3 text-sm font-semibold text-[#1c1c1e] transition hover:-translate-y-0.5">Plan evidence <Arrow /></Link>
          </div>
        </div>
      </section>

      <section aria-label="Teaching overview" className="grid gap-4 sm:grid-cols-3">
        <div className="miro-surface bg-[#fff4c4] p-5"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#806c1d]">Classes</p><div className="mt-5 flex items-end justify-between"><strong className="text-4xl font-medium tracking-[-.06em]">{classes.length}</strong><span className="text-right text-xs text-[#806c1d]">active<br />this term</span></div></div>
        <div className="miro-surface bg-[#f7d9d1] p-5"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#925445]">Learners</p><div className="mt-5 flex items-end justify-between"><strong className="text-4xl font-medium tracking-[-.06em]">{totalStudents}</strong><span className="text-right text-xs text-[#925445]">across your<br />classes</span></div></div>
        <div className="miro-surface bg-[#e4ddff] p-5"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#655493]">Assessment activity</p><div className="mt-5 flex items-end justify-between"><strong className="text-4xl font-medium tracking-[-.06em]">{totalAssessments}</strong><span className="text-right text-xs text-[#655493]">items<br />created</span></div></div>
      </section>

      <div className="grid gap-7 xl:grid-cols-[1.35fr_.65fr]">
        <section className="miro-surface overflow-hidden">
          <div className="flex items-end justify-between border-b border-[#ececf0] px-6 py-5 sm:px-7"><div><p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#8e91a0]">Your teaching load</p><h2 className="mt-1 text-2xl font-medium tracking-[-.04em]">My classes</h2></div><Link href="/dashboard/students" className="text-xs font-bold text-[#187574] hover:underline">View students <span aria-hidden="true">↗</span></Link></div>
          {classes.length > 0 ? <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">{classes.map((item, index) => { const subjects = teacherClasses.filter((tc) => tc.classId === item.id).map((tc) => tc.subject?.name || "All subjects"); return <Link key={item.id} href={`/dashboard/attendance/${item.id}`} className="group rounded-2xl border border-[#ececf0] bg-[#fcfcfd] p-5 transition hover:-translate-y-0.5 hover:border-[#6fc9c2] hover:bg-[#f4fffd]"><div className="flex items-start justify-between gap-3"><span className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${index % 3 === 0 ? "bg-[#c8faf5] text-[#187574]" : index % 3 === 1 ? "bg-[#f7d9d1] text-[#925445]" : "bg-[#e4ddff] text-[#655493]"}`}>{item.name.slice(0, 2).toUpperCase()}</span><Arrow /></div><h3 className="mt-5 text-lg font-semibold tracking-[-.02em]">{item.name}</h3><p className="mt-1 truncate text-xs text-[#8e91a0]">{subjects.join(" · ")}</p><div className="mt-5 flex items-center justify-between text-xs"><span className="font-semibold text-[#1c1c1e]">{item._count.students} learners</span><span className="text-[#8e91a0]">{item._count.assessments} assessments</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e8e9ed]"><div className="h-full w-2/3 rounded-full bg-[#62c6bc]" /></div></Link> })}</div> : <div className="px-7 py-14 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff4c4] text-[#806c1d]"><Icon name="students" /></div><h3 className="mt-4 font-semibold">No classes assigned yet</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#8e91a0]">Your school administrator needs to link you to a class before it appears here.</p><Link href="/dashboard/timetable" className="mt-5 inline-flex text-sm font-bold text-[#187574] hover:underline">Check timetable access ↗</Link></div>}
        </section>

        <section className="miro-surface overflow-hidden">
          <div className="border-b border-[#ececf0] px-6 py-5"><p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#8e91a0]">Keep momentum</p><h2 className="mt-1 text-2xl font-medium tracking-[-.04em]">Shortcuts</h2></div>
          <div className="divide-y divide-[#ececf0]">{([ ["plan", "Assessment plans", "Capture evidence", "/dashboard/teacher/assessment-plans"], ["competency", "Class competency", "Spot support needs", "/dashboard/teacher/competency"], ["assessment", "Create assessment", "Add new work", "/dashboard/assessments/new"], ["calendar", "My timetable", "See this week", "/dashboard/timetable"]] as const).map(([icon, title, detail, href]) => <Link key={href} href={href} className="group flex items-center gap-4 px-6 py-4 transition hover:bg-[#fafbfc]"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f2f3f5] text-[#187574] transition group-hover:bg-[#c8faf5]"><Icon name={icon} /></span><span className="min-w-0 flex-1"><strong className="block text-sm font-semibold">{title}</strong><small className="mt-0.5 block text-xs text-[#8e91a0]">{detail}</small></span><Arrow /></Link>)}</div>
        </section>
      </div>

      <section className="miro-surface overflow-hidden">
        <div className="flex items-end justify-between border-b border-[#ececf0] px-6 py-5 sm:px-7"><div><p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#8e91a0]">Latest work</p><h2 className="mt-1 text-2xl font-medium tracking-[-.04em]">Recent assessments</h2></div><Link href="/dashboard/assessments" className="text-xs font-bold text-[#187574] hover:underline">All assessments <span aria-hidden="true">↗</span></Link></div>
        {recentAssessments.length > 0 ? <div className="divide-y divide-[#ececf0]">{recentAssessments.map((assessment) => <div key={assessment.id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7"><div className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e4ddff] text-[#655493]"><Icon name="assessment" /></span><div className="min-w-0"><p className="truncate text-sm font-semibold">{assessment.title}</p><p className="mt-0.5 text-xs text-[#8e91a0]">{assessment.class.name} · {assessment.subject.name} · {new Date(assessment.date).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}</p></div></div><div className="flex items-center gap-5 pl-12 sm:pl-0"><span className="text-xs text-[#8e91a0]">{assessment._count.results} results recorded</span><Link href={`/dashboard/assessments/${assessment.id}/record`} className="inline-flex items-center gap-1 text-xs font-bold text-[#187574] hover:underline">Record scores <Arrow /></Link></div></div>)}</div> : <div className="px-7 py-12 text-center text-sm text-[#8e91a0]">Your recent assessments will appear here once you create one.</div>}
      </section>
    </div>
  )
}
