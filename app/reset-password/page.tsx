"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import AuthCard, { authButtonClass, authInputClass } from "@/components/AuthCard"

type TokenInfo = { purpose: "RESET" | "INVITE"; email: string; name: string }

function ResetForm() {
  const token = useSearchParams().get("token") ?? ""
  const [info, setInfo] = useState<TokenInfo | null>(null)
  const [state, setState] = useState<"checking" | "invalid" | "ready" | "done">("checking")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true
    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then(async (response) => {
        if (!active) return
        if (!response.ok) return setState("invalid")
        setInfo(await response.json())
        setState("ready")
      })
      .catch(() => active && setState("invalid"))
    return () => { active = false }
  }, [token])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (password !== confirm) return setError("The two passwords don’t match")
    setLoading(true)
    setError("")
    const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) }).catch(() => null)
    const data = await response?.json().catch(() => ({}))
    if (response?.ok) setState("done")
    else setError(data?.error || "Something went wrong. Please try again.")
    setLoading(false)
  }

  if (state === "checking") return <p className="text-sm text-[#6b6f7e]">Checking your link…</p>

  if (state === "invalid") {
    return (
      <div className="space-y-5">
        <div role="alert" className="rounded-xl border border-[#ffc6c6] bg-[#fff1f1] px-4 py-3 text-sm font-semibold text-[#9b3030]">This link is invalid or has expired. Links work once.</div>
        <a href="/forgot-password" className="block text-center text-sm font-semibold text-[#4262ff] hover:underline">Request a new link</a>
      </div>
    )
  }

  if (state === "done") {
    return (
      <div className="space-y-5">
        <div role="status" className="rounded-xl border border-[#bfe9d9] bg-[#effbf6] px-4 py-3 text-sm font-semibold text-[#14664a]">Your password is set. Sign in with it to continue.</div>
        <a href="/login" className={`${authButtonClass} block text-center`}>Go to sign in</a>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <p className="text-sm text-[#6b6f7e]">Account: <strong className="text-[#1c1c1e]">{info?.email}</strong></p>
      <div>
        <label htmlFor="password" className="mb-2 block text-[11px] font-bold uppercase tracking-[.12em] text-[#555a6a]">New password</label>
        <input id="password" type="password" required minLength={12} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={loading} className={authInputClass} />
        <p className="mt-2 text-xs text-[#6b6f7e]">At least 12 characters. A few random words works well.</p>
      </div>
      <div>
        <label htmlFor="confirm" className="mb-2 block text-[11px] font-bold uppercase tracking-[.12em] text-[#555a6a]">Confirm password</label>
        <input id="confirm" type="password" required autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} disabled={loading} className={authInputClass} />
      </div>
      {error && <div role="alert" className="rounded-xl border border-[#ffc6c6] bg-[#fff1f1] px-4 py-3 text-sm font-semibold text-[#9b3030]">{error}</div>}
      <button type="submit" disabled={loading} className={authButtonClass}>{loading ? "Saving…" : info?.purpose === "INVITE" ? "Activate account" : "Set new password"}</button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <AuthCard title="Choose a password" subtitle="Pick a new password you don’t use anywhere else.">
      <Suspense fallback={<p className="text-sm text-[#6b6f7e]">Loading…</p>}>
        <ResetForm />
      </Suspense>
    </AuthCard>
  )
}
