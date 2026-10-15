"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

type SchoolStatus = "ACTIVE" | "SUSPENDED" | "ARCHIVED"

export default function SchoolLifecyclePanel({ school }: { school: { id: string; status: SchoolStatus; statusReason: string | null; statusChangedAt: string } }) {
  const router = useRouter()
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  async function changeStatus(status: SchoolStatus) {
    if (status !== "ACTIVE" && reason.trim().length < 5) {
      setError("Enter a reason of at least five characters.")
      return
    }
    const label = status === "ACTIVE" ? "reactivate" : status.toLowerCase()
    if (!window.confirm(`Confirm ${label} school access? All current school sessions will be signed out.`)) return

    setBusy(true)
    setError("")
    setMessage("")
    const response = await fetch(`/api/schools/${school.id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reason }),
    }).catch(() => null)
    const data = await response?.json().catch(() => ({}))
    setBusy(false)
    if (!response?.ok) {
      setError(data?.error || "Unable to update school status.")
      return
    }
    setReason("")
    setMessage(status === "ACTIVE" ? "School reactivated. Users can sign in again." : `School ${status.toLowerCase()}. All school sessions were revoked.`)
    router.refresh()
  }

  const statusLabel = school.status.charAt(0) + school.status.slice(1).toLowerCase()

  return (
    <section className="miro-surface space-y-5 p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#8e91a0]">Lifecycle</p>
          <h2 className="mt-2 text-xl font-medium">School access</h2>
          <p className="mt-1 text-xs text-[#6b6f7e]">Current status: <strong>{statusLabel}</strong> · changed {new Date(school.statusChangedAt).toLocaleDateString()}</p>
        </div>
        {school.status !== "ACTIVE" && <span className="rounded-full bg-[#fff4c4] px-3 py-1.5 text-xs font-semibold text-[#746019]">{school.status === "ARCHIVED" ? "Archived" : "Suspended"}</span>}
      </div>
      {school.statusReason && <p className="rounded-xl bg-[#f7f8fa] px-4 py-3 text-sm text-[#555a6a]">Reason: {school.statusReason}</p>}
      {school.status === "ACTIVE" ? (
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-[#555a6a]">Reason for changing access<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={2} className="mt-1.5 w-full rounded-lg border border-[#e0e2e8] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#4262ff]" placeholder="Required for suspension or archive" /></label>
          <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => changeStatus("SUSPENDED")} className="rounded-lg border border-[#d9a428] px-4 py-2.5 text-sm font-semibold text-[#746019] disabled:opacity-50">{busy ? "Updating…" : "Suspend access"}</button><button type="button" disabled={busy} onClick={() => changeStatus("ARCHIVED")} className="rounded-lg border border-[#e0b9b9] px-4 py-2.5 text-sm font-semibold text-[#9b3030] disabled:opacity-50">Archive school</button></div>
        </div>
      ) : <button type="button" disabled={busy} onClick={() => changeStatus("ACTIVE")} className="min-h-11 rounded-lg bg-[#1c1c1e] px-5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Updating…" : "Reactivate school"}</button>}
      {error && <p role="alert" className="text-sm font-semibold text-[#9b3030]">{error}</p>}
      {message && <p role="status" className="text-sm font-semibold text-[#14664a]">{message}</p>}
    </section>
  )
}