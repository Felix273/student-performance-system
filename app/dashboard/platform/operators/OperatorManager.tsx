"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

type Operator = { id: string; name: string; email: string; isActive: boolean; mfaEnabled: boolean; lastLoginAt: string | null; createdAt: string }

export default function OperatorManager({ operators }: { operators: Operator[] }) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [busy, setBusy] = useState("")
  const [error, setError] = useState("")
  const [result, setResult] = useState<{ email: string; emailed: boolean; link?: string } | null>(null)
  const [copied, setCopied] = useState(false)

  async function invite(event: React.FormEvent) {
    event.preventDefault()
    setBusy("invite")
    setError("")
    setResult(null)
    const response = await fetch("/api/platform/operators", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email }) }).catch(() => null)
    const data = await response?.json().catch(() => ({}))
    setBusy("")
    if (!response?.ok) return setError(data?.error || "Unable to invite operator")
    setResult({ email: data.operator.email, emailed: data.invite.emailed, link: data.invite.link })
    setName("")
    setEmail("")
    router.refresh()
  }

  async function setActive(operator: Operator, isActive: boolean) {
    setBusy(operator.id)
    setError("")
    const response = await fetch(`/api/platform/operators/${operator.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive }) }).catch(() => null)
    const data = await response?.json().catch(() => ({}))
    setBusy("")
    if (!response?.ok) return setError(data?.error || "Unable to update operator")
    router.refresh()
  }

  return (
    <div className="space-y-8">
      <form onSubmit={invite} className="miro-surface grid gap-4 p-6 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="text-xs font-semibold text-[#555a6a]">Name<input required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#e0e2e8] px-3.5 py-2.5 text-sm outline-none focus:border-[#4262ff]" /></label>
        <label className="text-xs font-semibold text-[#555a6a]">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#e0e2e8] px-3.5 py-2.5 text-sm outline-none focus:border-[#4262ff]" /></label>
        <button type="submit" disabled={busy === "invite"} className="min-h-10 rounded-lg bg-[#1c1c1e] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy === "invite" ? "Sending…" : "Invite operator"}</button>
      </form>
      {error && <p role="alert" className="rounded-lg bg-[#fff1f1] px-4 py-3 text-sm font-semibold text-[#9b3030]">{error}</p>}
      {result && <div role="status" className="rounded-xl border border-[#bfe9d9] bg-[#effbf6] p-4 text-sm text-[#14664a]">{result.emailed ? <p className="font-semibold">Invite sent to {result.email}. The operator must choose a password and enroll in MFA.</p> : <div className="space-y-2"><p className="font-semibold">Email isn’t configured. Share this single-use invite with {result.email} privately.</p><code className="block break-all rounded-lg bg-white p-3 font-mono text-xs text-[#1c1c1e]">{result.link}</code><button type="button" onClick={() => { navigator.clipboard?.writeText(result.link ?? ""); setCopied(true) }} className="font-semibold underline">{copied ? "Copied" : "Copy invite"}</button></div>}</div>}
      <section className="miro-surface overflow-hidden">
        <div className="divide-y divide-[#eef0f3]">
          {operators.map((operator) => <div key={operator.id} className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7"><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#1c1c1e]">{operator.name}</p><p className="truncate text-xs text-[#6b6f7e]">{operator.email}</p><p className="mt-1 text-xs text-[#8e91a0]">{operator.isActive ? "Active" : "Disabled"} · {operator.mfaEnabled ? "MFA enabled" : "MFA pending"} · {operator.lastLoginAt ? `Last sign-in ${new Date(operator.lastLoginAt).toLocaleDateString()}` : "Never signed in"}</p></div><button type="button" disabled={busy === operator.id} onClick={() => setActive(operator, !operator.isActive)} className={`min-h-9 rounded-lg border px-3.5 py-2 text-xs font-semibold disabled:opacity-50 ${operator.isActive ? "border-[#e0b9b9] text-[#9b3030]" : "border-[#bfe9d9] text-[#14664a]"}`}>{busy === operator.id ? "Updating…" : operator.isActive ? "Disable operator" : "Reactivate operator"}</button></div>)}
          {!operators.length && <p className="px-6 py-12 text-center text-sm text-[#8e91a0]">No platform operators found.</p>}
        </div>
      </section>
    </div>
  )
}