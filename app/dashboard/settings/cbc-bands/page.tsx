"use client"

import { useEffect, useState } from "react"

type Scope = "SCHOOL" | "STAGE" | "GRADE"
type AcademicYear = { id: string; name: string }
type Band = { id?: string; code: string; label: string; parentLevelCode: string | null; minPercent: number | string; maxPercent: number | string; sequence?: number }
type BandMap = { id: string; academicYearId: string; academicYear: AcademicYear; scope: Scope; scopeCode: string; bands: Band[] }
type BandDraft = { id?: string; code: string; label: string; parentLevelCode: string; minPercent: string; maxPercent: string }

const scopeLabels: Record<Scope, string> = { SCHOOL: "School-wide", STAGE: "Stage", GRADE: "Grade" }

export default function CbcBandSettingsPage() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [maps, setMaps] = useState<BandMap[]>([])
  const [yearId, setYearId] = useState("")
  const [scope, setScope] = useState<Scope>("SCHOOL")
  const [scopeCode, setScopeCode] = useState("")
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
        body: JSON.stringify({ academicYearId: yearId, scope, scopeCode: scope === "SCHOOL" ? "" : scopeCode }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Unable to create map")
      await load()
      setMapId(result.id)
      setScopeCode("")
      setMessage("Empty band map created. Add policy-approved bands before using a mapping.")
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

  return (
    <div className="max-w-5xl space-y-8">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#8c7318]">School settings</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">CBC performance band maps</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6b6f7e]">Configure school-approved mark bands by academic year and school, stage, or grade scope. No thresholds or level labels are pre-filled, and saved maps do not affect current report calculations.</p>
      </header>

      {error && <p role="alert" className="border-l-4 border-red-600 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      {message && <p role="status" className="border-l-4 border-teal-700 bg-teal-50 px-4 py-3 text-sm text-teal-900">{message}</p>}

      <section className="border-y border-gray-200 py-6">
        <h2 className="text-lg font-semibold">Create a scoped map</h2>
        {academicYears.length ? <form onSubmit={createMap} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <label className="text-sm font-medium text-gray-700">Academic year<select required value={yearId} onChange={(event) => setYearId(event.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2"><option value="">Choose a year</option>{academicYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</select></label>
          <label className="text-sm font-medium text-gray-700">Scope<select value={scope} onChange={(event) => setScope(event.target.value as Scope)} className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2"><option value="SCHOOL">School-wide</option><option value="STAGE">Stage</option><option value="GRADE">Grade</option></select></label>
          {scope !== "SCHOOL" && <label className="text-sm font-medium text-gray-700">Scope code<input required value={scopeCode} onChange={(event) => setScopeCode(event.target.value)} placeholder="Enter school-defined code" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" /></label>}
          <button disabled={busy || !yearId} className="rounded-md bg-[#1c1c1e] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Create empty map</button>
        </form> : <p className="mt-3 text-sm text-gray-600">Add an academic year before configuring CBC bands.</p>}
      </section>

      {maps.length > 0 && <label className="block max-w-lg text-sm font-medium text-gray-700">Configured maps<select value={mapId} onChange={(event) => setMapId(event.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2">{maps.map((item) => <option key={item.id} value={item.id}>{item.academicYear.name} · {scopeLabels[item.scope]}{item.scopeCode ? ` · ${item.scopeCode}` : ""}</option>)}</select></label>}

      {selectedMap && <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4">
          <div><h2 className="text-lg font-semibold">Bands for {selectedMap.academicYear.name}</h2><p className="mt-1 text-sm text-gray-600">{scopeLabels[selectedMap.scope]}{selectedMap.scopeCode ? ` · ${selectedMap.scopeCode}` : ""}</p></div>
          <button type="button" onClick={deleteMap} disabled={busy} className="text-sm font-medium text-red-700 hover:underline disabled:opacity-50">Delete map</button>
        </div>
        {rows.length === 0 && <p className="text-sm text-gray-600">No bands configured. Add bands only after the school confirms their codes, labels, and boundaries.</p>}
        <div className="space-y-3">
          {rows.map((row, index) => <fieldset key={row.id || `new-${index}`} className="grid gap-3 border-b border-gray-200 pb-4 md:grid-cols-8">
            <legend className="sr-only">Band {index + 1}</legend>
            <label className="text-xs font-semibold text-gray-700">Band code<input value={row.code} onChange={(event) => updateRow(index, "code", event.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-2.5 py-2 text-sm" /></label>
            <label className="text-xs font-semibold text-gray-700">Display label<input value={row.label} onChange={(event) => updateRow(index, "label", event.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-2.5 py-2 text-sm" /></label>
            <label className="text-xs font-semibold text-gray-700">Parent level code<input value={row.parentLevelCode} onChange={(event) => updateRow(index, "parentLevelCode", event.target.value)} placeholder="Optional sub-level" className="mt-1 block w-full rounded-md border border-gray-300 px-2.5 py-2 text-sm" /></label>
            <label className="text-xs font-semibold text-gray-700">Minimum percent<input type="number" min="0" max="100" step="any" value={row.minPercent} onChange={(event) => updateRow(index, "minPercent", event.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-2.5 py-2 text-sm" /></label>
            <label className="text-xs font-semibold text-gray-700">Maximum percent<input type="number" min="0" max="100" step="any" value={row.maxPercent} onChange={(event) => updateRow(index, "maxPercent", event.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-2.5 py-2 text-sm" /></label>
            <div className="flex items-end gap-2">
              <button type="button" aria-label="Move band up" title="Move up" disabled={index === 0} onClick={() => moveRow(index, -1)} className="rounded border border-gray-300 px-2.5 py-2 text-sm disabled:opacity-40">Up</button>
              <button type="button" aria-label="Move band down" title="Move down" disabled={index === rows.length - 1} onClick={() => moveRow(index, 1)} className="rounded border border-gray-300 px-2.5 py-2 text-sm disabled:opacity-40">Down</button>
              <button type="button" onClick={() => removeRow(index)} className="px-2 py-2 text-sm font-medium text-red-700 hover:underline">Remove</button>
            </div>
          </fieldset>)}
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={addRow} className="rounded-md border border-gray-400 px-4 py-2 text-sm font-semibold text-gray-800">Add band</button>
          <button type="button" onClick={saveBands} disabled={busy} className="rounded-md bg-teal-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving..." : "Save map"}</button>
        </div>
      </section>}
    </div>
  )
}