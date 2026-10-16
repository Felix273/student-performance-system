"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

type Plan = { id: string; code: string; name: string; maxStudents: number | null; maxStaff: number | null; trialDays: number; isActive: boolean }
type School = { id: string; name: string; domain: string; schoolStatus: string; students: number; staff: number; subscription: { id: string; planId: string; planCode: string; planName: string; maxStudents: number | null; maxStaff: number | null; status: string; trialEndsAt: string | null; currentPeriodEndsAt: string | null } | null }
type Draft = { maxStudents: string; maxStaff: string; trialDays: string; isActive: boolean }
type SchoolDraft = { planId: string; status: string; trialEndsAt: string }

const inputClass = "w-full min-w-0 rounded-xl border border-[#e0e2e8] bg-white px-3 py-2.5 text-sm text-[#1c1c1e] outline-none transition focus:border-[#4262ff] focus:ring-2 focus:ring-[#4262ff]/10"
const statusOptions = ["TRIAL", "ACTIVE", "PAST_DUE", "CANCELED", "EXPIRED"]

const emptyToNumber = (value: string) => value.trim() === "" ? null : Number(value)
const planDraftFor = (plan: Plan): Draft => ({ maxStudents: plan.maxStudents?.toString() ?? "", maxStaff: plan.maxStaff?.toString() ?? "", trialDays: String(plan.trialDays), isActive: plan.isActive })

