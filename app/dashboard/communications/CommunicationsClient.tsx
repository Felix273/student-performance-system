"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type ClassOption = {
  id: string
  name: string
  grade: string
}

type SmsLog = {
  id: string
  recipient: string
  message: string
  status: string
  category: string
  cost: string | null
  createdAt: string
  sentBy: { name: string; email: string } | null
}

type TargetAudience = "ALL_PARENTS" | "CLASS" | "TEACHERS" | "CUSTOM"

export default function CommunicationsClient({
  classes,
  initialLogs,
  schoolName,
}: {
  classes: ClassOption[]
  initialLogs: SmsLog[]
  schoolName: string
}) {
  const router = useRouter()
  const [logs, setLogs] = useState<SmsLog[]>(initialLogs)
  const [targetGroup, setTargetGroup] = useState<TargetAudience>("CUSTOM")
  const [classId, setClassId] = useState(classes[0]?.id || "")
  const [customPhones, setCustomPhones] = useState("+254114295869")
  const [message, setMessage] = useState("Good morning. This is an official notice from Ongata Academy.")
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState("")
  const [error, setError] = useState("")

  const charCount = message.length
  const smsSegments = Math.ceil(charCount / 160) || 1

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setFeedback("")
    setError("")

    try {
      const res = await fetch("/api/sms/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetGroup,
          classId: targetGroup === "CLASS" ? classId : undefined,
          customPhones: targetGroup === "CUSTOM" ? customPhones : undefined,
          message,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to dispatch SMS")

      setFeedback(data.message || "SMS broadcast dispatched successfully.")

      // Refresh log list
      const updated = await fetch("/api/sms/broadcast").then((r) => r.json())
      if (updated.logs) setLogs(updated.logs)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error sending SMS broadcast")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header */}
      <section className="flex flex-col justify-between gap-6 border-b border-[#e0e2e8] pb-8 sm:flex-row sm:items-end">
        <div>
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[.2em] text-[#187574]">
            SMS & Direct Alerts
          </p>
          <h1 className="text-4xl font-medium tracking-[-.055em] text-[#1c1c1e] sm:text-5xl">
            School Communications
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b6f7e]">
            Send instant SMS alerts to parents, dispatch class circulars, and monitor real-time delivery via Africa&apos;s Talking.
          </p>
        </div>

        <div className="rounded-[16px] bg-[#c3faf5] px-5 py-3 text-right border border-[#9fdcd4]">
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#187574]">Africa&apos;s Talking API</p>
          <p className="mt-0.5 text-xs font-bold text-[#1c1c1e]">SMS Gateway Active</p>
        </div>
      </section>

      {/* Main Grid: Composer & Delivery Ledger */}
      <div className="grid gap-7 xl:grid-cols-[.82fr_1.18fr]">
        {/* 1. SMS Composer */}
        <section className="miro-surface p-6 sm:p-8 self-start">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#8e91a0]">Broadcast Composer</p>
            <h2 className="mt-1 text-2xl font-medium tracking-tight text-[#1c1c1e]">New SMS Broadcast</h2>
            <p className="mt-1 text-xs text-[#6b6f7e]">
              Messages will be automatically prefixed with <strong className="text-[#1c1c1e]">{schoolName}:</strong>
            </p>
          </div>

          {feedback && (
            <div role="status" className="mt-4 rounded-xl bg-[#c3faf5] px-4 py-3 text-xs font-semibold text-[#187574]">
              {feedback}
            </div>
          )}
          {error && (
            <div role="alert" className="mt-4 rounded-xl bg-[#fff1f1] px-4 py-3 text-xs font-semibold text-[#a33a3a]">
              {error}
            </div>
          )}

          <form onSubmit={handleSend} className="mt-6 space-y-4">
            <div>
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#6b6f7e]">
                Target Audience
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {[
                  { id: "CUSTOM" as const, label: "Direct Number" },
                  { id: "ALL_PARENTS" as const, label: "All Parents" },
                  { id: "CLASS" as const, label: "Class" },
                  { id: "TEACHERS" as const, label: "Staff" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTargetGroup(opt.id)}
                    className={`rounded-xl border p-2.5 font-semibold transition ${
                      targetGroup === opt.id
                        ? "border-[#1c1c1e] bg-[#1c1c1e] text-white"
                        : "border-[#e0e2e8] bg-white text-[#555a6a] hover:bg-[#f7f8fa]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {targetGroup === "CUSTOM" && (
              <label className="block text-xs font-bold uppercase tracking-wide text-[#6b6f7e] animate-fade-in">
                Phone Number(s) <span className="text-red-500">*</span>
                <input
                  required
                  type="text"
                  value={customPhones}
                  onChange={(e) => setCustomPhones(e.target.value)}
                  placeholder="e.g. 0712345678, +254114295869"
                  className="mt-1.5 w-full rounded-xl border border-[#dfe2e8] bg-white px-3.5 py-2.5 font-mono text-xs outline-none focus:border-[#4262ff]"
                />
                <span className="mt-1 block text-[10px] text-[#8e91a0] normal-case">
                  Separate multiple numbers with commas. Supports standard Kenyan numbers (07xx, 01xx, +254).
                </span>
              </label>
            )}

            {targetGroup === "CLASS" && (
              <label className="block text-xs font-bold uppercase tracking-wide text-[#6b6f7e] animate-fade-in">
                Select Class / Stream
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe2e8] bg-white px-3.5 py-2.5 text-xs font-semibold text-[#1c1c1e] outline-none focus:border-[#4262ff]"
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} (Grade {cls.grade})
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold uppercase tracking-wide text-[#6b6f7e]">
                  Message Body <span className="text-red-500">*</span>
                </span>
                <span className="text-[11px] font-mono text-[#8e91a0]">
                  {charCount} chars · {smsSegments} SMS {smsSegments === 1 ? "page" : "pages"}
                </span>
              </div>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your SMS message here…"
                className="w-full rounded-xl border border-[#dfe2e8] p-3 text-xs outline-none focus:border-[#4262ff]"
              />
            </div>

            <div className="rounded-xl bg-[#fbfbfc] border border-[#e0e2e8] p-3 text-[11px] text-[#6b6f7e]">
              <span className="font-semibold block mb-0.5">Live Preview:</span>
              <p className="font-mono text-slate-800">
                {schoolName}: {message || "Your message will appear here…"}
              </p>
            </div>

            <button
              type="submit"
              disabled={sending || !message.trim()}
              className="miro-pill w-full bg-[#1c1c1e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2c2c34] disabled:opacity-50"
            >
              {sending ? "Dispatching SMS…" : "Send Broadcast SMS →"}
            </button>
          </form>
        </section>

        {/* 2. Delivery Ledger */}
        <section className="miro-surface overflow-hidden">
          <div className="border-b border-[#eef0f3] p-6 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#8e91a0]">Gateway Ledger</p>
              <h2 className="mt-1 text-2xl font-medium tracking-tight text-[#1c1c1e]">Recent Dispatches</h2>
            </div>
            <span className="miro-pill bg-[#c3faf5] px-3 py-1 text-xs font-semibold text-[#187574]">
              {logs.length} logged
            </span>
          </div>

          {logs.length === 0 ? (
            <div className="p-12 text-center text-sm text-[#8e91a0]">
              No SMS alerts sent yet. Automated triggers (fee payments & absence) and broadcasts will appear here.
            </div>
          ) : (
            <div className="divide-y divide-[#eef0f3] max-h-[580px] overflow-y-auto">
              {logs.map((log) => (
                <div key={log.id} className="p-4 sm:p-5 hover:bg-[#fafbfc] transition space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#1c1c1e]">{log.recipient}</span>
                      <span
                        className={`miro-pill px-2 py-0.5 text-[9px] font-bold ${
                          log.category === "FEE_RECEIPT"
                            ? "bg-[#eff9f6] text-[#187574]"
                            : log.category === "ATTENDANCE_ALERT"
                            ? "bg-red-100 text-red-700"
                            : "bg-[#e7edff] text-[#4262ff]"
                        }`}
                      >
                        {log.category.replace(/_/g, " ")}
                      </span>
                    </div>

                    <span className="font-mono text-[11px] text-[#8e91a0]">
                      {new Date(log.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <p className="text-xs text-[#555a6a] font-mono leading-relaxed bg-[#f7f8fa] p-2.5 rounded-lg border border-[#eef0f3]">
                    {log.message}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-[#8e91a0] pt-0.5">
                    <span>Status: <strong className="text-slate-700">{log.status}</strong></span>
                    {log.cost && <span>Cost: {log.cost}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
