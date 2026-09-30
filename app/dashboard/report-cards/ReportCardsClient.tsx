"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { DEFAULT_REPORT_TEMPLATE_SECTIONS, type ReportTemplateSectionDraft } from "@/lib/reports/reportTemplateSections"
import ReportCardAudit from "./ReportCardAudit"
import ReportCardComments from "./ReportCardComments"
import ReportTemplateSectionEditor from "./ReportTemplateSectionEditor"

type School = { id: string; name: string }
type Period = { id: string; name: string; code: string; academicYearId: string; schoolId: string; schoolName: string }
type Student = { id: string; name: string; admissionNo: string; schoolId: string; className: string; grade: string | null }
type CurriculumVersionOption = { id: string; schoolId: string; schoolName: string; curriculumName: string; curriculumCode: string; version: string }
type Template = { id: string; schoolId: string; curriculumVersionId: string | null; name: string; code: string; description: string | null; isDefault: boolean; sections: ReportTemplateSectionDraft[] }
type FrozenSection = { code: string; title: string; sequence: number; isEnabled: boolean }
type CardComment = { id: string; sectionCode: string | null; audience: string; body: string; createdAt: string; author: { name: string } }
type Card = { id: string; schoolId: string; status: string; version: number; generatedAt: string; publishedAt: string | null; student: { id: string; name: string; admissionNo: string; schoolId: string; class: { name: string } }; period: { id: string; name: string; code: string }; template: { id: string; name: string; code: string }; counts: { entries: number; comments: number; publications: number }; sections: FrozenSection[]; comments: CardComment[] }

const defaultSectionDrafts = () => DEFAULT_REPORT_TEMPLATE_SECTIONS.map((section) => ({ ...section }))

