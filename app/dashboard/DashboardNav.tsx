"use client"

import { signOut } from "next-auth/react"
import Link from "next/link"

export default function DashboardNav({ session }: { session: any }) {
  const handleSignOut = async () => {
    await signOut({ redirect: false })
    window.location.href = '/login'
  }

  const role = session?.user?.role ? session.user.role.replace('_', ' ') : 'User'

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-md group-hover:scale-105 transition-transform">
              🎓
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-800 bg-clip-text text-transparent group-hover:from-blue-600 group-hover:to-indigo-600 transition-colors">
                Student Performance System
              </h1>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                {session?.user?.schoolName || "System Administration"}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3 sm:gap-5">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-900">{session?.user?.name}</p>
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">{role}</span>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="inline-flex items-center justify-center bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 text-xs sm:text-sm px-3.5 py-2 rounded-lg font-semibold transition-all border border-slate-200 hover:border-rose-200 shadow-2xs"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
