"use client"

import { useState } from "react"
import { signOut } from "next-auth/react"

const input = "w-full rounded-lg border border-[#e0e2e8] bg-[#f7f8fa] px-3.5 py-3 text-sm font-medium outline-none transition focus:border-[#4262ff] focus:bg-white focus:ring-4 focus:ring-[#4262ff]/10 disabled:opacity-60"
const label = "mb-1.5 block text-[11px] font-bold uppercase tracking-[.12em] text-[#555a6a]"

export default function PasswordForm({ forced = false }: { forced?: boolean }) {
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (next !== confirm) return setError("The two new passwords don’t match")
    setLoading(true)
    setError("")
    const response = await fetch("/api/account/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: current, newPassword: next }) }).catch(() => null)
    const data = await response?.json().catch(() => ({}))
    if (!response?.ok) {
      setError(data?.error || "Something went wrong. Please try again.")
      return setLoading(false)
    }
    // Every session, including this one, is now invalid; sign in again with the new password.
    await signOut({ redirect: false })
    window.location.href = "/login"
  }

  return (
    <form onSubmit={submit} className="max-w-md space-y-4">
      <div><label htmlFor="current" className={label}>{forced ? "Temporary password" : "Current password"}</label><input id="current" type="password" required autoComplete="current-password" value={current} onChange={(event) => setCurrent(event.target.value)} disabled={loading} className={input} /></div>
      <div><label htmlFor="next" className={label}>New password</label><input id="next" type="password" required minLength={12} autoComplete="new-password" value={next} onChange={(event) => setNext(event.target.value)} disabled={loading} className={input} /><p className="mt-1.5 text-xs text-[#6b6f7e]">At least 12 characters.</p></div>
      <div><label htmlFor="confirm" className={label}>Confirm new password</label><input id="confirm" type="password" required autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} disabled={loading} className={input} /></div>
      {error && <div role="alert" className="rounded-lg border border-[#ffc6c6] bg-[#fff1f1] px-4 py-3 text-sm font-semibold text-[#9b3030]">{error}</div>}
      <button type="submit" disabled={loading} className="min-h-11 rounded-lg bg-[#1c1c1e] px-5 text-sm font-semibold text-white transition hover:bg-[#303038] disabled:opacity-50">{loading ? "Saving…" : "Change password"}</button>
    </form>
  )
}
