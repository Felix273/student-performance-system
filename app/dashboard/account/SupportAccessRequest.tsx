"use client"

import { useEffect, useState } from "react"

type RequestRow = { id: string; status: string; purpose: string; requestedAt: string; approvedAt: string | null; expiresAt: string | null; revokedAt: string | null }
const statusTone: Record<string, string> = { PENDING: "bg-[#fff4c4] text-[#746019]", APPROVED: "bg-[#effbf6] text-[#14664a]", DENIED: "bg-[#ffe1e1] text-[#9b3030]", REVOKED: "bg-[#f0f1f3] text-[#6b6f7e]", EXPIRED: "bg-[#f0f1f3] text-[#6b6f7e]" }

export default function SupportAccessRequest() {
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [purpose, setPurpose] = useState("")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  async function refresh() {
    const response = await fetch("/api/account/support", { cache: "no-store" })
    const data = await response.json()
    if (response.ok) setRequests(data.requests)
    else setError(data.error || "Unable to load support requests")
    setLoading(false)
  }

  useEffect(() => { void refresh() }, [])

  async function requestAccess(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError("")
    setMessage("")
    const response = await fetch("/api/account/support", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ purpose }) }).catch(() => null)
    const data = await response?.json().catch(() => ({}))
    setBusy(false)
    if (!response?.ok) return setError(data?.error || "Unable to request support access")
    setPurpose("")
    setMessage("Request sent. A platform operator may receive temporary, read-only diagnostics access after approval.")
    await refresh()
  }

  async function revoke(id: string) {
    if (!window.confirm("Revoke this support request or active grant?")) return
    const response = await fetch(`/api/account/support/${id}`, { method: "PATCH" }).catch(() => null)
    const data = await response?.json().catch(() => ({}))
    if (!response?.ok) return setError(data?.error || "Unable to revoke support access")
    await refresh()
  }

  return <div className="space-y-4">
    <p className="max-w-2xl text-sm leading-6 text-[#6b6f7e]">Request temporary support. A Super Admin sees only school configuration and aggregate diagnostics; user impersonation and learner-record access are not included. You can revoke an approved grant at any time.</p>
    <form onSubmit={requestAccess} className="space-y-3">
      <label className="block text-xs font-semibold text-[#555a6a]">What issue should support investigate?<textarea required minLength={15} maxLength={1000} rows={3} value={purpose} onChange={(event) => setPurpose(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#e0e2e8] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#4262ff]" placeholder="Describe the configuration or platform issue. Do not include learner names or sensitive records." /></label>
      <button type="submit" disabled={busy} className="min-h-10 rounded-lg bg-[#1c1c1e] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Sending…" : "Request support access"}</button>
    </form>
    {error && <p role="alert" className="text-sm font-semibold text-[#9b3030]">{error}</p>}{message && <p role="status" className="text-sm font-semibold text-[#14664a]">{message}</p>}
    {loading ? <p className="text-xs text-[#8e91a0]">Loading requests…</p> : requests.length > 0 && <ul className="divide-y divide-[#eef0f3] rounded-xl border border-[#eef0f3]">{requests.map((item) => <li key={item.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusTone[item.status] ?? "bg-[#f0f1f3] text-[#6b6f7e]"}`}>{item.status}</span><span className="text-[11px] text-[#8e91a0]">{new Date(item.requestedAt).toLocaleString()}</span></div><p className="mt-2 text-sm text-[#555a6a]">{item.purpose}</p>{item.status === "APPROVED" && item.expiresAt && <p className="mt-1 text-xs text-[#14664a]">Expires {new Date(item.expiresAt).toLocaleString()}</p>}</div>{["PENDING", "APPROVED"].includes(item.status) && <button type="button" onClick={() => revoke(item.id)} className="self-start rounded-lg border border-[#e0b9b9] px-3 py-2 text-xs font-semibold text-[#9b3030]">Revoke</button>}</li>)}</ul>}
  </div>
}
