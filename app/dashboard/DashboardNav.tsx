"use client"

import { signOut } from "next-auth/react"

interface Session {
  user?: {
    name?: string | null
    role?: string
    schoolName?: string
  }
}

export default function DashboardNav({ session }: { session: any }) {
  const handleSignOut = async () => {
    await signOut({ redirect: false })
    window.location.href = '/login'
  }

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex-shrink-0">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">
              Student Performance System
            </h1>
            <p className="text-xs text-gray-800 hidden sm:block font-semibold">
              {session?.user?.schoolName || "System Administration"}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-gray-900">{session?.user?.name}</p>
              <p className="text-xs text-gray-800 font-semibold">{session?.user?.role ? session.user.role.replace('_', ' ') : ''}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-lg transition font-bold shadow-md"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