export default function ReportCardsClient({ role, initialSchoolId, schools, periods, students, versions, templates, reportCards }: { role: string; initialSchoolId: string; schools: School[]; periods: Period[]; students: Student[]; versions: CurriculumVersionOption[]; templates: Template[]; reportCards: Card[] }) {
  const router = useRouter()
  const [schoolId, setSchoolId] = useState(initialSchoolId)
  const [periodId, setPeriodId] = useState("")
  const [studentId, setStudentId] = useState("")
  const [templateId, setTemplateId] = useState("")
  const [templateVersionId, setTemplateVersionId] = useState("")
  const [templateName, setTemplateName] = useState("CBC learner progress report")
  const [templateCode, setTemplateCode] = useState("CBC_STANDARD")
  const [templateDescription, setTemplateDescription] = useState("")
  const [templateIsDefault, setTemplateIsDefault] = useState(true)
  const [templateSections, setTemplateSections] = useState<ReportTemplateSectionDraft[]>(defaultSectionDrafts)
  const [editingTemplateId, setEditingTemplateId] = useState("")
  const [busy, setBusy] = useState("")
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")

  const schoolPeriods = useMemo(() => periods.filter((period) => !schoolId || period.schoolId === schoolId), [periods, schoolId])
  const schoolStudents = useMemo(() => students.filter((student) => !schoolId || student.schoolId === schoolId), [students, schoolId])
  const schoolVersions = useMemo(() => versions.filter((version) => version.schoolId === schoolId), [versions, schoolId])
  const schoolTemplates = useMemo(() => templates.filter((template) => Boolean(template.curriculumVersionId) && (!schoolId || template.schoolId === schoolId)), [templates, schoolId])
  const visibleCards = useMemo(() => reportCards.filter((card) => (!schoolId || card.schoolId === schoolId) && (!periodId || card.period.id === periodId)), [reportCards, schoolId, periodId])

  const request = async (url: string, method: string, body?: unknown) => {
    const response = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.error || "The request could not be completed")
    return payload
  }

  const resetTemplateEditor = () => {
    setEditingTemplateId("")
    setTemplateName("CBC learner progress report")
    setTemplateCode("CBC_STANDARD")
    setTemplateDescription("")
    setTemplateIsDefault(false)
    setTemplateSections(defaultSectionDrafts())
  }

  const beginTemplateEdit = (template: Template) => {
    setEditingTemplateId(template.id)
    setTemplateId(template.id)
    setTemplateVersionId(template.curriculumVersionId || "")
    setTemplateName(template.name)
    setTemplateCode(template.code)
    setTemplateDescription(template.description || "")
    setTemplateIsDefault(template.isDefault)
    setTemplateSections(template.sections.map((section, sequence) => ({ ...section, sequence })))
    setError("")
    setNotice(`Editing ${template.name}. New changes apply to future snapshots; existing report snapshots remain frozen.`)
  }

  const saveTemplate = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy("template"); setError(""); setNotice("")
    try {
      if (!templateVersionId) throw new Error("Choose a published curriculum version for this template.")
      const isEditing = Boolean(editingTemplateId)
      const payload = await request(isEditing ? `/api/report-card-templates/${editingTemplateId}` : "/api/report-card-templates", isEditing ? "PATCH" : "POST", {
        schoolId: role === "SUPER_ADMIN" ? schoolId : undefined,
        curriculumVersionId: templateVersionId,
        code: templateCode,
        name: templateName,
        description: templateDescription,
        isDefault: templateIsDefault,
        sections: templateSections.map((section, sequence) => ({ ...section, sequence })),
      })
      setTemplateId(payload.id)
      setNotice(`${isEditing ? "Updated" : "Created"} ${payload.name}; future report snapshots will use its configured sections.`)
      resetTemplateEditor()
      router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save template") }
    finally { setBusy("") }
  }

  const generate = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!studentId || !periodId || !templateId) return setError("Choose a learner, academic period, and template.")
    setBusy("generate"); setError(""); setNotice("")
    try {
      const payload = await request("/api/report-cards/generate", "POST", { studentId, periodId, templateId })
      setNotice(`Draft snapshot created for ${payload.snapshot?.student?.name || "the learner"}.`)
      router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to generate snapshot") }
    finally { setBusy("") }
  }

  const transition = async (cardId: string, status: string) => {
    setBusy(cardId); setError(""); setNotice("")
    try {
      await request(`/api/report-cards/${cardId}/status`, "PATCH", { status })
      setNotice(`Report moved to ${status.toLowerCase()}.`)
      router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to change report status") }
    finally { setBusy("") }
  }

  const publish = async (cardId: string) => {
    setBusy(cardId); setError(""); setNotice("")
    try {
      const payload = await request(`/api/report-cards/${cardId}/publish`, "POST", {})
      setNotice(`Published to ${payload.publishedRecipients} linked parent account${payload.publishedRecipients === 1 ? "" : "s"}.`)
      router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to publish report") }
    finally { setBusy("") }
  }

  const amend = async (cardId: string) => {
    const reason = window.prompt("Why does this published report need an amendment? Enter a clear audit reason.")
    if (!reason?.trim()) return
    setBusy(cardId); setError(""); setNotice("")
    try {
      const payload = await request(`/api/report-cards/${cardId}/amend`, "POST", { reason })
      setNotice(`Replacement draft v${payload.version} created. Review and publish it when ready.`)
      router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to amend report") }
    finally { setBusy("") }
  }

  return <div className="mx-auto max-w-6xl space-y-8">
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6">
      <div><p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#8c7318]">CBC reporting · Phase 4</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Report-card snapshots</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Generate a frozen report from approved learning evidence, review it, then publish it to linked parent accounts.</p></div>
      <span className="rounded-full bg-[#fff4c4] px-4 py-2 text-xs font-semibold text-slate-800">Draft → Review → Published</span>
    </header>

    {role === "SUPER_ADMIN" && <label className="block max-w-md"><span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600">School</span><select value={schoolId} onChange={(event) => { setSchoolId(event.target.value); setPeriodId(""); setStudentId(""); setTemplateId(""); setTemplateVersionId("") }} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"><option value="">Choose a school</option>{schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}</select></label>}

    <div className="grid gap-6 lg:grid-cols-[.85fr_1.15fr]">
      <section className="space-y-6">
        <form onSubmit={saveTemplate} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-500">1 · Report structure</p><h2 className="mt-2 text-lg font-semibold text-slate-950">{editingTemplateId ? "Edit report template" : "Create a template"}</h2><p className="mt-1 text-sm text-slate-600">Configure section names and order. Saved snapshots retain the version of the structure they were generated with.</p>
          <div className="mt-4 space-y-3"><label className="block"><span className="mb-1 block text-xs font-medium text-slate-600">Template name</span><input value={templateName} onChange={(event) => setTemplateName(event.target.value)} maxLength={120} required className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" /></label><label className="block"><span className="mb-1 block text-xs font-medium text-slate-600">Code</span><input value={templateCode} onChange={(event) => setTemplateCode(event.target.value.toUpperCase())} maxLength={40} required className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm uppercase" /></label><label className="block"><span className="mb-1 block text-xs font-medium text-slate-600">Description (optional)</span><textarea value={templateDescription} onChange={(event) => setTemplateDescription(event.target.value)} maxLength={2000} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" /></label><label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700"><input type="checkbox" checked={templateIsDefault} onChange={(event) => setTemplateIsDefault(event.target.checked)} />Make this the default template</label></div>
          <ReportTemplateSectionEditor sections={templateSections} onChange={setTemplateSections} disabled={busy === "template"} />
          <label className="mt-5 block"><span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600">Curriculum version</span><select value={templateVersionId} onChange={(event) => setTemplateVersionId(event.target.value)} required disabled={Boolean(editingTemplateId)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm disabled:bg-slate-100"><option value="">Choose a published curriculum version</option>{schoolVersions.map((version) => <option key={`${version.schoolId}:${version.id}`} value={version.id}>{version.schoolName} · {version.curriculumName} ({version.curriculumCode}) · v{version.version}</option>)}</select></label>
          <div className="mt-4 flex flex-wrap gap-2"><button disabled={busy === "template" || !templateVersionId} className="rounded-full bg-[#1c1c1e] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40">{busy === "template" ? "Saving…" : editingTemplateId ? "Save template changes" : "Create template"}</button>{editingTemplateId && <button type="button" onClick={resetTemplateEditor} disabled={busy === "template"} className="rounded-full border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700">Cancel edit</button>}</div>
          <div className="mt-5 border-t border-slate-100 pt-4"><p className="mb-2 text-xs font-semibold text-slate-600">Available templates</p>{schoolTemplates.length ? <ul className="space-y-2">{schoolTemplates.map((template) => <li key={template.id} className="rounded-lg border border-slate-200 p-3"><div className="flex items-start justify-between gap-3"><label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2"><input type="radio" name="template" checked={templateId === template.id} onChange={() => { setTemplateId(template.id); setTemplateVersionId(template.curriculumVersionId || "") }} className="mt-1 accent-slate-900" /><span><span className="block text-sm font-medium text-slate-900">{template.name}{template.isDefault ? " · Default" : ""}</span><span className="mt-0.5 block text-xs text-slate-500">{template.sections.filter((section) => section.isEnabled).map((section) => section.title).join(" · ")}</span></span></label><button type="button" onClick={() => beginTemplateEdit(template)} className="rounded-full border border-slate-300 px-3 py-1.5 text-[11px] font-semibold text-slate-700">Edit</button></div></li>)}</ul> : <p className="text-xs text-slate-500">No templates yet.</p>}</div>
        </form>

        <form onSubmit={generate} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-500">2 · Generate draft</p><h2 className="mt-2 text-lg font-semibold text-slate-950">Select a learner and period</h2>
          <div className="mt-4 space-y-3"><label className="block"><span className="mb-1 block text-xs font-medium text-slate-600">Academic period</span><select value={periodId} onChange={(event) => setPeriodId(event.target.value)} required className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"><option value="">Choose a period</option>{schoolPeriods.map((period) => <option key={period.id} value={period.id}>{period.schoolName} · {period.name} ({period.code})</option>)}</select></label><label className="block"><span className="mb-1 block text-xs font-medium text-slate-600">Learner</span><select value={studentId} onChange={(event) => setStudentId(event.target.value)} required className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"><option value="">Choose a learner</option>{schoolStudents.map((student) => <option key={student.id} value={student.id}>{student.name} · {student.admissionNo} · {student.className}</option>)}</select></label><p className="rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">Only verified or published CBC evidence is included. Legacy scores are kept in a separate summary. Existing snapshots cannot be regenerated in place.</p></div>
          <button disabled={busy === "generate" || !templateId} className="mt-4 rounded-full bg-[#1c1c1e] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40">{busy === "generate" ? "Generating…" : "Generate draft snapshot"}</button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-500">3 · Review and publish</p><h2 className="mt-2 text-lg font-semibold text-slate-950">Recent report cards</h2></div><span className="text-xs text-slate-500">Latest 100</span></div>
        {visibleCards.length ? <div className="mt-5 divide-y divide-slate-100">{visibleCards.map((card) => <article key={card.id} className="py-4 first:pt-0">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-semibold text-slate-950">{card.student.name}</h3><p className="mt-1 text-xs text-slate-600">{card.student.class.name} · {card.period.name} · {card.template.name} · v{card.version}</p><p className="mt-1 text-xs text-slate-500">{card.counts.entries} entries · {card.counts.comments} comments · {card.counts.publications} recipients</p></div><span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${card.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-800" : card.status === "REVIEW" ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700"}`}>{card.status}</span></div>
          <div className="mt-3 flex flex-wrap gap-2"><a href={`/api/report-cards/${card.id}/pdf`} className="rounded-full border border-slate-300 px-3 py-1.5 text-[11px] font-semibold text-slate-700">Preview PDF</a>{card.status === "DRAFT" && <button disabled={busy === card.id} onClick={() => transition(card.id, "REVIEW")} className="rounded-full bg-[#fff4c4] px-3 py-1.5 text-[11px] font-semibold text-slate-900">Send to review</button>}{card.status === "REVIEW" && <><button disabled={busy === card.id} onClick={() => transition(card.id, "DRAFT")} className="rounded-full border border-slate-300 px-3 py-1.5 text-[11px] font-semibold text-slate-700">Return to draft</button><button disabled={busy === card.id} onClick={() => publish(card.id)} className="rounded-full bg-[#1c1c1e] px-3 py-1.5 text-[11px] font-semibold text-white">Publish to parents</button></>}{card.status === "PUBLISHED" && <button disabled={busy === card.id} onClick={() => amend(card.id)} className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-900">Start amendment</button>}</div>
          <ReportCardComments reportCardId={card.id} disabled={card.status !== "DRAFT" && card.status !== "REVIEW"} sections={card.sections} comments={card.comments} />
          <ReportCardAudit reportCardId={card.id} />
        </article>)}</div> : <div className="mt-5 rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-600">No report-card snapshots yet.</div>}
      </section>
    </div>
    {notice && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800">{notice}</p>}
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">{error}</p>}
  </div>
}
