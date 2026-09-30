"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function ReportCardComments({ reportCardId, disabled }: { reportCardId: string; disabled: boolean }) {
  const router = useRouter()
  const [body, setBody] = useState("")
  const [audience, setAudience] = useState("FAMILY")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [open, setOpen] = useState(false)
  if (disabled) return null

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true); setMessage("")
    try {
      const response = await fetch(`/api/report-cards/${reportCardId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, audience }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Unable to save comment")
      setBody("")
      setOpen(false)
      setMessage("Comment saved")
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save comment")
    } finally { setBusy(false) }
  }

  return <div className="mt-3">
    {!open ? <button type="button" onClick={() => setOpen(true)} className="text-xs font-semibold text-slate-600 underline decoration-slate-300 underline-offset-4">Add a comment</button> : <form onSubmit={submit} className="rounded-lg bg-slate-50 p-3">
      <label className="block text-[11px] font-semibold text-slate-700">Add a comment before publication</label>
      <div className="mt-2 flex flex-wrap gap-2"><select value={audience} onChange={(event) => setAudience(event.target.value)} disabled={busy} className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs"><option value="FAMILY">Visible to family</option><option value="LEARNER">Visible to learner</option><option value="STAFF">Staff only</option></select><input value={body} onChange={(event) => setBody(event.target.value)} disabled={busy} maxLength={5000} placeholder="Write a concise progress note…" className="min-w-[12rem] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs" /><button disabled={busy || !body.trim()} className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-800 ring-1 ring-slate-300 disabled:opacity-40">{busy ? "Saving…" : "Add comment"}</button><button type="button" disabled={busy} onClick={() => setOpen(false)} className="rounded-full px-3 py-2 text-xs text-slate-500">Cancel</button></div>
    </form>}
    {message && <p role="status" className="mt-2 text-xs text-slate-600">{message}</p>}
  </div>
}
