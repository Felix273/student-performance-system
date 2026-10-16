"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

type Grant = { id: string; schoolId: string; status: string; purpose: string; requestedAt: string; expiresAt: string | null; revokedAt: string | null; school: { id: string; name: string; domain: string; status: string }; requestedBy: { name: string; email: string } | null; approvedBy: { name: string; email: string } | null }

export default function SupportManager({ grants }: { grants: Grant[] }) {
  const router = useRouter()
  const [minutes, setMinutes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState("")
  const [error, setError] = useState("")

  async function action(grant: Grant, value: "APPROVE" | "DENY" | "REVOKE") {
    setBusy(grant.id)
    setError("")
    const response = await fetch(`/api/platform/support/${grant.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: value, minutes: Number(minutes[grant.id] ?? "20") }) }).catch(() => null)
    const data = await response?.json().catch(() => ({}))
    setBusy("")
    if (!response?.ok) return setError(data?.error || "Unable to update support request")
    router.refresh()
  }

  return <div className="space-y-5">
    {error && <p role="alert" className="rounded-lg bg-[#fff1f1] px-4 py-3 text-sm font-semibold text-[#9b3030]">{error}</p>}
    <section className="miro-surface overflow-hidden"><div className="divide-y divide-[#eef0f3]">
      {grants.map((grant) => <article key={grant.id} className="space-y-4 p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold">{grant.school.name}</h2><span className="rounded-full bg-[#e7edff] px-2.5 py-1 text-[10px] font-bold text-[#3550d6]">{grant.status}</span></div><p className="mt-1 text-xs text-[#8e91a0]">{grant.school.domain} · requested by {grant.requestedBy?.name ?? grant.requestedBy?.email ?? "former account"} · {new Date(grant.requestedAt).toLocaleString()}</p></div><span className="rounded-full bg-[#effbf6] px-2.5 py-1 text-[10px] font-bold text-[#14664a]">Read-only diagnostics</span></div>
        <p className="whitespace-pre-wrap text-sm leading-6 text-[#555a6a]">{grant.purpose}</p>
        {grant.status === "PENDING" ? <div className="flex flex-wrap items-end gap-2"><label className="text-[11px] font-semibold text-[#6b6f7e]">Access duration<select value={minutes[grant.id] ?? "20"} onChange={(event) => setMinutes({ ...minutes, [grant.id]: event.target.value })} className="mt-1 block rounded-lg border border-[#e0e2e8] bg-white px-3 py-2 text-sm"><option value="10">10 minutes</option><option value="20">20 minutes</option><option value="30">30 minutes</option></select></label><button type="button" disabled={busy === grant.id} onClick={() => action(grant, "APPROVE")} className="min-h-9 rounded-lg bg-[#14664a] px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-50">{busy === grant.id ? "Updating…" : "Approve diagnostics"}</button><button type="button" disabled={busy === grant.id} onClick={() => action(grant, "DENY")} className="min-h-9 rounded-lg border border-[#e0b9b9] px-3.5 py-2 text-xs font-semibold text-[#9b3030] disabled:opacity-50">Deny</button></div> : grant.status === "APPROVED" ? <div className="flex flex-wrap items-center gap-3"><p className="text-xs text-[#6b6f7e]">Expires {grant.expiresAt ? new Date(grant.expiresAt).toLocaleString() : "unknown"}</p><Link href={`/dashboard/platform/support/${grant.id}`} className="rounded-lg bg-[#1c1c1e] px-3.5 py-2 text-xs font-semibold text-white">Open diagnostics</Link><button type="button" disabled={busy === grant.id} onClick={() => action(grant, "REVOKE")} className="rounded-lg border border-[#e0b9b9] px-3.5 py-2 text-xs font-semibold text-[#9b3030] disabled:opacity-50">Revoke now</button></div> : null}
      </article>)}
      {!grants.length && <p className="px-6 py-12 text-center text-sm text-[#8e91a0]">No pending or active support requests.</p>}
    </div></section>
  </div>
}
