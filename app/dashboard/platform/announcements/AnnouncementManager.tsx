"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

type School = { id: string; name: string }
type Announcement = { id: string; title: string; body: string; kind: string; schoolId: string | null; schoolName: string | null; startsAt: string; endsAt: string | null; isActive: boolean }
const input = "w-full rounded-lg border border-[#e0e2e8] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#4262ff]"

export default function AnnouncementManager({ schools, announcements }: { schools: School[]; announcements: Announcement[] }) {
  const router = useRouter()
  const [form, setForm] = useState({ title: "", body: "", kind: "ANNOUNCEMENT", schoolId: "", startsAt: "", endsAt: "" })
  const [busy, setBusy] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [messageIsWarning, setMessageIsWarning] = useState(false)

  async function create(event: React.FormEvent) {
    event.preventDefault()
    setBusy("create")
    setError("")
    setMessage("")
    setMessageIsWarning(false)
    const response = await fetch("/api/platform/announcements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }).catch(() => null)
    const data = await response?.json().catch(() => ({}))
    setBusy("")
    if (!response?.ok) return setError(data?.error || "Unable to create announcement")
    const notification = data?.emailNotification
    if (form.kind !== "MAINTENANCE") {
      setMessage("Announcement published to the selected audience.")
    } else if (notification?.unavailable) {
      setMessageIsWarning(true)
      setMessage("Maintenance notice published, but email delivery could not be confirmed.")
    } else if (notification?.skipped) {
      setMessage("Maintenance notice published. It has already ended, so no email was sent.")
    } else if (!notification?.recipients) {
      setMessageIsWarning(true)
      setMessage("Maintenance notice published, but no active School Admin email addresses matched the audience.")
    } else if (notification.failed) {
      setMessageIsWarning(true)
      setMessage(`Maintenance notice published. Email sent to ${notification.sent} of ${notification.recipients} School Admins; ${notification.failed} failed.`)
    } else {
      setMessage(`Maintenance notice published and emailed to ${notification.sent} School Admin${notification.sent === 1 ? "" : "s"}.`)
    }
    setForm({ title: "", body: "", kind: "ANNOUNCEMENT", schoolId: "", startsAt: "", endsAt: "" })
    router.refresh()
  }

  async function deactivate(item: Announcement) {
    setBusy(item.id)
    setError("")
    const response = await fetch(`/api/platform/announcements/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: false }) }).catch(() => null)
    const data = await response?.json().catch(() => ({}))
    setBusy("")
    if (!response?.ok) return setError(data?.error || "Unable to end announcement")
    router.refresh()
  }

  return <div className="space-y-7">
    <form onSubmit={create} className="miro-surface space-y-4 p-6 sm:p-8">
      <div><h2 className="text-xl font-medium">Compose</h2><p className="mt-1 text-xs text-[#6b6f7e]">Times use the platform server timezone (UTC).</p></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-semibold text-[#555a6a]">Type<select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value })} className={`${input} mt-1.5`}><option value="ANNOUNCEMENT">Announcement</option><option value="MAINTENANCE">Maintenance</option></select></label>
        <label className="text-xs font-semibold text-[#555a6a]">Audience<select value={form.schoolId} onChange={(event) => setForm({ ...form, schoolId: event.target.value })} className={`${input} mt-1.5`}><option value="">All schools</option>{schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}</select></label>
      </div>
      <label className="block text-xs font-semibold text-[#555a6a]">Title<input required minLength={4} maxLength={120} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className={`${input} mt-1.5`} /></label>
      <label className="block text-xs font-semibold text-[#555a6a]">Message<textarea required minLength={10} maxLength={4000} rows={4} value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} className={`${input} mt-1.5`} /></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold text-[#555a6a]">Starts<input type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} className={`${input} mt-1.5`} /></label><label className="text-xs font-semibold text-[#555a6a]">Ends (optional)<input type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} className={`${input} mt-1.5`} /></label></div>
      {error && <p role="alert" className="rounded-lg bg-[#fff1f1] px-4 py-3 text-sm font-semibold text-[#9b3030]">{error}</p>}{message && <p role="status" className={`rounded-xl px-4 py-3 text-sm font-semibold ${messageIsWarning ? "bg-[#fff4c4] text-[#746019]" : "bg-[#effbf6] text-[#14664a]"}`}>{message}</p>}
      <button type="submit" disabled={busy === "create"} className="min-h-10 rounded-lg bg-[#1c1c1e] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy === "create" ? "Publishing…" : "Publish notice"}</button>
    </form>
    <section className="miro-surface overflow-hidden"><div className="divide-y divide-[#eef0f3]">{announcements.map((item) => <div key={item.id} className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-7"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${item.kind === "MAINTENANCE" ? "bg-[#fff4c4] text-[#746019]" : "bg-[#e7edff] text-[#3550d6]"}`}>{item.kind}</span><span className="text-xs text-[#8e91a0]">{item.schoolName ?? "All schools"} · {item.isActive ? "Active" : "Ended"}</span></div><h3 className="mt-2 text-sm font-semibold">{item.title}</h3><p className="mt-1 whitespace-pre-wrap text-sm text-[#6b6f7e]">{item.body}</p><p className="mt-2 text-[11px] text-[#8e91a0]">{new Date(item.startsAt).toLocaleString()}{item.endsAt ? ` – ${new Date(item.endsAt).toLocaleString()}` : " · no end date"}</p></div>{item.isActive && <button type="button" disabled={busy === item.id} onClick={() => deactivate(item)} className="shrink-0 rounded-lg border border-[#d9dce5] px-3 py-2 text-xs font-semibold disabled:opacity-50">{busy === item.id ? "Ending…" : "End notice"}</button>}</div>)}{!announcements.length && <p className="px-6 py-10 text-center text-sm text-[#8e91a0]">No announcements created.</p>}</div></section>
  </div>
}