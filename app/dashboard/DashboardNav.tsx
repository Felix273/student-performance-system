"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { signOut } from "next-auth/react"
import type { Session } from "next-auth"

const links = [
  { href: "/dashboard", label: "Overview", roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "PARENT"] },
  { href: "/dashboard/schools", label: "Schools", roles: ["SUPER_ADMIN"] },
  { href: "/dashboard/users", label: "Users", roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"] },
  { href: "/dashboard/students", label: "Students", roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"] },
  { href: "/dashboard/assessments", label: "Assessments", roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"] },
  { href: "/dashboard/attendance", label: "Attendance", roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"] },
  { href: "/dashboard/reports", label: "Reports", roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"] },
  { href: "/dashboard/fees", label: "Fees", roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"] },
  { href: "/dashboard/analysis", label: "Analysis", roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "PARENT"] },
]

export default function DashboardNav({ session }: { session: Session }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const role = session.user.role || ""
  const visibleLinks = links.filter((link) => link.roles.includes(role))
  const handleSignOut = async () => {
    await signOut({ redirect: false })
    window.location.href = "/login"
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-16 items-center justify-between gap-4 py-2">
          <Link href="/dashboard" className="min-w-0" onClick={() => setOpen(false)}>
            <p className="truncate text-base font-bold text-slate-950 sm:text-lg">Student Performance System</p>
            <p className="truncate text-xs font-medium text-slate-500">{session.user.schoolName || "System Administration"}</p>
          </Link>
          <div className="hidden items-center gap-3 lg:flex">
            <nav aria-label="Primary navigation" className="flex items-center gap-1">
              {visibleLinks.map((link) => {
                const active = link.href === "/dashboard" ? pathname === link.href : pathname.startsWith(link.href)
                return <Link key={link.href} href={link.href} className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`} aria-current={active ? "page" : undefined}>{link.label}</Link>
              })}
            </nav>
            <div className="border-l border-slate-200 pl-3 text-right">
              <p className="text-sm font-semibold text-slate-900">{session.user.name}</p>
              <p className="text-xs font-medium text-slate-500">{role.replaceAll("_", " ")}</p>
            </div>
            <button onClick={handleSignOut} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">Sign out</button>
          </div>
          <button type="button" aria-expanded={open} aria-controls="mobile-dashboard-nav" aria-label={open ? "Close navigation" : "Open navigation"} onClick={() => setOpen((value) => !value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 lg:hidden">{open ? "Close" : "Menu"}</button>
        </div>
        {open && <div id="mobile-dashboard-nav" className="border-t border-slate-100 py-3 lg:hidden"><nav aria-label="Mobile primary navigation" className="grid gap-1 sm:grid-cols-2">{visibleLinks.map((link) => { const active = link.href === "/dashboard" ? pathname === link.href : pathname.startsWith(link.href); return <Link key={link.href} href={link.href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined} className={`rounded-lg px-3 py-2 text-sm font-semibold ${active ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-100"}`}>{link.label}</Link> })}</nav><div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3"><div><p className="text-sm font-semibold text-slate-900">{session.user.name}</p><p className="text-xs text-slate-500">{role.replaceAll("_", " ")}</p></div><button onClick={handleSignOut} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white">Sign out</button></div></div>}
      </div>
    </header>
  )
}