function CapacityMeter({ label, used, maximum }: { label: string; used: number; maximum: number | null }) {
  const percent = maximum === null ? null : maximum > 0 ? Math.min(100, Math.round((used / maximum) * 100)) : used > 0 ? 100 : 0
  const tone = percent !== null && percent >= 90 ? "bg-[#e69b28]" : "bg-[#187574]"

  return <div>
    <div className="flex items-center justify-between gap-2 text-[11px]"><span className="font-medium text-[#6b6f7e]">{label}</span><span className="font-mono text-[#1c1c1e]">{used.toLocaleString()} / {maximum === null ? "Unlimited" : maximum.toLocaleString()}</span></div>
    {percent !== null && <div role="progressbar" aria-label={`${label} capacity`} aria-valuemin={0} aria-valuemax={maximum || 1} aria-valuenow={Math.min(used, maximum || 0)} className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#eef0f3]"><div className={`h-full rounded-full transition-all ${tone}`} style={{ width: `${percent}%` }} /></div>}
  </div>
}

export default function BillingManager({ plans, schools }: { plans: Plan[]; schools: School[] }) {
  const router = useRouter()
  const [planDrafts, setPlanDrafts] = useState<Record<string, Draft>>(() => Object.fromEntries(plans.map((plan) => [plan.id, planDraftFor(plan)])))
  const [schoolDrafts, setSchoolDrafts] = useState<Record<string, SchoolDraft>>(() => Object.fromEntries(schools.map((school) => [school.id, { planId: school.subscription?.planId ?? "", status: school.subscription?.status ?? "TRIAL", trialEndsAt: school.subscription?.trialEndsAt?.slice(0, 10) ?? "" }])))
  const [newPlan, setNewPlan] = useState({ code: "", name: "", maxStudents: "", maxStaff: "", trialDays: "14" })
  const [busy, setBusy] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const updatePlanDraft = (plan: Plan, key: keyof Draft, value: string | boolean) => setPlanDrafts((current) => ({ ...current, [plan.id]: { ...(current[plan.id] ?? planDraftFor(plan)), [key]: value } }))
  const updateSchoolDraft = (id: string, key: keyof SchoolDraft, value: string) => setSchoolDrafts((current) => ({ ...current, [id]: { ...current[id], [key]: value } }))
  const saveButtonClass = "min-h-10 rounded-xl bg-[#1c1c1e] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#34343a] disabled:cursor-not-allowed disabled:opacity-50"

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
    const draft = planDrafts[plan.id] ?? planDraftFor(plan)
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

  return <div className="space-y-10">
    {(error || message) && <div role={error ? "alert" : "status"} className={`rounded-2xl px-5 py-4 text-sm font-semibold ${error ? "bg-[#ffc6c6] text-[#600000]" : "bg-[#c3faf5] text-[#187574]"}`}>{error || message}</div>}

    <section aria-labelledby="plan-catalog-title" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#e0e2e8] pb-4">
        <div><p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#8e91a0]">Plan catalog</p><h2 id="plan-catalog-title" className="mt-2 text-2xl font-medium tracking-tight">Enrollment plans</h2></div>
        <p className="max-w-sm text-sm leading-6 text-[#6b6f7e]">Set the capacity and trial terms available to schools.</p>
      </div>
      {plans.length ? <div className="grid gap-4 lg:grid-cols-2">
        {plans.map((plan) => {
          const draft = planDrafts[plan.id] ?? planDraftFor(plan)
          const tone = plan.code === "LEGACY" ? "bg-[#e7edff] text-[#4262ff]" : plan.code === "TRIAL" ? "bg-[#fff4c4] text-[#746019]" : "bg-[#c3faf5] text-[#187574]"
          return <article key={plan.id} className="rounded-[20px] border border-[#e0e2e8] bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3"><span aria-hidden="true" className={`mt-0.5 grid h-10 w-10 place-items-center rounded-xl font-mono text-sm font-bold ${tone}`}>{plan.code.slice(0, 1)}</span><div><h3 className="text-base font-semibold text-[#1c1c1e]">{plan.name}</h3><p className="mt-1 font-mono text-[11px] text-[#8e91a0]">{plan.code}</p></div></div>
              <label className="flex min-h-10 items-center gap-2 rounded-full bg-[#f7f8fa] px-3 text-xs font-semibold text-[#555a6a]"><input type="checkbox" checked={draft.isActive} onChange={(event) => updatePlanDraft(plan, "isActive", event.target.checked)} className="accent-[#187574]" />Active</label>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <label className="text-[11px] font-semibold text-[#6b6f7e]">Max students<input aria-label={`${plan.name} max students`} type="number" min="0" value={draft.maxStudents} onChange={(event) => updatePlanDraft(plan, "maxStudents", event.target.value)} placeholder="Unlimited" className={`${inputClass} mt-1.5`} /></label>
              <label className="text-[11px] font-semibold text-[#6b6f7e]">Max staff<input aria-label={`${plan.name} max staff`} type="number" min="0" value={draft.maxStaff} onChange={(event) => updatePlanDraft(plan, "maxStaff", event.target.value)} placeholder="Unlimited" className={`${inputClass} mt-1.5`} /></label>
              <label className="text-[11px] font-semibold text-[#6b6f7e]">Trial days<input aria-label={`${plan.name} trial days`} type="number" min="0" max="365" value={draft.trialDays} onChange={(event) => updatePlanDraft(plan, "trialDays", event.target.value)} className={`${inputClass} mt-1.5`} /></label>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#eef0f3] pt-4"><p className="text-xs text-[#8e91a0]">{draft.maxStudents || draft.maxStaff ? "Capacity limits enabled" : "Unlimited enrollment"} · {draft.trialDays} trial days</p><button type="button" disabled={busy === plan.id} onClick={() => savePlan(plan)} className={saveButtonClass}>{busy === plan.id ? "Saving…" : "Save plan"}</button></div>
          </article>
        })}
      </div> : <p className="rounded-[20px] border border-dashed border-[#c7cad5] px-6 py-10 text-center text-sm text-[#6b6f7e]">No plans configured yet.</p>}
    </section>

    <section aria-labelledby="create-plan-title" className="rounded-[20px] bg-[#f7f8fa] p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#8e91a0]">Add to catalog</p><h2 id="create-plan-title" className="mt-2 text-xl font-medium">Create a plan</h2></div><p className="max-w-sm text-xs leading-5 text-[#6b6f7e]">Leave a capacity blank for unlimited enrollment.</p></div>
      <form onSubmit={createPlan} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1.5fr_1fr_1fr_auto] xl:items-end">
        <label className="text-[11px] font-semibold text-[#6b6f7e]">Plan code<input required maxLength={40} value={newPlan.code} onChange={(event) => setNewPlan({ ...newPlan, code: event.target.value.toUpperCase() })} className={`${inputClass} mt-1.5`} /></label>
        <label className="text-[11px] font-semibold text-[#6b6f7e]">Plan name<input required minLength={2} maxLength={80} value={newPlan.name} onChange={(event) => setNewPlan({ ...newPlan, name: event.target.value })} className={`${inputClass} mt-1.5`} /></label>
        <label className="text-[11px] font-semibold text-[#6b6f7e]">Max students<input type="number" min="0" value={newPlan.maxStudents} onChange={(event) => setNewPlan({ ...newPlan, maxStudents: event.target.value })} placeholder="Unlimited" className={`${inputClass} mt-1.5`} /></label>
        <label className="text-[11px] font-semibold text-[#6b6f7e]">Max staff<input type="number" min="0" value={newPlan.maxStaff} onChange={(event) => setNewPlan({ ...newPlan, maxStaff: event.target.value })} placeholder="Unlimited" className={`${inputClass} mt-1.5`} /></label>
        <button type="submit" disabled={busy === "new-plan"} className={saveButtonClass}>{busy === "new-plan" ? "Creating…" : "Create plan +"}</button>
      </form>
    </section>

    <section aria-labelledby="school-subscriptions-title" className="miro-surface overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#eef0f3] px-5 py-5 sm:px-7"><div><p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#8e91a0]">School portfolio</p><h2 id="school-subscriptions-title" className="mt-2 text-2xl font-medium tracking-tight">School subscriptions</h2><p className="mt-2 text-sm text-[#6b6f7e]">Review assignments, status, and current capacity at a glance.</p></div><span className="miro-pill bg-[#e7edff] px-3 py-1.5 text-xs font-semibold text-[#4262ff]">{schools.length} {schools.length === 1 ? "school" : "schools"}</span></div>
      <div className="divide-y divide-[#eef0f3]">
        {schools.map((school) => {
          const draft = schoolDrafts[school.id]
          const currentPlan = plans.find((plan) => plan.id === school.subscription?.planId)
          return <article key={school.id} className="grid gap-5 px-5 py-5 sm:px-7 lg:grid-cols-[minmax(180px,1.2fr)_repeat(2,minmax(130px,.8fr))_minmax(145px,.85fr)_minmax(175px,1.05fr)_auto] lg:items-end">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-semibold text-[#1c1c1e]">{school.name}</h3><span className={`miro-pill px-2 py-1 text-[10px] font-bold ${school.schoolStatus === "ACTIVE" ? "bg-[#c3faf5] text-[#187574]" : "bg-[#fff4c4] text-[#746019]"}`}>{school.schoolStatus}</span></div><p className="mt-1 truncate text-xs text-[#8e91a0]">{school.domain}</p><p className="mt-2 text-xs text-[#6b6f7e]">{school.subscription ? `${school.subscription.planName} · ${school.subscription.status.replaceAll("_", " ")}` : "No subscription"}</p></div>
            <label className="text-[11px] font-semibold text-[#6b6f7e]">Plan<select aria-label={`${school.name} plan`} value={draft.planId} onChange={(event) => updateSchoolDraft(school.id, "planId", event.target.value)} className={`${inputClass} mt-1.5`}><option value="">Select plan</option>{plans.filter((plan) => plan.isActive).map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label>
            <label className="text-[11px] font-semibold text-[#6b6f7e]">Status<select aria-label={`${school.name} subscription status`} value={draft.status} onChange={(event) => updateSchoolDraft(school.id, "status", event.target.value)} className={`${inputClass} mt-1.5`}>{statusOptions.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></label>
            <label className="text-[11px] font-semibold text-[#6b6f7e]">Trial ends<input aria-label={`${school.name} trial end date`} required={draft.status === "TRIAL"} type="date" value={draft.trialEndsAt} onChange={(event) => updateSchoolDraft(school.id, "trialEndsAt", event.target.value)} className={`${inputClass} mt-1.5`} /></label>
            <div className="space-y-3"><CapacityMeter label="Students" used={school.students} maximum={currentPlan?.maxStudents ?? null} /><CapacityMeter label="Staff" used={school.staff} maximum={currentPlan?.maxStaff ?? null} /></div>
            <button type="button" disabled={busy === `school-${school.id}` || !draft.planId} onClick={() => saveSchool(school)} className={saveButtonClass}>{busy === `school-${school.id}` ? "Saving…" : "Save"}</button>
          </article>
        })}
        {!schools.length && <p className="px-6 py-10 text-center text-sm text-[#8e91a0]">No schools found.</p>}
      </div>
    </section>
  </div>
}
