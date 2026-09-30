"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type FrozenSection = { code: string; title: string; isEnabled: boolean }
type ExistingComment = { id: string; sectionCode: string | null; audience: string; body: string; createdAt: string; author: { name: string } }

const audienceLabels: Record<string, string> = { FAMILY: "Parent / family", LEARNER: "Learner", STAFF: "Staff only" }

export default function ReportCardComments({
  reportCardId,
  disabled,
  sections,
  comments,
}: {
  reportCardId: string
  disabled: boolean
  sections: FrozenSection[]
  comments: ExistingComment[]
}) {
  const router = useRouter()
  const [body, setBody] = useState("")
  const [audience, setAudience] = useState("FAMILY")
  const [sectionCode, setSectionCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [open, setOpen] = useState(false)
  const enabledSections = sections.filter((section) => section.isEnabled)
  const sectionTitle = (code: string | null) => enabledSections.find((section) => section.code === code)?.title || "General comment"

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setMessage("")
    try {
      const response = await fetch(`/api/report-cards/${reportCardId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, audience, sectionCode: sectionCode || undefined }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || "Unable to save comment")
      setBody("")
      setSectionCode("")
      setOpen(false)
      setMessage("Comment saved")
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save comment")
    } finally {
      setBusy(false)
    }
  }

  return <div className="mt-3">
    {comments.length > 0 && <section aria-label="Report comments" className="mb-3 space-y-2">
      {comments.map((comment) => <article key={comment.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-2"><span className="text-[11px] font-semibold text-slate-800">{sectionTitle(comment.sectionCode)}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">{audienceLabels[comment.audience] || comment.audience}</span><span className="ml-auto text-[10px] text-slate-500">{comment.author.name} · {new Date(comment.createdAt).toLocaleDateString("en-GB")}</span></div>
        <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-700">{comment.body}</p>
      </article>)}
    </section>}
    {!disabled && (!open ? <button type="button" onClick={() => setOpen(true)} className="text-xs font-semibold text-slate-600 underline decoration-slate-300 underline-offset-4">Add a comment</button> : <form onSubmit={submit} className="rounded-lg bg-slate-50 p-3">
      <p className="text-[11px] font-semibold text-slate-700">Add a comment to this draft snapshot</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <label className="block"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Report section</span><select value={sectionCode} onChange={(event) => setSectionCode(event.target.value)} disabled={busy} className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs"><option value="">General comment</option>{enabledSections.map((section) => <option key={section.code} value={section.code}>{section.title}</option>)}</select></label>
        <label className="block"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Visible to</span><select value={audience} onChange={(event) => setAudience(event.target.value)} disabled={busy} className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs"><option value="FAMILY">Parent / family</option><option value="LEARNER">Learner</option><option value="STAFF">Staff only</option></select></label>
      </div>
      <label className="mt-2 block"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Comment</span><textarea value={body} onChange={(event) => setBody(event.target.value)} disabled={busy} maxLength={5000} rows={3} required placeholder="Write a concise progress note…" className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs leading-5" /></label>
      <div className="mt-2 flex flex-wrap justify-end gap-2"><button disabled={busy} type="button" onClick={() => setOpen(false)} className="rounded-full px-3 py-2 text-xs text-slate-500">Cancel</button><button disabled={busy || !body.trim()} className="rounded-full bg-[#1c1c1e] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">{busy ? "Saving…" : "Add comment"}</button></div>
    </form>)}
    {message && <p role="status" className="mt-2 text-xs text-slate-600">{message}</p>}
  </div>
}
