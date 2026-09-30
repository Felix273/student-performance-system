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

const quickActions = [
  { icon: "calendar", label: "Take attendance", detail: "Start with one of your classes", href: "/dashboard/attendance", number: "01", tone: "bg-[#e5f7f3] text-[#187574]" },
  { icon: "plan", label: "Plan evidence", detail: "Organize assessment evidence", href: "/dashboard/teacher/assessment-plans", number: "02", tone: "bg-[#eee9ff] text-[#655493]" },
  { icon: "competency", label: "Class competency", detail: "Spot learning support needs", href: "/dashboard/teacher/competency", number: "03", tone: "bg-[#fff1d7] text-[#8a6418]" },
  { icon: "assessment", label: "Create assessment", detail: "Set up work for your class", href: "/dashboard/assessments/new", number: "04", tone: "bg-[#e7edff] text-[#4262ff]" },
] as const

const cardAccents = ["bg-[#62c6bc]", "bg-[#f2a48f]", "bg-[#9a84d5]", "bg-[#f0bf59]"]

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
    include: {
      class: { include: { _count: { select: { students: true } } } },
      subject: true,
      _count: { select: { results: true } },
    },
    orderBy: { date: "desc" },
    take: 5,
  })
  const classes = [...new Map(teacherClasses.map((item) => [item.classId, item.class])).values()]
  const totalStudents = classes.reduce((sum, item) => sum + item._count.students, 0)
  const totalAssessments = classes.reduce((sum, item) => sum + item._count.assessments, 0)
  const totalSubjects = new Set(teacherClasses.flatMap((item) => item.subject?.name ? [item.subject.name] : [])).size
  const subjectsByClass = new Map<string, Set<string>>()
  teacherClasses.forEach((assignment) => {
    if (!assignment.subject?.name) return
    const subjects = subjectsByClass.get(assignment.classId) ?? new Set<string>()
    subjects.add(assignment.subject.name)
    subjectsByClass.set(assignment.classId, subjects)
  })
  const today = new Date()
  const greeting = today.getHours() < 12 ? "Good morning" : today.getHours() < 17 ? "Good afternoon" : "Good evening"
  const dateLabel = today.toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long" })
  const firstName = session.user.name?.split(" ")[0] || "teacher"

  const overview = [
    { label: "Classes", value: classes.length, detail: "in your teaching load", icon: "students", tone: "bg-[#e5f7f3] text-[#187574]" },
    { label: "Learners", value: totalStudents, detail: "across your classes", icon: "students", tone: "bg-[#fff0eb] text-[#a35543]" },
    { label: "Subjects", value: totalSubjects, detail: "assigned to you", icon: "competency", tone: "bg-[#eee9ff] text-[#655493]" },
    { label: "Assessments", value: totalAssessments, detail: "in your assigned classes", icon: "assessment", tone: "bg-[#fff4d9] text-[#80651c]" },
  ] as const

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <section className="relative isolate overflow-hidden rounded-[28px] border border-[#d8f0ec] bg-[#e9f8f5] px-6 py-7 shadow-[0_18px_50px_rgba(29,91,84,.07)] sm:px-9 sm:py-9">
        <div aria-hidden="true" className="absolute -right-20 -top-28 h-72 w-72 rounded-full border-[38px] border-[#a5e2da]/70" />
        <div aria-hidden="true" className="absolute -bottom-24 right-[27%] h-48 w-48 rounded-full bg-[#f7d9d1]/75" />
        <div className="relative z-10 flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#a8ded6] bg-white/65 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-[#187574]"><span className="h-2 w-2 rounded-full bg-[#e9775c]" /> Teacher workspace</div>
            <h1 className="max-w-2xl text-[clamp(2.4rem,5.8vw,4.4rem)] font-semibold leading-[.97] tracking-[-.065em] text-[#152526]">{greeting}, {firstName}.</h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-[#496c69] sm:text-base">A clear view of your classes, learners, and assessment work—so you can focus on the next useful step.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/dashboard/timetable" className="miro-pill inline-flex items-center gap-2 bg-[#173b3b] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#225151] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173b3b]">Open timetable <Arrow /></Link>
              <Link href="/dashboard/teacher/assessment-plans" className="miro-pill inline-flex items-center gap-2 border border-[#9ccfc8] bg-white/70 px-4 py-3 text-sm font-semibold text-[#173b3b] transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173b3b]">Plan evidence <Arrow /></Link>
            </div>
          </div>
          <div className="relative w-full max-w-sm rounded-[22px] border border-white/70 bg-white/75 p-5 shadow-[0_12px_30px_rgba(24,69,65,.08)] backdrop-blur-sm xl:mb-1">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#8e91a0]">Today</p><p className="mt-2 text-lg font-semibold tracking-tight text-[#1c1c1e]">{dateLabel}</p></div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e5f7f3] text-[#187574]"><Icon name="calendar" /></span>
            </div>
            <div className="mt-5 border-t border-[#edf0f0] pt-4">
              <p className="text-sm font-semibold text-[#1c1c1e]">Your day, in one place</p>
              <p className="mt-1 text-xs leading-5 text-[#747b86]">Check the timetable, take attendance, or capture evidence as learning happens.</p>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Teaching overview">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#8e91a0]">At a glance</p><h2 className="mt-1 text-xl font-semibold tracking-[-.035em] text-[#1c1c1e] sm:text-2xl">Your teaching load</h2></div>
          <Link href="/dashboard/students" className="shrink-0 text-xs font-bold text-[#187574] transition hover:text-[#105d5d] hover:underline">View learners <span aria-hidden="true">↗</span></Link>
        </div>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {overview.map((item) => (
            <article key={item.label} className="rounded-[20px] border border-[#eceff1] bg-white p-4 shadow-[0_6px_22px_rgba(24,38,54,.035)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(24,38,54,.07)] sm:p-5">
              <div className="flex items-center justify-between gap-3"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#777f8b] sm:text-[11px]">{item.label}</p><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.tone}`}><Icon name={item.icon} /></span></div>
              <p className="mt-4 font-mono text-3xl font-semibold tracking-[-.06em] text-[#1c1c1e] sm:text-4xl">{item.value}</p>
              <p className="mt-1 text-[11px] leading-5 text-[#8e91a0] sm:text-xs">{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]">
        <section aria-labelledby="classes-heading" className="overflow-hidden rounded-[22px] border border-[#eceff1] bg-white shadow-[0_8px_28px_rgba(24,38,54,.04)]">
          <div className="flex items-end justify-between gap-4 border-b border-[#eef0f2] px-5 py-5 sm:px-7">
            <div><p className="text-[10px] font-bold uppercase tracking-[.17em] text-[#8e91a0]">Your teaching load</p><h2 id="classes-heading" className="mt-1 text-xl font-semibold tracking-[-.035em] text-[#1c1c1e] sm:text-2xl">My classes</h2></div>
            <span className="rounded-full bg-[#f4f6f7] px-3 py-1.5 text-[11px] font-semibold text-[#68717b]">{classes.length} {classes.length === 1 ? "class" : "classes"}</span>
          </div>
          {classes.length > 0 ? (
            <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
              {classes.map((item, index) => {
                const classSubjects = [...(subjectsByClass.get(item.id) ?? [])]
                return (
                  <Link key={item.id} href={`/dashboard/attendance/${item.id}`} aria-label={`Open attendance for ${item.name}`} className="group relative overflow-hidden rounded-[18px] border border-[#e9ecef] bg-[#fcfdfd] p-5 transition hover:-translate-y-0.5 hover:border-[#a7d8d2] hover:bg-[#f7fcfb] hover:shadow-[0_12px_26px_rgba(24,69,65,.07)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#187574]">
                    <div className={`absolute inset-x-0 top-0 h-1 ${cardAccents[index % cardAccents.length]}`} />
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#edf6f4] text-sm font-bold tracking-wide text-[#187574]">{item.name.slice(0, 2).toUpperCase()}</span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#187574] transition group-hover:translate-x-0.5">Attendance <Arrow /></span>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold tracking-[-.025em] text-[#1c1c1e]">{item.name}</h3>
                    <div className="mt-2 flex min-h-6 flex-wrap gap-1.5">
                      {classSubjects.length > 0 ? classSubjects.slice(0, 3).map((subject) => <span key={subject} className="rounded-full bg-[#f0f2f3] px-2.5 py-1 text-[10px] font-medium text-[#68717b]">{subject}</span>) : <span className="text-xs text-[#8e91a0]">All subjects</span>}
                      {classSubjects.length > 3 && <span className="rounded-full bg-[#f0f2f3] px-2.5 py-1 text-[10px] font-semibold text-[#68717b]">+{classSubjects.length - 3}</span>}
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[#edf0f0] pt-4">
                      <div><p className="font-mono text-lg font-semibold text-[#1c1c1e]">{item._count.students}</p><p className="text-[10px] font-medium text-[#8e91a0]">learners</p></div>
                      <div><p className="font-mono text-lg font-semibold text-[#1c1c1e]">{item._count.assessments}</p><p className="text-[10px] font-medium text-[#8e91a0]">assessments</p></div>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="px-7 py-14 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff4d9] text-[#80651c]"><Icon name="students" /></div>
              <h3 className="mt-4 font-semibold text-[#1c1c1e]">No classes assigned yet</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#747b86]">Your school administrator needs to link you to a class before it appears here.</p>
              <Link href="/dashboard/timetable" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#187574] hover:underline">Check timetable access <Arrow /></Link>
            </div>
          )}
        </section>

        <section aria-labelledby="actions-heading" className="overflow-hidden rounded-[22px] border border-[#eceff1] bg-white shadow-[0_8px_28px_rgba(24,38,54,.04)]">
          <div className="border-b border-[#eef0f2] px-5 py-5 sm:px-6"><p className="text-[10px] font-bold uppercase tracking-[.17em] text-[#8e91a0]">Keep momentum</p><h2 id="actions-heading" className="mt-1 text-xl font-semibold tracking-[-.035em] text-[#1c1c1e] sm:text-2xl">Quick actions</h2></div>
          <div className="divide-y divide-[#eef0f2]">
            {quickActions.map((action) => (
              <Link key={action.href} href={action.href} className="group flex items-center gap-3.5 px-5 py-4 transition hover:bg-[#fafcfc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#187574] sm:px-6">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${action.tone}`}><Icon name={action.icon} /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-[#1c1c1e]">{action.label}</span><span className="mt-0.5 block text-[11px] leading-4 text-[#8e91a0]">{action.detail}</span></span>
                <span className="text-[10px] font-bold tracking-wide text-[#b1b6bd] transition group-hover:text-[#187574]">{action.number}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section aria-labelledby="recent-heading" className="overflow-hidden rounded-[22px] border border-[#eceff1] bg-white shadow-[0_8px_28px_rgba(24,38,54,.04)]">
        <div className="flex items-end justify-between gap-4 border-b border-[#eef0f2] px-5 py-5 sm:px-7">
          <div><p className="text-[10px] font-bold uppercase tracking-[.17em] text-[#8e91a0]">Latest work</p><h2 id="recent-heading" className="mt-1 text-xl font-semibold tracking-[-.035em] text-[#1c1c1e] sm:text-2xl">Recent assessments</h2></div>
          <Link href="/dashboard/assessments" className="shrink-0 text-xs font-bold text-[#187574] transition hover:text-[#105d5d] hover:underline">All assessments <span aria-hidden="true">↗</span></Link>
        </div>
        {recentAssessments.length > 0 ? (
          <div className="divide-y divide-[#eef0f2]">
            {recentAssessments.map((assessment) => {
              const classSize = assessment.class._count.students
              const recorded = assessment._count.results
              const coverage = classSize > 0 ? Math.min(100, Math.round((recorded / classSize) * 100)) : 0
              const status = classSize === 0 ? "No learners" : recorded === 0 ? "Ready to record" : recorded >= classSize ? "Scores complete" : "In progress"
              const statusTone = recorded >= classSize && classSize > 0 ? "bg-[#e5f7f3] text-[#187574]" : recorded > 0 ? "bg-[#fff4d9] text-[#80651c]" : "bg-[#f0f2f3] text-[#68717b]"
              return (
                <div key={assessment.id} className="grid gap-4 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(170px,.55fr)_auto] sm:items-center sm:px-7">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eee9ff] text-[#655493]"><Icon name="assessment" /></span>
                    <div className="min-w-0"><p className="truncate text-sm font-semibold text-[#1c1c1e]">{assessment.title}</p><p className="mt-1 truncate text-xs text-[#8e91a0]">{assessment.class.name} · {assessment.subject.name} · {new Date(assessment.date).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}</p></div>
                  </div>
                  <div className="sm:px-2">
                    <div className="mb-1.5 flex items-center justify-between gap-3"><span className="text-[10px] font-medium text-[#747b86]">{classSize > 0 ? `${recorded} of ${classSize} scores` : "Class has no learners"}</span><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${statusTone}`}>{status}</span></div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#edf0f0]" role="progressbar" aria-label={`${assessment.title} score entry`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={coverage}><div className="h-full rounded-full bg-[#62bcb1] transition-[width]" style={{ width: `${coverage}%` }} /></div>
                  </div>
                  <Link href={`/dashboard/assessments/${assessment.id}/record`} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#187574] transition hover:text-[#105d5d] hover:underline">Record scores <Arrow /></Link>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="px-7 py-12 text-center"><p className="text-sm font-medium text-[#68717b]">Your recent assessments will appear here once you create one.</p><Link href="/dashboard/assessments/new" className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-[#187574] hover:underline">Create an assessment <Arrow /></Link></div>
        )}
      </section>
    </div>
  )
}
