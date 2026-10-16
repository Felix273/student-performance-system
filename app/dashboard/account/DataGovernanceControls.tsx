"use client"

import { useEffect, useState } from "react"

type RequestRow = { id: string; status: string; requestType: string; reason: string | null; reviewNotes: string | null; createdAt: string; reviewedAt: string | null }

export default function DataGovernanceControls() {
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  async function refresh() {
    const response = await fetch("/api/account/data-requests", { cache: "no-store" })
    const data = await response.json()
    if (response.ok) setRequests(data.requests)
    else setError(data.error || "Unable to load data requests")
    setLoading(false)
  }

  useEffect(() => { void refresh() }, [])

  async function downloadExport() {
    setBusy("export")
    setError("")
    setMessage("")
    const response = await fetch("/api/account/data-export", { cache: "no-store" }).catch(() => null)
    if (!response?.ok) {
      const data = await response?.json().catch(() => ({}))
      setError(data?.error || "Unable to export school data")
      setBusy("")
      return
    }
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `school-data-export-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setBusy("")
    setMessage("School data export downloaded. Store it securely; it contains personal data.")
  }

  async function requestDeletion(event: React.FormEvent) {
    event.preventDefault()
    if (!window.confirm("Submit a school-data deletion request for review? No data will be erased by submitting this request.")) return
    setBusy("deletion")
    setError("")
    setMessage("")
    const response = await fetch("/api/account/data-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestType: "DELETION", reason }) }).catch(() => null)
    const data = await response?.json().catch(() => ({}))
    setBusy("")
    if (!response?.ok) return setError(data?.error || "Unable to submit deletion request")
    setReason("")
    setMessage("Deletion request submitted for review. No records were deleted.")
    await refresh()
  }

  return <div className="space-y-6">
    <div><p className="max-w-2xl text-sm leading-6 text-[#6b6f7e]">Export school-owned data or submit a deletion request for documented review. A request does not automatically delete records; retention and legal obligations must be reviewed first.</p><button type="button" onClick={downloadExport} disabled={busy === "export"} className="mt-4 min-h-10 rounded-lg border border-[#d9dce5] px-4 py-2.5 text-sm font-semibold text-[#1c1c1e] disabled:opacity-50">{busy === "export" ? "Preparing export…" : "Download school data export"}</button></div>
    <form onSubmit={requestDeletion} className="space-y-3 border-t border-[#eef0f3] pt-5"><label className="block text-xs font-semibold text-[#555a6a]">Deletion request reason<textarea required minLength={15} maxLength={1000} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#e0e2e8] px-3.5 py-2.5 text-sm outline-none focus:border-[#4262ff]" placeholder="Describe the request and affected school records, without including learner details." /></label><button type="submit" disabled={busy === "deletion"} className="min-h-10 rounded-lg border border-[#e0b9b9] px-4 py-2.5 text-sm font-semibold text-[#9b3030] disabled:opacity-50">{busy === "deletion" ? "Submitting…" : "Submit deletion request"}</button></form>
    {error && <p role="alert" className="rounded-lg bg-[#fff1f1] px-4 py-3 text-sm font-semibold text-[#9b3030]">{error}</p>}{message && <p role="status" className="rounded-lg bg-[#effbf6] px-4 py-3 text-sm font-semibold text-[#14664a]">{message}</p>}
    {loading ? <p className="text-xs text-[#8e91a0]">Loading requests…</p> : requests.length > 0 && <ul className="divide-y divide-[#eef0f3] rounded-xl border border-[#eef0f3]">{requests.map((item) => <li key={item.id} className="p-4"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#e7edff] px-2.5 py-1 text-[10px] font-bold text-[#3550d6]">{item.requestType}</span><span className="rounded-full bg-[#f0f1f3] px-2.5 py-1 text-[10px] font-bold text-[#555a6a]">{item.status.replaceAll("_", " ")}</span><span className="text-[11px] text-[#8e91a0]">{new Date(item.createdAt).toLocaleString()}</span></div><p className="mt-2 text-sm text-[#555a6a]">{item.reason}</p>{item.reviewNotes && <p className="mt-1 text-xs text-[#8e91a0]">Review: {item.reviewNotes}</p>}</li>)}</ul>}
  </div>
}
