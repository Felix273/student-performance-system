import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import StatCard from "@/components/ui/StatCard"

const actions = [
  { href: "/dashboard/students", label: "Students", detail: "View records and performance", icon: "♙", tone: "blue", roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"] },
  { href: "/dashboard/assessments/new", label: "New assessment", detail: "Set up a score entry", icon: "+", tone: "violet", roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"] },
  { href: "/dashboard/attendance", label: "Take attendance", detail: "Mark today in seconds", icon: "✓", tone: "emerald", roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"] },
  { href: "/dashboard/analysis", label: "AI insights", detail: "Turn results into action", icon: "✦", tone: "amber", roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"] },
  { href: "/dashboard/reports", label: "Export reports", detail: "PDF and spreadsheet exports", icon: "↗", tone: "rose", roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"] },
  { href: "/dashboard/bulk-upload", label: "Bulk upload", detail: "Import your existing data", icon: "↑", tone: "cyan", roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"] },
]

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role === "TEACHER") redirect("/dashboard/teacher")
  if (session.user.role === "PARENT") redirect("/dashboard/parent")
  const isSuperAdmin = session.user.role === "SUPER_ADMIN"
  const isSchoolAdmin = session.user.role === "SCHOOL_ADMIN"
  const whereClause = isSchoolAdmin && session.user.schoolId ? { schoolId: session.user.schoolId } : {}
  const [totalStudents, activeClasses, totalAssessments, totalAnalyses] = await Promise.all([
    prisma.student.count({ where: whereClause }), prisma.class.count({ where: whereClause }), prisma.assessment.count({ where: whereClause }),
    prisma.performanceAnalysis.count({ where: isSchoolAdmin && session.user.schoolId ? { student: { schoolId: session.user.schoolId } } : {} }),
  ])
  const visibleActions = actions.filter((action) => action.roles.includes(session.user.role || ""))

  return <div className="space-y-8 animate-fade-in">
    <section className="relative overflow-hidden rounded-[28px] bg-[#111827] px-6 py-8 text-white shadow-xl shadow-slate-900/10 sm:px-10 sm:py-10"><div className="absolute -right-20 -top-32 h-80 w-80 rounded-full bg-blue-600/25 blur-3xl" /><div className="absolute -bottom-36 left-1/3 h-72 w-72 rounded-full bg-violet-600/15 blur-3xl" /><div className="relative max-w-2xl"><div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold text-blue-200"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Workspace live</div><h1 className="text-3xl font-black tracking-tight sm:text-5xl">Good morning, {session.user.name?.split(" ")[0]}.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">A clear view of your school, your learners, and the next actions that matter.</p><div className="mt-7 flex flex-wrap gap-3"><Link href="/dashboard/reports" className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-blue-50">View reports <span className="ml-2">↗</span></Link><Link href="/dashboard/analysis" className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10">Explore AI insights</Link></div></div></section>

    <section><div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">At a glance</p><h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">Your school today</h2></div><span className="text-xs font-semibold text-slate-400">Live data</span></div><div className="grid grid-cols-2 gap-4 xl:grid-cols-4"><StatCard title="Students" value={totalStudents} icon="♙" color="blue" href="/dashboard/students" /><StatCard title="Active classes" value={activeClasses} icon="▦" color="green" /><StatCard title="Assessments" value={totalAssessments} icon="▤" color="purple" href="/dashboard/assessments" /><StatCard title="AI analyses" value={totalAnalyses} icon="✦" color="orange" href="/dashboard/analysis" /></div></section>

    <section className="grid gap-6 xl:grid-cols-[1.45fr_1fr]"><div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgb(15,23,42,0.04)] sm:p-6"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Shortcuts</p><h2 className="mt-1 text-xl font-black text-slate-950">Make progress faster</h2></div><span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">{visibleActions.length} actions</span></div><div className="grid gap-3 sm:grid-cols-2">{visibleActions.map((action) => <Link key={action.href} href={action.href} className="group flex items-center gap-3 rounded-xl border border-slate-100 p-3.5 transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/50"><span className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg font-black tone-${action.tone}`}>{action.icon}</span><span className="min-w-0"><strong className="block text-sm font-bold text-slate-900">{action.label}</strong><small className="block truncate text-xs font-medium text-slate-500">{action.detail}</small></span><span className="ml-auto text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-500">→</span></Link>)}</div></div><div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgb(15,23,42,0.04)] sm:p-6"><div className="mb-6"><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">System health</p><h2 className="mt-1 text-xl font-black text-slate-950">Everything in order</h2></div><div className="space-y-4"><div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-sm font-black text-white">✓</span><div><p className="text-sm font-bold text-emerald-950">Workspace active</p><p className="text-xs font-medium text-emerald-700">Your data is ready to use</p></div></div><div className="flex items-center justify-between border-b border-slate-100 pb-4"><span className="text-sm font-semibold text-slate-600">Students enrolled</span><strong className="text-sm font-black text-slate-950">{totalStudents}</strong></div><div className="flex items-center justify-between border-b border-slate-100 pb-4"><span className="text-sm font-semibold text-slate-600">Classes running</span><strong className="text-sm font-black text-slate-950">{activeClasses}</strong></div><div className="flex items-center justify-between"><span className="text-sm font-semibold text-slate-600">Analyses generated</span><strong className="text-sm font-black text-slate-950">{totalAnalyses}</strong></div></div></div></section>
  </div>
}
