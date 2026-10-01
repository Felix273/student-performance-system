"use client"

import { useState } from "react"

type AuditEvent = { id: string; fromStatus: string | null; toStatus: string; actor: { name: string | null } | null; reason: string | null; createdAt: string | Date }

export default function ReportCardAudit({ reportCardId }: { reportCardId: string }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [error, setError] = useState("")

  const toggle = async () => {
    if (open) { setOpen(false); return }
    setOpen(true)
    if (loaded || busy) return
    setBusy(true); setError("")
    try {
      const response = await fetch(`/api/report-cards/${reportCardId}/audit`)
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Unable to load audit history")
      setEvents(result.events || [])
      setLoaded(true)
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load audit history") }
    finally { setBusy(false) }
  }

  return <div className="mt-3">
    <button type="button" onClick={toggle} className="text-xs font-semibold text-slate-600 underline decoration-slate-300 underline-offset-4">{open ? "Hide audit history" : "View audit history"}</button>
    {open && <div className="mt-2 rounded-lg bg-slate-50 p-3">
      {busy ? <p className="text-xs text-slate-500">Loading audit trail…</p> : error ? <p role="alert" className="text-xs text-red-700">{error}</p> : events.length ? <ol className="space-y-2">{events.map((event) => <li key={event.id} className="border-l-2 border-slate-300 pl-3"><p className="text-xs font-semibold text-slate-800">{event.fromStatus || "Created"} → {event.toStatus}</p><p className="mt-0.5 text-[11px] text-slate-600">{event.actor?.name || "System"} · {new Date(event.createdAt).toLocaleString()}</p>{event.reason && <p className="mt-1 text-xs text-slate-600">{event.reason}</p>}</li>)}</ol> : <p className="text-xs text-slate-500">No status events recorded yet.</p>}
    </div>}
  </div>
}
