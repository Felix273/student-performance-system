"use client"

import { useState } from "react"
import AuthCard, { authButtonClass, authInputClass } from "@/components/AuthCard"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) setError(data.error || "Something went wrong. Please try again.")
      else setDone(true)
    } catch {
      setError("Something went wrong. Please try again.")
    }
    setLoading(false)
  }

  return (
    <AuthCard title="Reset your password" subtitle="Enter the email you sign in with and we’ll send you a link to choose a new password.">
      {done ? (
        <div className="space-y-5">
          <div role="status" className="rounded-xl border border-[#bfe9d9] bg-[#effbf6] px-4 py-3 text-sm font-semibold text-[#14664a]">If an account exists for that email, a reset link is on its way. It works once and expires in 60 minutes.</div>
          <a href="/login" className="block text-center text-sm font-semibold text-[#4262ff] hover:underline">Back to sign in</a>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-[11px] font-bold uppercase tracking-[.12em] text-[#555a6a]">Email address</label>
            <input id="email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={loading} placeholder="name@school.edu" className={authInputClass} />
          </div>
          {error && <div role="alert" className="rounded-xl border border-[#ffc6c6] bg-[#fff1f1] px-4 py-3 text-sm font-semibold text-[#9b3030]">{error}</div>}
          <button type="submit" disabled={loading} className={authButtonClass}>{loading ? "Sending…" : "Send reset link"}</button>
          <a href="/login" className="block text-center text-sm font-semibold text-[#6b6f7e] hover:underline">Back to sign in</a>
        </form>
      )}
    </AuthCard>
  )
}
