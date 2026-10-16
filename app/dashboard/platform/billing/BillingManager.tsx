"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

type Plan = { id: string; code: string; name: string; maxStudents: number | null; maxStaff: number | null; trialDays: number; isActive: boolean }
type School = { id: string; name: string; domain: string; schoolStatus: string; students: number; staff: number; subscription: { id: string; planId: string; planCode: string; planName: string; status: string; trialEndsAt: string | null; currentPeriodEndsAt: string | null } | null }
type Draft = { maxStudents: string; maxStaff: string; trialDays: string; isActive: boolean }
type SchoolDraft = { planId: string; status: string; trialEndsAt: string }

const inputClass = "w-full rounded-lg border border-[#e0e2e8] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#4262ff]"
const statusOptions = ["TRIAL", "ACTIVE", "PAST_DUE", "CANCELED", "EXPIRED"]

const emptyToNumber = (value: string) => value.trim() === "" ? null : Number(value)

export default function BillingManager({ plans, schools }: { plans: Plan[]; schools: School[] }) {
  const router = useRouter()
  const [planDrafts, setPlanDrafts] = useState<Record<string, Draft>>(() => Object.fromEntries(plans.map((plan) => [plan.id, { maxStudents: plan.maxStudents?.toString() ?? "", maxStaff: plan.maxStaff?.toString() ?? "", trialDays: String(plan.trialDays), isActive: plan.isActive }])))
  const [schoolDrafts, setSchoolDrafts] = useState<Record<string, SchoolDraft>>(() => Object.fromEntries(schools.map((school) => [school.id, { planId: school.subscription?.planId ?? "", status: school.subscription?.status ?? "TRIAL", trialEndsAt: school.subscription?.trialEndsAt?.slice(0, 10) ?? "" }])))
  const [newPlan, setNewPlan] = useState({ code: "", name: "", maxStudents: "", maxStaff: "", trialDays: "14" })
  const [busy, setBusy] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const updatePlanDraft = (id: string, key: keyof Draft, value: string | boolean) => setPlanDrafts((current) => ({ ...current, [id]: { ...current[id], [key]: value } }))
  const updateSchoolDraft = (id: string, key: keyof SchoolDraft, value: string) => setSchoolDrafts((current) => ({ ...current, [id]: { ...current[id], [key]: value } }))

  async function createPlan(event: React.FormEvent) {
    event.preventDefault()
    setBusy("new-plan")
    setError("")
    setMessage("")
    const response = await fetch("/api/platform/billing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: newPlan.code, name: newPlan.name, maxStudents: emptyToNumber(newPlan.maxStudents), maxStaff: emptyToNumber(newPlan.maxStaff), trialDays: Number(newPlan.trialDays) }) }).catch(() => null)
    const data = await response?.json().catch(() => ({}))
    setBusy("")
    if (!response?.ok) return setError(data?.error || "Unable to create plan")
    setMessage(`Plan ${data.plan.name} created.`)
    setNewPlan({ code: "", name: "", maxStudents: "", maxStaff: "", trialDays: "14" })
    router.refresh()
  }

  async function savePlan(plan: Plan) {
    const draft = planDrafts[plan.id]
    setBusy(plan.id)
    setError("")
    setMessage("")
    const response = await fetch(`/api/platform/billing/plans/${plan.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ maxStudents: emptyToNumber(draft.maxStudents), maxStaff: emptyToNumber(draft.maxStaff), trialDays: Number(draft.trialDays), isActive: draft.isActive }) }).catch(() => null)
    const data = await response?.json().catch(() => ({}))
    setBusy("")
    if (!response?.ok) return setError(data?.error || "Unable to update plan")
    setMessage(`${plan.name} limits updated.`)
    router.refresh()
  }

  async function saveSchool(school: School) {
    const draft = schoolDrafts[school.id]
    setBusy(`school-${school.id}`)
    setError("")
    setMessage("")
    const response = await fetch(`/api/platform/billing/schools/${school.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId: draft.planId, status: draft.status, trialEndsAt: draft.trialEndsAt || null }) }).catch(() => null)
    const data = await response?.json().catch(() => ({}))
    setBusy("")
    if (!response?.ok) return setError(data?.error || "Unable to update subscription")
    setMessage(`${school.name} subscription updated.`)
    router.refresh()
  }

  return (
    <div className="space-y-8">
      <section className="miro-surface p-6 sm:p-8">
        <div className="mb-5"><p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#8e91a0]">Plan catalog</p><h2 className="mt-2 text-xl font-medium">Enrollment plans</h2></div>
        {error && <p role="alert" className="mb-4 rounded-lg bg-[#fff1f1] px-4 py-3 text-sm font-semibold text-[#9b3030]">{error}</p>}
        {message && <p role="status" className="mb-4 rounded-lg bg-[#effbf6] px-4 py-3 text-sm font-semibold text-[#14664a]">{message}</p>}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => {
            const draft = planDrafts[plan.id]
            return <article key={plan.id} className="rounded-xl border border-[#e8ebef] p-4">
              <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-[#1c1c1e]">{plan.name}</p><p className="mt-1 font-mono text-[11px] text-[#8e91a0]">{plan.code}</p></div><label className="flex items-center gap-2 text-xs font-medium"><input type="checkbox" checked={draft.isActive} onChange={(event) => updatePlanDraft(plan.id, "isActive", event.target.checked)} />Active</label></div>
              <div className="mt-4 grid grid-cols-2 gap-3"><label className="text-[11px] font-semibold text-[#6b6f7e]">Max students<input type="number" min="0" value={draft.maxStudents} onChange={(event) => updatePlanDraft(plan.id, "maxStudents", event.target.value)} placeholder="Unlimited" className={`${inputClass} mt-1`} /></label><label className="text-[11px] font-semibold text-[#6b6f7e]">Max staff<input type="number" min="0" value={draft.maxStaff} onChange={(event) => updatePlanDraft(plan.id, "maxStaff", event.target.value)} placeholder="Unlimited" className={`${inputClass} mt-1`} /></label><label className="text-[11px] font-semibold text-[#6b6f7e]">Trial days<input type="number" min="0" max="365" value={draft.trialDays} onChange={(event) => updatePlanDraft(plan.id, "trialDays", event.target.value)} className={`${inputClass} mt-1`} /></label></div>
              <button type="button" disabled={busy === plan.id} onClick={() => savePlan(plan)} className="mt-4 min-h-9 rounded-lg border border-[#d9dce5] px-3.5 py-2 text-xs font-semibold text-[#1c1c1e] disabled:opacity-50">{busy === plan.id ? "Saving…" : "Save limits"}</button>
            </article>
          })}
        </div>
        <form onSubmit={createPlan} className="mt-5 grid gap-3 rounded-xl bg-[#f7f8fa] p-4 sm:grid-cols-2 xl:grid-cols-6 xl:items-end">
          <label className="text-[11px] font-semibold text-[#6b6f7e]">Plan code<input required maxLength={40} value={newPlan.code} onChange={(event) => setNewPlan({ ...newPlan, code: event.target.value.toUpperCase() })} className={`${inputClass} mt-1`} /></label>
          <label className="text-[11px] font-semibold text-[#6b6f7e] xl:col-span-2">Plan name<input required minLength={2} maxLength={80} value={newPlan.name} onChange={(event) => setNewPlan({ ...newPlan, name: event.target.value })} className={`${inputClass} mt-1`} /></label>
          <label className="text-[11px] font-semibold text-[#6b6f7e]">Max students<input type="number" min="0" value={newPlan.maxStudents} onChange={(event) => setNewPlan({ ...newPlan, maxStudents: event.target.value })} placeholder="Unlimited" className={`${inputClass} mt-1`} /></label>
          <label className="text-[11px] font-semibold text-[#6b6f7e]">Max staff<input type="number" min="0" value={newPlan.maxStaff} onChange={(event) => setNewPlan({ ...newPlan, maxStaff: event.target.value })} placeholder="Unlimited" className={`${inputClass} mt-1`} /></label>
          <button type="submit" disabled={busy === "new-plan"} className="min-h-10 rounded-lg bg-[#1c1c1e] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{busy === "new-plan" ? "Creating…" : "Create plan"}</button>
        </form>
      </section>

      <section className="miro-surface overflow-hidden">
        <div className="border-b border-[#eef0f3] px-5 py-5 sm:px-7"><p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#8e91a0]">School subscriptions</p><h2 className="mt-2 text-xl font-medium">Trials and limits</h2></div>
        <div className="divide-y divide-[#eef0f3]">
          {schools.map((school) => {
            const draft = schoolDrafts[school.id]
            return <div key={school.id} className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(200px,1fr)_repeat(4,minmax(120px,.6fr))_auto] lg:items-end sm:px-7">
              <div className="min-w-0"><p className="truncate text-sm font-semibold text-[#1c1c1e]">{school.name}</p><p className="mt-1 truncate text-xs text-[#8e91a0]">{school.domain} · {school.schoolStatus}</p><p className="mt-1 text-xs text-[#6b6f7e]">{school.students} students · {school.staff} staff</p></div>
              <label className="text-[11px] font-semibold text-[#6b6f7e]">Plan<select value={draft.planId} onChange={(event) => updateSchoolDraft(school.id, "planId", event.target.value)} className={`${inputClass} mt-1`}><option value="">Select plan</option>{plans.filter((plan) => plan.isActive).map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label>
              <label className="text-[11px] font-semibold text-[#6b6f7e]">Status<select value={draft.status} onChange={(event) => updateSchoolDraft(school.id, "status", event.target.value)} className={`${inputClass} mt-1`}>{statusOptions.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></label>
              <label className="text-[11px] font-semibold text-[#6b6f7e]">Trial ends<input required={draft.status === "TRIAL"} type="date" value={draft.trialEndsAt} onChange={(event) => updateSchoolDraft(school.id, "trialEndsAt", event.target.value)} className={`${inputClass} mt-1`} /></label>
              <div className="text-xs text-[#8e91a0]">{school.subscription ? `${school.subscription.planName} · ${school.subscription.status}` : "No subscription"}</div>
              <button type="button" disabled={busy === `school-${school.id}` || !draft.planId} onClick={() => saveSchool(school)} className="min-h-9 rounded-lg border border-[#d9dce5] px-3.5 py-2 text-xs font-semibold disabled:opacity-50">{busy === `school-${school.id}` ? "Saving…" : "Save"}</button>
            </div>
          })}
          {!schools.length && <p className="px-6 py-10 text-center text-sm text-[#8e91a0]">No schools found.</p>}
        </div>
      </section>
    </div>
  )
}
