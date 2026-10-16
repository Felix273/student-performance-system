"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

type RequestItem = { id: string; schoolId: string; requestType: string; status: string; reason: string | null; reviewNotes: string | null; createdAt: string; school: { id: string; name: string; domain: string }; requestedBy: { name: string; email: string } | null }

export default function DataRequestManager({ requests }: { requests: RequestItem[] }) {
  const router = useRouter()
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [legalReviewed, setLegalReviewed] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState("")
  const [error, setError] = useState("")

  async function update(item: RequestItem, status: string) {
    setBusy(item.id)
    setError("")
    const response = await fetch(`/api/platform/data-requests/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, reviewNotes: notes[item.id] ?? item.reviewNotes ?? "", legalReviewed: legalReviewed[item.id] === true }) }).catch(() => null)
    const data = await response?.json().catch(() => ({}))
    setBusy("")
    if (!response?.ok) return setError(data?.error || "Unable to update request")
    router.refresh()
  }

  return <div className="space-y-4">
    {error && <p role="alert" className="rounded-lg bg-[#fff1f1] px-4 py-3 text-sm font-semibold text-[#9b3030]">{error}</p>}
    <p className="rounded-xl border border-[#e9ca77] bg-[#fff8dc] px-4 py-3 text-sm leading-6 text-[#6f5715]">Approving a deletion request is not deletion. Consult counsel and retention policy, then process the request through an approved procedure before marking it complete. This application does not permanently erase school records.</p>
    <section className="miro-surface overflow-hidden"><div className="divide-y divide-[#eef0f3]">
      {requests.map((item) => <article key={item.id} className="space-y-4 p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold">{item.school.name}</h2><span className="rounded-full bg-[#e7edff] px-2.5 py-1 text-[10px] font-bold text-[#3550d6]">{item.requestType}</span><span className="rounded-full bg-[#f0f1f3] px-2.5 py-1 text-[10px] font-bold text-[#555a6a]">{item.status.replaceAll("_", " ")}</span></div><p className="mt-1 text-xs text-[#8e91a0]">{item.school.domain} · {item.requestedBy?.name ?? item.requestedBy?.email ?? "former account"} · {new Date(item.createdAt).toLocaleString()}</p></div></div>
        <p className="whitespace-pre-wrap text-sm leading-6 text-[#555a6a]">{item.reason}</p>
        {!["COMPLETED", "REJECTED"].includes(item.status) && <><label className="block text-xs font-semibold text-[#555a6a]">Review notes<textarea value={notes[item.id] ?? item.reviewNotes ?? ""} onChange={(event) => setNotes({ ...notes, [item.id]: event.target.value })} maxLength={2000} rows={2} className="mt-1.5 w-full rounded-lg border border-[#e0e2e8] px-3.5 py-2.5 text-sm outline-none focus:border-[#4262ff]" /></label><div className="flex flex-wrap gap-2"><button type="button" disabled={busy === item.id} onClick={() => update(item, "IN_REVIEW")} className="rounded-lg border border-[#d9dce5] px-3.5 py-2 text-xs font-semibold">Mark in review</button><button type="button" disabled={busy === item.id} onClick={() => update(item, "APPROVED")} className="rounded-lg bg-[#14664a] px-3.5 py-2 text-xs font-semibold text-white">Approve request</button><button type="button" disabled={busy === item.id} onClick={() => update(item, "REJECTED")} className="rounded-lg border border-[#e0b9b9] px-3.5 py-2 text-xs font-semibold text-[#9b3030]">Reject</button><button type="button" disabled={busy === item.id} onClick={() => update(item, "COMPLETED")} className="rounded-lg bg-[#1c1c1e] px-3.5 py-2 text-xs font-semibold text-white">Mark workflow complete</button></div><label className="flex items-start gap-2 text-xs text-[#555a6a]"><input type="checkbox" checked={legalReviewed[item.id] ?? false} onChange={(event) => setLegalReviewed({ ...legalReviewed, [item.id]: event.target.checked })} className="mt-0.5" /><span>I confirm the applicable retention, legal, and school-authority review has been completed. (Required to mark complete.)</span></label></>}
      </article>)}
      {!requests.length && <p className="px-6 py-12 text-center text-sm text-[#8e91a0]">No school data requests.</p>}
    </div></section>
  </div>
}
