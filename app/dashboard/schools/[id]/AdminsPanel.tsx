"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type Admin = { id: string; name: string; email: string; lastLoginAt: string | null; invitePending: boolean }
type Delivery = { emailed: boolean; link?: string; expiresAt: string; who: string }

const input = "w-full rounded-lg border border-[#e0e2e8] bg-[#f7f8fa] px-3.5 py-2.5 text-sm outline-none focus:border-[#4262ff] focus:bg-white"

export default function AdminsPanel({ schoolId, admins }: { schoolId: string; admins: Admin[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [delivery, setDelivery] = useState<Delivery | null>(null)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [copied, setCopied] = useState(false)

  async function call(key: string, url: string, body: unknown, who: string) {
    setBusy(key)
    setError("")
    setDelivery(null)
    setCopied(false)
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) }).catch(() => null)
    const data = await response?.json().catch(() => ({}))
    setBusy(null)
    if (!response?.ok) return setError(data?.error || "Something went wrong. Please try again.")
    const result = data.invite ?? data
    setDelivery({ emailed: result.emailed, link: result.link, expiresAt: result.expiresAt, who })
    router.refresh()
    return true
  }

  async function add(event: React.FormEvent) {
    event.preventDefault()
    if (await call("add", `/api/schools/${schoolId}/admins`, { name, email }, email)) {
      setAdding(false)
      setName("")
      setEmail("")
    }
  }

  return (
    <section className="miro-surface p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#8e91a0]">Access</p>
          <h2 className="mt-2 text-2xl font-medium tracking-tight">School administrators</h2>
          <p className="mt-2 text-sm leading-6 text-[#6b6f7e]">Recover access or add another owner. Every action is recorded in the audit log.</p>
        </div>
        <button type="button" onClick={() => setAdding(!adding)} className="shrink-0 rounded-xl bg-[#1c1c1e] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2c2c34]">{adding ? "Cancel" : "Add administrator"}</button>
      </div>

      {adding && (
        <form onSubmit={add} className="mt-5 grid gap-3 rounded-2xl bg-[#fafbfc] p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="text-xs font-semibold text-[#555a6a]">Name<input required value={name} onChange={(event) => setName(event.target.value)} className={`${input} mt-1`} /></label>
          <label className="text-xs font-semibold text-[#555a6a]">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={`${input} mt-1`} /></label>
          <button type="submit" disabled={busy === "add"} className="rounded-lg bg-[#4262ff] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy === "add" ? "Sending…" : "Send invite"}</button>
        </form>
      )}

      {error && <div role="alert" className="mt-5 rounded-xl border border-[#ffc6c6] bg-[#fff1f1] px-4 py-3 text-sm font-semibold text-[#9b3030]">{error}</div>}

      {delivery && (
        <div role="status" className="mt-5 rounded-xl border border-[#bfe9d9] bg-[#effbf6] px-4 py-3 text-sm text-[#14664a]">
          {delivery.emailed ? (
            <p className="font-semibold">A secure link was emailed to {delivery.who}. It works once.</p>
          ) : (
            <div className="space-y-2">
              <p className="font-semibold">Email isn’t configured, so no message was sent. Share this link with {delivery.who} privately. It works once and won’t be shown again.</p>
              <code className="block break-all rounded-lg bg-white p-3 font-mono text-xs text-[#1c1c1e]">{delivery.link}</code>
              <button type="button" onClick={() => { navigator.clipboard?.writeText(delivery.link ?? ""); setCopied(true) }} className="text-xs font-bold underline">{copied ? "Copied" : "Copy link"}</button>
            </div>
          )}
        </div>
      )}

      {admins.length ? (
        <ul className="mt-6 divide-y divide-[#eef0f3]">
          {admins.map((admin) => (
            <li key={admin.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#1c1c1e]">{admin.name}</p>
                <p className="truncate text-xs text-[#6b6f7e]">{admin.email}</p>
                <p className="mt-1 text-xs text-[#8e91a0]">{admin.invitePending ? "Invite pending — hasn’t signed in yet" : admin.lastLoginAt ? `Last sign-in ${new Date(admin.lastLoginAt).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}` : "Never signed in"}</p>
              </div>
              <button type="button" disabled={busy === admin.id} onClick={() => call(admin.id, `/api/schools/${schoolId}/admins/${admin.id}/reset-link`, {}, admin.email)} className="shrink-0 rounded-lg border border-[#e0e2e8] px-3.5 py-2 text-xs font-semibold text-[#1c1c1e] hover:bg-[#f7f8fa] disabled:opacity-50">{busy === admin.id ? "Working…" : admin.invitePending ? "Resend invite" : "Send reset link"}</button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 rounded-xl bg-[#fff4c4] px-4 py-3 text-sm font-semibold text-[#746019]">This school has no administrator. Add one so it can finish setup.</p>
      )}
    </section>
  )
}
