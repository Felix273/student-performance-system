"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

export default function CbcStarterButton({ schoolId }: { schoolId: string }) {
  const router = useRouter()
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  async function createStarter() {
    setBusy(true)
    setMessage("")
    setError("")
    const response = await fetch(`/api/schools/${schoolId}/cbc-starter`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ year }) }).catch(() => null)
    const data = await response?.json().catch(() => ({}))
    setBusy(false)
    if (!response?.ok) {
      setError(data?.error || "Unable to create the CBC starter setup")
      return
    }
    setMessage(`${data.academicYear} created with ${data.termsCreated} terms and ${data.gradesAdded} CBC grades. Review the dates with the school administrator.`)
    router.refresh()
  }

  return (
    <section className="miro-surface space-y-4 p-6 sm:p-8">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#8e91a0]">Starter setup</p>
        <h2 className="mt-2 text-xl font-medium">CBC academic year</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-[#6b6f7e]">Creates the year, three starter terms, and a default offering from the published CBC catalog. Dates use a calendar-year template; the school should confirm its term calendar.</p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-semibold text-[#555a6a]">Academic year<input type="number" min="2000" max="2099" value={year} onChange={(event) => setYear(event.target.value)} className="mt-1 block w-32 rounded-lg border border-[#e0e2e8] px-3 py-2.5 text-sm outline-none focus:border-[#4262ff]" /></label>
        <button type="button" disabled={busy || !/^20\d{2}$/.test(year)} onClick={createStarter} className="min-h-10 rounded-lg bg-[#1c1c1e] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Creating…" : "Create CBC starter"}</button>
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-[#9b3030]">{error}</p>}
      {message && <p role="status" className="text-sm font-semibold text-[#14664a]">{message}</p>}
    </section>
  )
}