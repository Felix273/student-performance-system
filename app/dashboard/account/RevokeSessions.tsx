"use client"

import { useState } from "react"
import { signOut } from "next-auth/react"

export default function RevokeSessions() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function revoke() {
    if (!window.confirm("Sign out of every device, including this one?")) return
    setLoading(true)
    setError("")
    const response = await fetch("/api/account/sessions/revoke", { method: "POST" }).catch(() => null)
    if (!response?.ok) {
      setError("Unable to sign out other sessions. Try again.")
      return setLoading(false)
    }
    await signOut({ redirect: false })
    window.location.href = "/login"
  }

  return (
    <div className="space-y-3">
      <button type="button" onClick={revoke} disabled={loading} className="min-h-11 rounded-lg border border-[#e0e2e8] px-5 text-sm font-semibold text-[#1c1c1e] transition hover:bg-[#f7f8fa] disabled:opacity-50">{loading ? "Signing out…" : "Sign out everywhere"}</button>
      {error && <p role="alert" className="text-sm font-semibold text-[#9b3030]">{error}</p>}
    </div>
  )
}
