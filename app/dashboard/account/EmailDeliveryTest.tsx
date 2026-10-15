"use client"

import { useState } from "react"

export default function EmailDeliveryTest() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle")
  const [message, setMessage] = useState("")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  async function send() {
    setState("sending")
    setMessage("")
    setPreviewUrl(null)
    const response = await fetch("/api/account/email/test", { method: "POST" }).catch(() => null)
    const data = await response?.json().catch(() => ({}))
    if (response?.ok) {
      setState("sent")
      setPreviewUrl(data.previewUrl ?? null)
      setMessage(data.previewUrl ? "Development email captured by Ethereal." : `Test email sent to ${data.recipient}. Check your inbox and spam folder.`)
    } else {
      setState("error")
      setMessage(data?.error || "Unable to send the test email.")
    }
  }

  return (
    <div className="space-y-3">
      <p className="max-w-lg text-sm leading-6 text-[#6b6f7e]">Send a test message to your own account email to check the production provider and sender settings.</p>
      <button type="button" onClick={send} disabled={state === "sending"} className="min-h-11 rounded-lg border border-[#e0e2e8] px-5 text-sm font-semibold text-[#1c1c1e] transition hover:bg-[#f7f8fa] disabled:opacity-50">{state === "sending" ? "Sending…" : "Send test email"}</button>
      {message && <p role={state === "error" ? "alert" : "status"} className={`text-sm font-medium ${state === "error" ? "text-[#9b3030]" : "text-[#14664a]"}`}>{message}</p>}
      {previewUrl && <a href={previewUrl} target="_blank" rel="noreferrer" className="block text-sm font-semibold text-[#4262ff] underline">Open test email preview</a>}
    </div>
  )
}