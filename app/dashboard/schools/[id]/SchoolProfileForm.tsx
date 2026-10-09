"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type Props = { school: { id: string; name: string; domain: string } }

export default function SchoolProfileForm({ school }: Props) {
  const router = useRouter()
  const [name, setName] = useState(school.name)
  const [domain, setDomain] = useState(school.domain)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setMessage("")
    setError("")
    try {
      const response = await fetch(`/api/schools/${school.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, domain }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Unable to update school")
      setName(result.school.name)
      setDomain(result.school.domain)
      setMessage("School profile updated.")
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update school")
    } finally {
      setLoading(false)
    }
  }

  return <form onSubmit={save} className="mt-7 space-y-5">
    <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-[.14em] text-[#6b6f7e]">School name</span><input required value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-xl border border-[#e0e2e8] bg-white px-4 py-3 text-sm outline-none focus:border-[#4262ff]" /></label>
    <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-[.14em] text-[#6b6f7e]">Tenant domain</span><input required value={domain} onChange={(event) => setDomain(event.target.value.toLowerCase().replace(/\s/g, "-"))} className="w-full rounded-xl border border-[#e0e2e8] bg-white px-4 py-3 font-mono text-sm outline-none focus:border-[#4262ff]" /><span className="mt-2 block text-xs text-[#8e91a0]">Lowercase letters, numbers, and hyphens only.</span></label>
    {error && <p role="alert" className="rounded-xl bg-[#fff1f1] px-4 py-3 text-sm font-semibold text-[#a33a3a]">{error}</p>}
    {message && <p role="status" className="rounded-xl bg-[#c3faf5] px-4 py-3 text-sm font-semibold text-[#187574]">{message}</p>}
    <button disabled={loading} className="miro-pill bg-[#1c1c1e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2c2c34] disabled:opacity-50">{loading ? "Saving…" : "Save profile →"}</button>
  </form>
}
