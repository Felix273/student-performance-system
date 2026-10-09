"use client"

import { useEffect, useState } from "react"

type Scope = "SCHOOL" | "STAGE" | "GRADE" | "CLASS"
type AcademicYear = { id: string; name: string }
type SubjectOption = { id: string; name: string; code: string }
type ClassOption = { id: string; name: string; grade: string }
type TeacherSubjectAssignment = { classId: string; subject: SubjectOption | null }
type Band = { id?: string; code: string; label: string; parentLevelCode: string | null; minPercent: number | string; maxPercent: number | string; sequence?: number }
type BandMap = { id: string; academicYearId: string; academicYear: AcademicYear; scope: Scope; scopeCode: string; class: ClassOption | null; subject: SubjectOption | null; bands: Band[] }
type BandDraft = { id?: string; code: string; label: string; parentLevelCode: string; minPercent: string; maxPercent: string }

const scopeLabels: Record<Scope, string> = { SCHOOL: "School-wide", STAGE: "Stage", GRADE: "Grade", CLASS: "Class" }

export default function CbcBandSettingsPage() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [maps, setMaps] = useState<BandMap[]>([])
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [subjects, setSubjects] = useState<SubjectOption[]>([])
  const [teacherClassOptions, setTeacherClassOptions] = useState<ClassOption[]>([])
  const [teacherSubjectAssignments, setTeacherSubjectAssignments] = useState<TeacherSubjectAssignment[]>([])
  const [canManageSchoolScopes, setCanManageSchoolScopes] = useState(false)
  const [yearId, setYearId] = useState("")
  const [scope, setScope] = useState<Scope>("SCHOOL")
  const [scopeCode, setScopeCode] = useState("")
  const [classId, setClassId] = useState("")
  const [subjectId, setSubjectId] = useState("")
  const [mapId, setMapId] = useState("")
  const [drafts, setDrafts] = useState<Record<string, BandDraft[]>>({})
  const [deletedBands, setDeletedBands] = useState<Record<string, string[]>>({})
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const selectedMap = maps.find((item) => item.id === mapId)
  const rows = selectedMap ? drafts[selectedMap.id] ?? selectedMap.bands.map((band) => ({
    id: band.id,
    code: band.code,
    label: band.label,
    parentLevelCode: band.parentLevelCode || "",
    minPercent: String(band.minPercent),
    maxPercent: String(band.maxPercent),
  })) : []

  const load = async () => {
    const response = await fetch("/api/settings/cbc-band-maps")
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || "Unable to load band maps")
    setAcademicYears(result.academicYears)
    setMaps(result.maps)
    setClasses(result.classes)
    setSubjects(result.subjects)
    setTeacherClassOptions(result.teacherClassOptions)
    setTeacherSubjectAssignments(result.teacherSubjectAssignments)
    setCanManageSchoolScopes(result.canManageSchoolScopes)
    if (!result.canManageSchoolScopes) {
      setScope("CLASS")
      setClassId((current) => current || result.teacherClassOptions[0]?.id || "")
    }
    setYearId((current) => current || result.academicYears[0]?.id || "")
    setMapId((current) => current || result.maps[0]?.id || "")
  }

  useEffect(() => {
    load().catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Unable to load band maps"))
  }, [])

  const createMap = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError("")
    setMessage("")
    try {
      const response = await fetch("/api/settings/cbc-band-maps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: yearId,
          scope,
          scopeCode: scope === "SCHOOL" || scope === "CLASS" ? "" : scopeCode,
          classId: scope === "CLASS" ? classId : undefined,
          subjectId: subjectId || undefined,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Unable to create map")
      await load()
      setMapId(result.id)
      setScopeCode("")
      setSubjectId("")
      setMessage("Empty band map created. Add school-approved bands before using a mapping.")
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create map")
    } finally {
      setBusy(false)
    }
  }

  const updateRow = (index: number, field: keyof BandDraft, value: string) => {
    if (!selectedMap) return
    setDrafts((current) => ({
      ...current,
      [selectedMap.id]: rows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row),
    }))
  }

  const addRow = () => {
    if (!selectedMap) return
    setDrafts((current) => ({
      ...current,
      [selectedMap.id]: [...rows, { code: "", label: "", parentLevelCode: "", minPercent: "", maxPercent: "" }],
    }))
  }

  const moveRow = (index: number, offset: -1 | 1) => {
    if (!selectedMap) return
    const nextIndex = index + offset
    if (nextIndex < 0 || nextIndex >= rows.length) return
    const reordered = [...rows]
    ;[reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]]
    setDrafts((current) => ({ ...current, [selectedMap.id]: reordered }))
  }

  const removeRow = (index: number) => {
    if (!selectedMap) return
    const row = rows[index]
    if (row.id) setDeletedBands((current) => ({ ...current, [selectedMap.id]: [...(current[selectedMap.id] || []), row.id!] }))
    setDrafts((current) => ({ ...current, [selectedMap.id]: rows.filter((_, rowIndex) => rowIndex !== index) }))
  }

  const saveBands = async () => {
    if (!selectedMap) return
    const incomplete = rows.some((row) => !row.code.trim() || !row.label.trim() || row.minPercent === "" || row.maxPercent === "")
    if (incomplete) {
      setError("Complete each band code, label, and percentage bound before saving.")
      return
    }
    setBusy(true)
    setError("")
    setMessage("")
    try {
      const response = await fetch(`/api/settings/cbc-band-maps/${selectedMap.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bands: rows.map((row) => ({ ...row, minPercent: Number(row.minPercent), maxPercent: Number(row.maxPercent) })),
          deleteBandIds: deletedBands[selectedMap.id] || [],
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Unable to save bands")
      await load()
      setDrafts((current) => { const next = { ...current }; delete next[selectedMap.id]; return next })
      setDeletedBands((current) => { const next = { ...current }; delete next[selectedMap.id]; return next })
      setMessage("Band map saved. This configuration does not change current CBC calculations.")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save bands")
    } finally {
      setBusy(false)
    }
  }

  const deleteMap = async () => {
    if (!selectedMap || !window.confirm("Delete this band map and its configured bands?")) return
    setBusy(true)
    setError("")
    setMessage("")
    try {
      const response = await fetch(`/api/settings/cbc-band-maps/${selectedMap.id}`, { method: "DELETE" })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Unable to delete map")
      setMapId("")
      await load()
      setMessage("Band map deleted.")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete map")
    } finally {
      setBusy(false)
    }
  }

  const subjectOptions = canManageSchoolScopes
    ? subjects
    : teacherSubjectAssignments.filter((item) => item.classId === classId).flatMap((item) => item.subject ? [item.subject] : [])
  const allSubjectsAllowed = canManageSchoolScopes || teacherSubjectAssignments.some((item) => item.classId === classId && item.subject === null)
  const selectedMapContext = selectedMap ? [
    scopeLabels[selectedMap.scope],
    selectedMap.class?.name || selectedMap.scopeCode,
    selectedMap.subject?.name || "All subjects",
  ].filter(Boolean).join(" · ") : ""

  return (
    <div className="max-w-6xl space-y-8 animate-fade-in">
      <header className="relative overflow-hidden rounded-3xl bg-[#ffd02f] px-6 py-7 sm:px-9 sm:py-9">
        <div className="relative max-w-3xl">
          <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#746019]">School settings · CBC</p>
          <h1 className="mt-2 text-3xl font-medium leading-tight text-[#1c1c1e] sm:text-4xl">Performance band maps</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5f511b]">Set up school-approved mark bands for each year, scope, and subject. Teachers can manage only assigned class and subject combinations.</p>
        </div>
      </header>

      {error && <p role="alert" className="rounded-lg border border-[#f2b7b7] bg-[#fff1f1] px-4 py-3 text-sm text-[#7c2626]">{error}</p>}
      {message && <p role="status" className="rounded-lg border border-[#9ddbd5] bg-[#e9faf7] px-4 py-3 text-sm text-[#145f5a]">{message}</p>}

      <section className="miro-surface p-5 sm:p-7">
        <div className="flex items-start gap-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#fff4c4] font-mono text-sm font-semibold text-[#746019]">01</span>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-medium text-[#1c1c1e]">Create a map</h2>
            <p className="mt-1 text-sm text-[#6b6f7e]">Choose where the school’s rules apply. Subject-specific maps can coexist at the same scope.</p>
          </div>
        </div>
        {academicYears.length ? <form onSubmit={createMap} className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 xl:items-end">
          <label className="block text-xs font-semibold text-[#555a6a]">Academic year<select required value={yearId} onChange={(event) => setYearId(event.target.value)} className="mt-1.5 block min-h-11 w-full rounded-lg border border-[#d9dce4] bg-white px-3 py-2.5 text-sm text-[#1c1c1e] outline-none transition focus:border-[#4262ff] focus:ring-4 focus:ring-[#4262ff]/10"><option value="">Choose a year</option>{academicYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</select></label>
          {canManageSchoolScopes && <label className="block text-xs font-semibold text-[#555a6a]">Scope<select value={scope} onChange={(event) => { setScope(event.target.value as Scope); setScopeCode("") }} className="mt-1.5 block min-h-11 w-full rounded-lg border border-[#d9dce4] bg-white px-3 py-2.5 text-sm text-[#1c1c1e] outline-none transition focus:border-[#4262ff] focus:ring-4 focus:ring-[#4262ff]/10"><option value="SCHOOL">School-wide</option><option value="STAGE">Stage</option><option value="GRADE">Grade</option><option value="CLASS">Class</option></select></label>}
          {scope === "CLASS" && <label className="block text-xs font-semibold text-[#555a6a]">Class<select required value={classId} onChange={(event) => { setClassId(event.target.value); setSubjectId("") }} className="mt-1.5 block min-h-11 w-full rounded-lg border border-[#d9dce4] bg-white px-3 py-2.5 text-sm text-[#1c1c1e] outline-none transition focus:border-[#4262ff] focus:ring-4 focus:ring-[#4262ff]/10"><option value="">Choose a class</option>{(canManageSchoolScopes ? classes : teacherClassOptions).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.grade}</option>)}</select></label>}
          {(scope === "STAGE" || scope === "GRADE") && <label className="block text-xs font-semibold text-[#555a6a]">{scope === "STAGE" ? "Stage code" : "Grade code"}<input required value={scopeCode} onChange={(event) => setScopeCode(event.target.value)} placeholder="Enter school-defined code" className="mt-1.5 block min-h-11 w-full rounded-lg border border-[#d9dce4] bg-white px-3 py-2.5 text-sm text-[#1c1c1e] outline-none transition placeholder:text-[#a5a8b5] focus:border-[#4262ff] focus:ring-4 focus:ring-[#4262ff]/10" /></label>}
          <label className="block text-xs font-semibold text-[#555a6a]">Subject<select required={!canManageSchoolScopes && scope === "CLASS" && !allSubjectsAllowed} value={subjectId} onChange={(event) => setSubjectId(event.target.value)} className="mt-1.5 block min-h-11 w-full rounded-lg border border-[#d9dce4] bg-white px-3 py-2.5 text-sm text-[#1c1c1e] outline-none transition focus:border-[#4262ff] focus:ring-4 focus:ring-[#4262ff]/10"><option value="" disabled={!allSubjectsAllowed}>{allSubjectsAllowed ? "All subjects" : "Choose an assigned subject"}</option>{(scope === "CLASS" && !canManageSchoolScopes ? subjectOptions : subjects).map((subject) => <option key={subject.id} value={subject.id}>{subject.name} · {subject.code}</option>)}</select></label>
          <button disabled={busy || !yearId || (scope === "CLASS" && !classId)} className="miro-pill inline-flex min-h-11 items-center justify-center bg-[#1c1c1e] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2c2c34] disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Creating…" : "Create empty map"}</button>
        </form> : <p className="mt-5 rounded-lg bg-[#f5f7fb] px-4 py-3 text-sm text-[#6b6f7e]">Add an academic year before configuring CBC bands.</p>}
        {!canManageSchoolScopes && teacherClassOptions.length === 0 && <p className="mt-4 rounded-lg bg-[#fff4c4] px-4 py-3 text-sm text-[#746019]">A school administrator must assign you to a class and subject before you can configure its bands.</p>}
      </section>

      {maps.length > 0 && <section className="miro-surface grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,.8fr)] sm:items-end sm:p-6">
        <div><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#8e91a0]">02 · Current configurations</p><h2 className="mt-1 text-lg font-medium text-[#1c1c1e]">Select a map to edit</h2></div>
        <label className="block text-xs font-semibold text-[#555a6a]">Configured maps<select value={mapId} onChange={(event) => setMapId(event.target.value)} className="mt-1.5 block min-h-11 w-full rounded-lg border border-[#d9dce4] bg-white px-3 py-2.5 text-sm text-[#1c1c1e] outline-none transition focus:border-[#4262ff] focus:ring-4 focus:ring-[#4262ff]/10">{maps.map((item) => <option key={item.id} value={item.id}>{item.academicYear.name} · {scopeLabels[item.scope]} · {item.class?.name || item.scopeCode || "All grades"} · {item.subject?.name || "All subjects"}</option>)}</select></label>
      </section>}

      {selectedMap && <section className="miro-surface overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#eef0f3] px-5 py-5 sm:px-7">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#c3faf5] font-mono text-sm font-semibold text-[#187574]">03</span>
            <div><h2 className="text-lg font-medium text-[#1c1c1e]">Bands for {selectedMap.academicYear.name}</h2><p className="mt-1 text-sm text-[#6b6f7e]">{selectedMapContext}</p></div>
          </div>
          <button type="button" onClick={deleteMap} disabled={busy} className="rounded-full px-3 py-2 text-sm font-semibold text-[#9b3030] transition hover:bg-[#fff1f1] disabled:opacity-50">Delete map</button>
        </div>
        {rows.length === 0 && <p className="mx-5 mt-5 rounded-lg bg-[#fff4c4] px-4 py-3 text-sm text-[#746019] sm:mx-7">No bands yet. Enter the school-approved codes, labels, and boundaries when they are confirmed.</p>}
        <div className="space-y-3 p-5 sm:p-7">
          {rows.map((row, index) => <fieldset key={row.id || `new-${index}`} className="grid min-w-0 gap-3 rounded-lg border border-[#e5e7ec] bg-[#fbfcfe] p-4 md:grid-cols-2 xl:grid-cols-[.8fr_1.2fr_1fr_.8fr_.8fr_auto] xl:items-end">
            <legend className="sr-only">Band {index + 1}</legend>
            <label className="block min-w-0 text-[11px] font-semibold uppercase tracking-[.08em] text-[#6b6f7e]">Band code<input value={row.code} onChange={(event) => updateRow(index, "code", event.target.value)} className="mt-1.5 block min-h-10 w-full min-w-0 rounded-md border border-[#d9dce4] bg-white px-2.5 py-2 text-sm font-medium normal-case tracking-normal text-[#1c1c1e] outline-none transition focus:border-[#4262ff] focus:ring-4 focus:ring-[#4262ff]/10" /></label>
            <label className="block min-w-0 text-[11px] font-semibold uppercase tracking-[.08em] text-[#6b6f7e]">Display label<input value={row.label} onChange={(event) => updateRow(index, "label", event.target.value)} className="mt-1.5 block min-h-10 w-full min-w-0 rounded-md border border-[#d9dce4] bg-white px-2.5 py-2 text-sm font-medium normal-case tracking-normal text-[#1c1c1e] outline-none transition focus:border-[#4262ff] focus:ring-4 focus:ring-[#4262ff]/10" /></label>
            <label className="block min-w-0 text-[11px] font-semibold uppercase tracking-[.08em] text-[#6b6f7e]">Parent level code<input value={row.parentLevelCode} onChange={(event) => updateRow(index, "parentLevelCode", event.target.value)} placeholder="Optional" className="mt-1.5 block min-h-10 w-full min-w-0 rounded-md border border-[#d9dce4] bg-white px-2.5 py-2 text-sm font-medium normal-case tracking-normal text-[#1c1c1e] outline-none transition placeholder:text-[#a5a8b5] focus:border-[#4262ff] focus:ring-4 focus:ring-[#4262ff]/10" /></label>
            <label className="block min-w-0 text-[11px] font-semibold uppercase tracking-[.08em] text-[#6b6f7e]">Minimum %<input type="number" min="0" max="100" step="any" value={row.minPercent} onChange={(event) => updateRow(index, "minPercent", event.target.value)} className="mt-1.5 block min-h-10 w-full min-w-0 rounded-md border border-[#d9dce4] bg-white px-2.5 py-2 text-sm font-medium text-[#1c1c1e] outline-none transition focus:border-[#4262ff] focus:ring-4 focus:ring-[#4262ff]/10" /></label>
            <label className="block min-w-0 text-[11px] font-semibold uppercase tracking-[.08em] text-[#6b6f7e]">Maximum %<input type="number" min="0" max="100" step="any" value={row.maxPercent} onChange={(event) => updateRow(index, "maxPercent", event.target.value)} className="mt-1.5 block min-h-10 w-full min-w-0 rounded-md border border-[#d9dce4] bg-white px-2.5 py-2 text-sm font-medium text-[#1c1c1e] outline-none transition focus:border-[#4262ff] focus:ring-4 focus:ring-[#4262ff]/10" /></label>
            <div className="flex items-center gap-1.5 xl:justify-end">
              <button type="button" aria-label="Move band up" title="Move up" disabled={index === 0} onClick={() => moveRow(index, -1)} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d9dce4] bg-white text-lg text-[#555a6a] transition hover:bg-[#e7edff] disabled:cursor-not-allowed disabled:opacity-40">↑</button>
              <button type="button" aria-label="Move band down" title="Move down" disabled={index === rows.length - 1} onClick={() => moveRow(index, 1)} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d9dce4] bg-white text-lg text-[#555a6a] transition hover:bg-[#e7edff] disabled:cursor-not-allowed disabled:opacity-40">↓</button>
              <button type="button" onClick={() => removeRow(index)} className="ml-1 rounded-full px-3 py-2 text-xs font-semibold text-[#9b3030] transition hover:bg-[#fff1f1]">Remove</button>
            </div>
          </fieldset>)}
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-[#eef0f3] bg-[#fbfcfe] px-5 py-4 sm:px-7">
          <button type="button" onClick={addRow} className="miro-pill border border-[#d9dce4] bg-white px-4 py-2.5 text-sm font-semibold text-[#1c1c1e] transition hover:bg-[#f5f7fb]">Add band</button>
          <button type="button" onClick={saveBands} disabled={busy} className="miro-pill bg-[#187574] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#12615f] disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Saving…" : "Save map"}</button>
          <p className="ml-auto text-xs text-[#8e91a0]">Saved rules are configuration only; reports do not apply them yet.</p>
        </div>
      </section>}
    </div>
  )
}