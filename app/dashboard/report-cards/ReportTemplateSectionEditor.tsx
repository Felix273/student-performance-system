"use client"

import type { ReportTemplateSectionDraft } from "@/lib/reports/reportTemplateSections"

const sectionTypes = ["SUMMARY", "ASSESSMENT", "OUTCOME", "COMPETENCY", "ATTENDANCE", "COMMENT", "CUSTOM"] as const

export default function ReportTemplateSectionEditor({
  sections,
  onChange,
  disabled = false,
}: {
  sections: ReportTemplateSectionDraft[]
  onChange: (sections: ReportTemplateSectionDraft[]) => void
  disabled?: boolean
}) {
  const update = (index: number, patch: Partial<ReportTemplateSectionDraft>) => {
    onChange(sections.map((section, current) => current === index ? { ...section, ...patch } : section))
  }

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= sections.length) return
    const next = [...sections]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next.map((section, sequence) => ({ ...section, sequence })))
  }

  const add = () => {
    const suffix = sections.length + 1
    onChange([...sections, {
      code: `CUSTOM_${suffix}`,
      title: "New report section",
      sectionType: "CUSTOM",
      sequence: sections.length,
      isEnabled: true,
      isRequired: false,
    }])
  }

  return <fieldset disabled={disabled} className="mt-5 space-y-3 border-t border-slate-100 pt-4">
    <legend className="text-xs font-semibold text-slate-700">Report sections</legend>
    <p className="text-xs leading-5 text-slate-500">The enabled section names and order are copied into each report snapshot. Later template changes do not rewrite existing reports.</p>
    {sections.map((section, index) => <div key={`${section.code}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr]">
        <label className="block"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Code</span><input value={section.code} onChange={(event) => update(index, { code: event.target.value.toUpperCase() })} maxLength={40} required className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs uppercase" /></label>
        <label className="block"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Title</span><input value={section.title} onChange={(event) => update(index, { title: event.target.value })} maxLength={120} required className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs" /></label>
        <label className="block"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Section type</span><select value={section.sectionType} onChange={(event) => update(index, { sectionType: event.target.value as ReportTemplateSectionDraft["sectionType"] })} className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs">{sectionTypes.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}</select></label>
        <div className="flex flex-wrap items-end gap-3 pb-2">
          <label className="inline-flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={section.isEnabled} onChange={(event) => update(index, { isEnabled: event.target.checked })} disabled={section.isRequired} />Enabled</label>
          <label className="inline-flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={section.isRequired} onChange={(event) => update(index, { isRequired: event.target.checked, isEnabled: event.target.checked ? true : section.isEnabled })} disabled={section.code === "CBC_EVIDENCE"} />Required</label>
          <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move ${section.title} up`} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs disabled:opacity-40">↑</button>
          <button type="button" onClick={() => move(index, 1)} disabled={index === sections.length - 1} aria-label={`Move ${section.title} down`} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs disabled:opacity-40">↓</button>
          <button type="button" onClick={() => onChange(sections.filter((_, current) => current !== index).map((item, sequence) => ({ ...item, sequence })))} disabled={section.code === "CBC_EVIDENCE" || sections.length <= 1} className="ml-auto rounded-md px-2 py-1 text-xs font-semibold text-rose-700 disabled:opacity-40">Remove</button>
        </div>
      </div>
    </div>)}
    <button type="button" onClick={add} disabled={sections.length >= 30} className="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40">Add section</button>
  </fieldset>
}
