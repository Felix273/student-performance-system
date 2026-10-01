"use client"

import { useState } from "react"

export default function ReportCardAcknowledgement({ reportCardId, acknowledgedAt }: { reportCardId: string; acknowledgedAt: string | null }) {
  const [acknowledged, setAcknowledged] = useState(Boolean(acknowledgedAt))
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")

  const acknowledge = async () => {
    setBusy(true)
    setMessage("")
    try {
      const response = await fetch(`/api/report-cards/${reportCardId}/acknowledge`, { method: "POST" })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Unable to record acknowledgement")
      setAcknowledged(true)
      setMessage("Acknowledgement recorded")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to record acknowledgement")
    } finally {
      setBusy(false)
    }
  }

  return <div className="flex flex-wrap items-center gap-3">
    {acknowledged ? <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">Acknowledged</span> : <button type="button" onClick={acknowledge} disabled={busy} className="rounded-full bg-[#1c1c1e] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Acknowledge receipt"}</button>}
    {message && <span role="status" className="text-xs text-slate-600">{message}</span>}
  </div>
}
