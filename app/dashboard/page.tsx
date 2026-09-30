import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import StatCard from "@/components/ui/StatCard"
import PlatformOverview from "./PlatformOverview"

const actions = [
  { href: "/dashboard/students", label: "Students", detail: "View records and performance", tone: "yellow", roles: ["SCHOOL_ADMIN"] },
  { href: "/dashboard/assessments/new", label: "New assessment", detail: "Set up a score entry", tone: "blue", roles: ["SCHOOL_ADMIN"] },
  { href: "/dashboard/attendance", label: "Take attendance", detail: "Mark today in seconds", tone: "teal", roles: ["SCHOOL_ADMIN", "TEACHER"] },
  { href: "/dashboard/analysis", label: "Insights", detail: "Turn results into action", tone: "rose", roles: ["SCHOOL_ADMIN", "TEACHER"] },
]

export default async function DashboardPage() {
  const session = await auth(); if (!session) redirect("/login"); if (session.user.role === "TEACHER") redirect("/dashboard/teacher"); if (session.user.role === "PARENT") redirect("/dashboard/parent")
  if (session.user.role === "SUPER_ADMIN") {
    const [schoolCount, learnerCount, staffCount, publishedCurriculumCount] = await Promise.all([
      prisma.school.count(),
      prisma.student.count(),
      prisma.user.count({ where: { role: { in: ["SCHOOL_ADMIN", "TEACHER"] } } }),
      prisma.curriculumVersion.count({ where: { status: "PUBLISHED" } }),
    ])
    return <PlatformOverview schoolCount={schoolCount} learnerCount={learnerCount} staffCount={staffCount} publishedCurriculumCount={publishedCurriculumCount} />
  }
  if (session.user.role === "SCHOOL_ADMIN" && !session.user.schoolId) redirect("/login")
  const schoolFilter = session.user.role === "SCHOOL_ADMIN" && session.user.schoolId ? { schoolId: session.user.schoolId } : {}
  const [totalStudents, activeClasses, totalAssessments, totalAnalyses] = await Promise.all([prisma.student.count({ where: schoolFilter }), prisma.class.count({ where: schoolFilter }), prisma.assessment.count({ where: schoolFilter }), prisma.performanceAnalysis.count({ where: session.user.role === "SCHOOL_ADMIN" && session.user.schoolId ? { student: { schoolId: session.user.schoolId } } : {} })])
  const visibleActions = actions.filter((action) => action.roles.includes(session.user.role || ""))
  return <div className="space-y-14 animate-fade-in">
    <section className="relative overflow-hidden rounded-[28px] bg-[#ffd02f] px-7 py-10 sm:px-12 sm:py-14"><div className="absolute -right-10 -top-16 h-64 w-64 rounded-full border-[32px] border-[#fcb900]/50" /><div className="absolute bottom-[-90px] right-48 h-48 w-48 rounded-full border-[22px] border-[#fff4c4]/70" /><div className="relative max-w-3xl"><p className="mb-5 text-[11px] font-bold uppercase tracking-[.2em] text-[#746019]">Your school workspace</p><h1 className="max-w-2xl text-4xl font-medium leading-[1.05] tracking-[-.055em] text-[#1c1c1e] sm:text-6xl">Make space for better decisions.</h1><p className="mt-5 max-w-xl text-base leading-7 text-[#746019]">Welcome back, {session.user.name?.split(" ")[0]}. Bring your records, assessments, and next steps into focus.</p><div className="mt-8 flex flex-wrap gap-3"><Link href="/dashboard/reports" className="miro-pill bg-[#1c1c1e] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#2c2c34]">View reports <span className="ml-2">↗</span></Link><Link href="/dashboard/analysis" className="miro-pill border border-[#1c1c1e]/20 bg-white/35 px-5 py-3 text-sm font-medium text-[#1c1c1e] transition hover:bg-white/60">Explore insights</Link></div></div></section>
    <section><div className="mb-6 flex items-end justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#8e91a0]">The workspace</p><h2 className="mt-2 text-2xl font-medium tracking-tight text-[#1c1c1e]">School at a glance</h2></div><span className="miro-pill border border-[#e0e2e8] px-3 py-1.5 text-xs font-medium text-[#6b6f7e]">Live data</span></div><div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><StatCard title="Students" value={totalStudents} color="blue" href="/dashboard/students" /><StatCard title="Classes" value={activeClasses} color="green" /><StatCard title="Assessments" value={totalAssessments} color="purple" href="/dashboard/assessments" /><StatCard title="AI analyses" value={totalAnalyses} color="orange" href="/dashboard/analysis" /></div></section>
    <section className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]"><div className="miro-surface p-6 sm:p-8"><div className="mb-7 flex items-center justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#8e91a0]">Canvas</p><h2 className="mt-2 text-2xl font-medium tracking-tight text-[#1c1c1e]">Keep the work moving</h2></div><span className="text-xs text-[#8e91a0]">{visibleActions.length} actions</span></div><div className="grid gap-3 sm:grid-cols-2">{visibleActions.map((action) => <Link key={action.href} href={action.href} className={`group min-h-36 rounded-[20px] p-5 transition hover:-translate-y-1 ${action.tone === "yellow" ? "bg-[#fff4c4]" : action.tone === "blue" ? "bg-[#e7edff]" : action.tone === "teal" ? "bg-[#c3faf5]" : "bg-[#ffd8f4]"}`}><span className="block text-2xl font-medium text-[#1c1c1e]">{action.tone === "yellow" ? "01" : action.tone === "blue" ? "02" : action.tone === "teal" ? "03" : "04"}</span><span className="mt-8 block"><strong className="block text-sm font-medium text-[#1c1c1e]">{action.label}</strong><small className="mt-1 block text-xs text-[#555a6a]">{action.detail}</small></span><span className="mt-3 block text-[#555a6a] transition group-hover:translate-x-1">→</span></Link>)}</div></div><div className="rounded-[20px] bg-[#1c1c1e] p-6 text-white sm:p-8"><p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#a5a8b5]">Workspace status</p><h2 className="mt-3 text-2xl font-medium tracking-tight">A healthy board.</h2><p className="mt-3 text-sm leading-6 text-[#a5a8b5]">Your workspace is connected and ready for the next update.</p><div className="mt-9 space-y-4">{[["Students enrolled", totalStudents], ["Classes running", activeClasses], ["Analyses generated", totalAnalyses]].map(([label, value]) => <div key={String(label)} className="flex items-center justify-between border-b border-white/10 pb-4"><span className="text-sm text-[#a5a8b5]">{label}</span><strong className="font-mono text-sm text-[#ffd02f]">{value}</strong></div>)}</div></div></section>
  </div>
}
