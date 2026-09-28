"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { signOut } from "next-auth/react"
import type { Session } from "next-auth"

const links = [
  { href: "/dashboard", label: "Overview", icon: "⌂", roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "PARENT"] },
  { href: "/dashboard/schools", label: "Schools", icon: "▦", roles: ["SUPER_ADMIN"] },
  { href: "/dashboard/users", label: "Users", icon: "◌", roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"] },
  { href: "/dashboard/students", label: "Students", icon: "♙", roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"] },
  { href: "/dashboard/assessments", label: "Assessments", icon: "▤", roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"] },
  { href: "/dashboard/attendance", label: "Attendance", icon: "✓", roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"] },
  { href: "/dashboard/reports", label: "Reports", icon: "↗", roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"] },
  { href: "/dashboard/fees", label: "Fees", icon: "$", roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"] },
  { href: "/dashboard/analysis", label: "AI Insights", icon: "✦", roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "PARENT"] },
]

function NavLinks({ session, pathname, onNavigate }: { session: Session; pathname: string; onNavigate?: () => void }) {
  const role = session.user.role || ""
  return <nav aria-label="Primary navigation" className="space-y-1">{links.filter((link) => link.roles.includes(role)).map((link) => {
    const active = link.href === "/dashboard" ? pathname === link.href : pathname.startsWith(link.href)
    return <Link key={link.href} href={link.href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={`group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition ${active ? "bg-white text-slate-950 shadow-lg shadow-slate-950/10" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}><span className={`flex h-7 w-7 items-center justify-center rounded-lg text-base ${active ? "bg-blue-600 text-white" : "bg-white/10 text-slate-300 group-hover:bg-white/15"}`}>{link.icon}</span>{link.label}</Link>
  })}</nav>
}

export default function DashboardNav({ session }: { session: Session }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const role = (session.user.role || "").replaceAll("_", " ")
  const signOutNow = async () => { await signOut({ redirect: false }); window.location.href = "/login" }

  return <>
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col bg-[#111827] px-5 py-6 text-white lg:flex">
      <Link href="/dashboard" className="mb-9 flex items-center gap-3 px-2">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-xl font-black shadow-lg shadow-blue-900/40">S</span>
        <span><strong className="block text-base tracking-tight">Student<span className="text-blue-400">OS</span></strong><small className="block text-[11px] font-medium text-slate-400">Performance workspace</small></span>
      </Link>
      <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Workspace</div>
      <NavLinks session={session} pathname={pathname} />
      <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4"><div className="mb-3 flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 text-sm font-bold">{session.user.name?.charAt(0).toUpperCase()}</div><div className="min-w-0"><p className="truncate text-sm font-bold">{session.user.name}</p><p className="truncate text-[11px] capitalize text-slate-400">{role.toLowerCase()}</p></div></div><p className="mb-3 truncate text-xs text-slate-400">{session.user.schoolName || "System Administration"}</p><button onClick={signOutNow} className="w-full rounded-lg border border-white/10 px-3 py-2 text-left text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white">Sign out <span className="float-right">→</span></button></div>
    </aside>
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden"><Link href="/dashboard" className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 font-black text-white">S</span><span className="font-bold text-slate-950">Student<span className="text-blue-600">OS</span></span></Link><button type="button" aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen(!open)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700">{open ? "Close" : "Menu"}</button></header>
    {open && <div id="mobile-nav" className="fixed inset-x-0 top-16 z-40 border-b border-slate-200 bg-[#111827] p-4 shadow-xl lg:hidden"><NavLinks session={session} pathname={pathname} onNavigate={() => setOpen(false)} /><button onClick={signOutNow} className="mt-4 w-full rounded-xl bg-white/10 px-4 py-3 text-left text-sm font-semibold text-white">Sign out <span className="float-right">→</span></button></div>}
  </>
}
