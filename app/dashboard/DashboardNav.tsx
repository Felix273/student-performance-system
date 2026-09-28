"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { signOut } from "next-auth/react"
import type { Session } from "next-auth"

type IconName = "overview" | "schools" | "users" | "students" | "assessments" | "attendance" | "reports" | "fees" | "insights" | "curriculum"
const links: { href: string; label: string; icon: IconName; roles: string[] }[] = [
  { href: "/dashboard", label: "Overview", icon: "overview", roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "PARENT"] },
  { href: "/dashboard/schools", label: "Schools", icon: "schools", roles: ["SUPER_ADMIN"] },
  { href: "/dashboard/users", label: "Users", icon: "users", roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"] },
  { href: "/dashboard/students", label: "Students", icon: "students", roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"] },
  { href: "/dashboard/assessments", label: "Assessments", icon: "assessments", roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"] },
  { href: "/dashboard/curriculum", label: "Curriculum", icon: "curriculum", roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"] },
  { href: "/dashboard/attendance", label: "Attendance", icon: "attendance", roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"] },
  { href: "/dashboard/reports", label: "Reports", icon: "reports", roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"] },
  { href: "/dashboard/fees", label: "Fees", icon: "fees", roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"] },
  { href: "/dashboard/analysis", label: "Insights", icon: "insights", roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "PARENT"] },
]

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    overview: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    schools: <><path d="m3 10 9-6 9 6" /><path d="M5 10v9h14v-9M9 19v-6h6v6" /></>,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 20c.6-3.2 2.5-5 6-5s5.4 1.8 6 5M16 5.5a3 3 0 0 1 0 5.7M17 15c2.2.7 3.5 2.2 4 5" /></>,
    students: <><circle cx="12" cy="8" r="3" /><path d="M5 21c.7-4 2.9-6 7-6s6.3 2 7 6M3 10l9-4 9 4-9 4-9-4Z" /></>,
    assessments: <><path d="M6 3h9l3 3v15H6z" /><path d="M15 3v4h4M9 12h6M9 16h6" /></>,
    attendance: <><path d="m5 12 4 4L19 6" /><circle cx="12" cy="12" r="9" /></>,
    reports: <><path d="M5 19 19 5M9 5h10v10" /><path d="M5 9v10h10" /></>,
    fees: <><circle cx="12" cy="12" r="9" /><path d="M12 6v12M15 9.5c-.5-.7-1.4-1-2.7-1-1.5 0-2.5.7-2.5 1.8 0 2.8 5.2 1.1 5.2 4 0 1.2-1 2.2-2.7 2.2-1.3 0-2.3-.4-2.9-1.2" /></>,
    insights: <><path d="M9 18h6M10 21h4M8 14.5A6 6 0 1 1 16 14c-.9.7-1.2 1.4-1.2 2H9.2c0-.7-.3-1.1-1.2-1.5Z" /></>,
    curriculum: <><path d="M4 5.5 12 3l8 2.5v13L12 21l-8-2.5z" /><path d="M12 3v18M4 5.5 12 8l8-2.5M4 12.5 12 15l8-2.5" /></>,
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px]">{paths[name]}</svg>
}

function NavLinks({ session, pathname, onNavigate }: { session: Session; pathname: string; onNavigate?: () => void }) {
  const role = session.user.role || ""
  return <nav aria-label="Primary navigation" className="space-y-0.5">{links.filter((link) => link.roles.includes(role)).map((link) => {
    const active = link.href === "/dashboard" ? pathname === link.href : pathname.startsWith(link.href)
    return <Link key={link.href} href={link.href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={`group flex items-center gap-3 rounded-full px-3.5 py-2.5 text-[13px] font-semibold transition ${active ? "bg-[#ffd02f] text-[#1c1c1e]" : "text-slate-400 hover:bg-white/[.08] hover:text-white"}`}><Icon name={link.icon} /><span>{link.label}</span></Link>
  })}</nav>
}

export default function DashboardNav({ session }: { session: Session }) {
  const pathname = usePathname(); const [open, setOpen] = useState(false)
  const role = (session.user.role || "").replaceAll("_", " ")
  const signOutNow = async () => { await signOut({ redirect: false }); window.location.href = "/login" }
  return <>
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-[#1c1c1e] px-4 py-7 text-white lg:flex">
      <Link href="/dashboard" className="mb-12 flex items-center gap-3 px-3"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#ffd02f] text-sm font-black text-[#1c1c1e]">S</span><span><strong className="block text-[15px] font-bold tracking-tight">StudentOS</strong><small className="block text-[10px] font-medium tracking-wide text-slate-500">SCHOOL OPERATIONS</small></span></Link>
      <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.2em] text-slate-500">Main menu</div><NavLinks session={session} pathname={pathname} />
      <div className="mt-auto border-t border-white/[.08] pt-5"><div className="mb-4 flex items-center gap-3 px-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-600 text-xs font-bold">{session.user.name?.charAt(0).toUpperCase()}</div><div className="min-w-0"><p className="truncate text-xs font-bold text-slate-200">{session.user.name}</p><p className="truncate text-[10px] capitalize text-slate-500">{role.toLowerCase()}</p></div></div><button onClick={signOutNow} className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-500 transition hover:text-white">Sign out <span className="float-right">↗</span></button></div>
    </aside>
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden"><Link href="/dashboard" className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-sm font-black text-white">S</span><span className="text-sm font-bold text-slate-950">StudentOS</span></Link><button type="button" aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen(!open)} className="border-b border-slate-400 px-1 py-1 text-xs font-bold text-slate-700">{open ? "Close" : "Menu"}</button></header>
    {open && <div id="mobile-nav" className="fixed inset-x-0 top-16 z-40 border-b border-white/10 bg-[#18212f] p-4 shadow-xl lg:hidden"><NavLinks session={session} pathname={pathname} onNavigate={() => setOpen(false)} /><button onClick={signOutNow} className="mt-4 w-full border-t border-white/10 px-1 pt-4 text-left text-xs font-semibold text-slate-400">Sign out <span className="float-right">↗</span></button></div>}
  </>
}
