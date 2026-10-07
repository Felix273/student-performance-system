"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function NewSchoolPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({ name: "", domain: "", adminName: "", adminEmail: "", adminPassword: "" })

  const update = (field: keyof typeof formData, value: string) => setFormData((current) => ({ ...current, [field]: value }))

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    setLoading(true)
    try {
      const response = await fetch("/api/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to create school")
      router.push("/dashboard/schools")
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create school")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-fade-in">
      <div className="flex flex-col gap-4 border-b border-[#e0e2e8] pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/dashboard/schools" className="text-xs font-semibold text-[#4262ff] transition hover:text-[#1c1c1e]">← Platform directory</Link>
          <p className="mt-6 text-[11px] font-bold uppercase tracking-[.2em] text-[#4262ff]">Tenant provisioning</p>
          <h1 className="mt-2 text-4xl font-medium tracking-[-.055em] text-[#1c1c1e] sm:text-5xl">Make room for a new school.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b6f7e]">Create the school workspace and its first administrator. The school team will complete classes, curriculum, and timetable setup from their own secure workspace.</p>
        </div>
        <span className="miro-pill self-start bg-[#c3faf5] px-4 py-2 text-xs font-semibold text-[#187574] sm:self-auto">Platform operator</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[.78fr_1.22fr] lg:items-start">
        <aside className="overflow-hidden rounded-[28px] bg-[#1c1c1e] text-white shadow-[0_18px_60px_rgba(28,28,30,.12)]">
          <div className="relative p-7 sm:p-9">
            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full border-[28px] border-[#ffd02f]/20" />
            <div className="relative">
              <p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#ffd02f]">A clean start</p>
              <h2 className="mt-5 max-w-sm text-3xl font-medium leading-tight tracking-[-.04em]">One workspace. A clear path to readiness.</h2>
              <p className="mt-4 text-sm leading-6 text-[#c7cad5]">Provisioning creates the tenant boundary and gives the school an operational owner. No learner or staff records are created here.</p>
            </div>
          </div>
          <div className="border-t border-white/10 px-7 py-7 sm:px-9">
            <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#8e91a0]">After creation</p>
            <div className="mt-5 space-y-4">
              {[["01", "Admin signs in", "The school administrator receives the secure workspace account."], ["02", "Builds the structure", "Classes, subjects, and teacher assignments establish the school."], ["03", "Activates learning", "Curriculum and timetable setup move the school toward ready."]].map(([number, title, detail]) => <div key={number} className="flex gap-3"><span className="font-mono text-xs text-[#ffd02f]">{number}</span><div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-[#8e91a0]">{detail}</p></div></div>)}
            </div>
          </div>
        </aside>

        <section className="miro-surface p-6 sm:p-9">
          <div className="flex items-start justify-between gap-4 border-b border-[#eef0f3] pb-6">
            <div><p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#8e91a0]">Step 01 · School identity</p><h2 className="mt-2 text-2xl font-medium tracking-tight text-[#1c1c1e]">Set up the tenant.</h2><p className="mt-2 text-sm leading-6 text-[#6b6f7e]">Use a recognizable name and a stable lowercase domain.</p></div>
            <span className="hidden h-10 w-10 items-center justify-center rounded-xl bg-[#ffd02f] text-sm font-black text-[#1c1c1e] sm:flex">01</span>
          </div>

          <form onSubmit={handleSubmit} className="mt-7 space-y-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block sm:col-span-2"><span className="mb-2 block text-xs font-bold uppercase tracking-[.14em] text-[#555a6a]">School name <span className="text-[#4262ff]">*</span></span><input type="text" required value={formData.name} onChange={(event) => update("name", event.target.value)} className="w-full rounded-xl border border-[#d9dce5] bg-[#fafbfc] px-4 py-3.5 text-sm text-[#1c1c1e] outline-none transition placeholder:text-[#a5a8b5] focus:border-[#4262ff] focus:bg-white focus:ring-4 focus:ring-[#e7edff]" placeholder="e.g. Springfield High School" /></label>
              <label className="block sm:col-span-2"><span className="mb-2 block text-xs font-bold uppercase tracking-[.14em] text-[#555a6a]">Tenant domain <span className="text-[#4262ff]">*</span></span><input type="text" required value={formData.domain} onChange={(event) => update("domain", event.target.value.toLowerCase().replace(/\s/g, "-"))} className="w-full rounded-xl border border-[#d9dce5] bg-[#fafbfc] px-4 py-3.5 font-mono text-sm text-[#1c1c1e] outline-none transition placeholder:font-sans placeholder:text-[#a5a8b5] focus:border-[#4262ff] focus:bg-white focus:ring-4 focus:ring-[#e7edff]" placeholder="springfield-high" /><span className="mt-2 block text-xs text-[#8e91a0]">Lowercase letters, numbers, and single hyphens only.</span></label>
            </div>

            <div className="flex items-center gap-3"><span className="h-px flex-1 bg-[#eef0f3]" /><span className="text-[10px] font-bold uppercase tracking-[.18em] text-[#8e91a0]">First workspace owner</span><span className="h-px flex-1 bg-[#eef0f3]" /></div>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block sm:col-span-2"><span className="mb-2 block text-xs font-bold uppercase tracking-[.14em] text-[#555a6a]">Administrator name <span className="text-[#4262ff]">*</span></span><input type="text" required value={formData.adminName} onChange={(event) => update("adminName", event.target.value)} className="w-full rounded-xl border border-[#d9dce5] bg-[#fafbfc] px-4 py-3.5 text-sm text-[#1c1c1e] outline-none transition placeholder:text-[#a5a8b5] focus:border-[#4262ff] focus:bg-white focus:ring-4 focus:ring-[#e7edff]" placeholder="e.g. John Doe" /></label>
              <label className="block sm:col-span-2"><span className="mb-2 block text-xs font-bold uppercase tracking-[.14em] text-[#555a6a]">Administrator email <span className="text-[#4262ff]">*</span></span><input type="email" required value={formData.adminEmail} onChange={(event) => update("adminEmail", event.target.value)} className="w-full rounded-xl border border-[#d9dce5] bg-[#fafbfc] px-4 py-3.5 text-sm text-[#1c1c1e] outline-none transition placeholder:text-[#a5a8b5] focus:border-[#4262ff] focus:bg-white focus:ring-4 focus:ring-[#e7edff]" placeholder="admin@springfield-high.com" /></label>
              <label className="block sm:col-span-2"><span className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-[.14em] text-[#555a6a]"><span>Temporary password <span className="text-[#4262ff]">*</span></span><span className="normal-case font-medium tracking-normal text-[#8e91a0]">Minimum 8 characters</span></span><input type="password" required minLength={8} value={formData.adminPassword} onChange={(event) => update("adminPassword", event.target.value)} className="w-full rounded-xl border border-[#d9dce5] bg-[#fafbfc] px-4 py-3.5 text-sm text-[#1c1c1e] outline-none transition placeholder:text-[#a5a8b5] focus:border-[#4262ff] focus:bg-white focus:ring-4 focus:ring-[#e7edff]" placeholder="Create a secure temporary password" /></label>
            </div>

            {error && <div role="alert" className="flex gap-3 rounded-2xl border border-[#ffd2d2] bg-[#fff3f3] px-4 py-3.5 text-sm font-semibold text-[#a33a3a]"><span aria-hidden="true">!</span><span>{error}</span></div>}
            <div className="flex flex-col-reverse gap-3 border-t border-[#eef0f3] pt-6 sm:flex-row sm:justify-end"><button type="button" onClick={() => router.back()} className="rounded-xl border border-[#d9dce5] px-5 py-3 text-sm font-semibold text-[#555a6a] transition hover:border-[#1c1c1e] hover:text-[#1c1c1e]">Cancel</button><button type="submit" disabled={loading} className="rounded-xl bg-[#1c1c1e] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(28,28,30,.14)] transition hover:-translate-y-0.5 hover:bg-[#2c2c34] disabled:cursor-not-allowed disabled:opacity-50">{loading ? "Creating workspace…" : "Create school workspace →"}</button></div>
          </form>
        </section>
      </div>
    </div>
  )
}
