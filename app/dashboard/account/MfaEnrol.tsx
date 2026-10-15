"use client"

import { useEffect, useRef, useState } from "react"
import { signOut } from "next-auth/react"

type Setup = { secret: string; qr: string }

export default function MfaEnrol() {
  const [setup, setSetup] = useState<Setup | null>(null)
  const [code, setCode] = useState("")
  const [codes, setCodes] = useState<string[] | null>(null)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    fetch("/api/account/mfa/setup", { method: "POST" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}))
        if (!response.ok) setError(data.error || "Unable to start setup")
        else setSetup(data)
      })
      .catch(() => setError("Unable to start setup"))
  }, [])

  async function verify(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError("")
    const response = await fetch("/api/account/mfa/enable", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) }).catch(() => null)
    const data = await response?.json().catch(() => ({}))
    if (response?.ok) setCodes(data.recoveryCodes)
    else setError(data?.error || "Something went wrong. Please try again.")
    setLoading(false)
  }

  async function finish() {
    await signOut({ redirect: false })
    window.location.href = "/login"
  }

  if (codes) {
    return (
      <div className="max-w-md space-y-5">
        <h2 className="text-xl font-medium tracking-[-.03em]">Save your recovery codes</h2>
        <p className="text-sm leading-6 text-[#6b6f7e]">Each code works once if you lose your phone. They are shown only now. Store them in a password manager or print them.</p>
        <ul className="grid grid-cols-2 gap-2 rounded-xl bg-[#f7f8fa] p-4 font-mono text-sm font-semibold">{codes.map((entry) => <li key={entry}>{entry}</li>)}</ul>
        <button type="button" onClick={() => navigator.clipboard?.writeText(codes.join("\n"))} className="text-sm font-semibold text-[#4262ff] hover:underline">Copy all</button>
        <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={saved} onChange={(event) => setSaved(event.target.checked)} className="mt-1" /><span>I have saved these codes somewhere safe.</span></label>
        <button type="button" disabled={!saved} onClick={finish} className="min-h-11 rounded-lg bg-[#1c1c1e] px-5 text-sm font-semibold text-white disabled:opacity-50">Continue to sign in</button>
      </div>
    )
  }

  return (
    <div className="max-w-md space-y-5">
      <h2 className="text-xl font-medium tracking-[-.03em]">Set up two-factor authentication</h2>
      <p className="text-sm leading-6 text-[#6b6f7e]">Platform operator accounts need a second step at sign-in. Scan the code with an authenticator app (Google Authenticator, 1Password, Authy), then enter the 6-digit code it shows.</p>
      {setup ? (
        <>
          <img src={setup.qr} alt="QR code for your authenticator app" width={220} height={220} className="rounded-xl border border-[#e0e2e8]" />
          <p className="text-xs text-[#6b6f7e]">Can’t scan? Enter this key manually: <code className="break-all font-mono font-semibold text-[#1c1c1e]">{setup.secret}</code></p>
          <form onSubmit={verify} className="space-y-4">
            <input inputMode="numeric" autoComplete="one-time-code" required maxLength={7} value={code} onChange={(event) => setCode(event.target.value)} placeholder="123456" aria-label="6-digit code" className="w-full rounded-lg border border-[#e0e2e8] bg-[#f7f8fa] px-3.5 py-3 text-center font-mono text-lg tracking-[.4em] outline-none focus:border-[#4262ff] focus:bg-white" />
            {error && <div role="alert" className="rounded-lg border border-[#ffc6c6] bg-[#fff1f1] px-4 py-3 text-sm font-semibold text-[#9b3030]">{error}</div>}
            <button type="submit" disabled={loading} className="min-h-11 rounded-lg bg-[#1c1c1e] px-5 text-sm font-semibold text-white disabled:opacity-50">{loading ? "Checking…" : "Turn on two-factor"}</button>
          </form>
        </>
      ) : error ? <div role="alert" className="rounded-lg border border-[#ffc6c6] bg-[#fff1f1] px-4 py-3 text-sm font-semibold text-[#9b3030]">{error}</div> : <p className="text-sm text-[#6b6f7e]">Preparing your code…</p>}
    </div>
  )
}
