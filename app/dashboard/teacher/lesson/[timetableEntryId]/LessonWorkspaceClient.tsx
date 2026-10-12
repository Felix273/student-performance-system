"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"
type Evidence = {
  id: string
  status: string
  evidenceType: string
  numericScore: number | null
  masteryLevel: string | null
  narrative: string | null
  internalNote: string | null
  learningOutcomeId: string | null
  competencyId: string | null
  componentId: string | null
  rubricId: string | null
  updatedAt: string
  editable: boolean
  rubricScores: Array<{ criterionId: string; levelId: string; comment: string | null }>
}
type Learner = {
  id: string
  name: string
  admissionNo: string
  attendance: { id: string; status: AttendanceStatus; remarks: string | null; updatedAt: string } | null
  evidence: Evidence[]
}
type Workspace = {
  context: {
    timetableEntry: { id: string; day: string; startTime: string; endTime: string; room: string | null; notes: string | null }
    academicYear: { id: string; name: string }
    period: { id: string; name: string; code: string } | null
    class: { id: string; name: string; grade: string }
    subject: { id: string; name: string; code: string }
    teacher: { id: string; name: string }
    curriculum: { assignmentId: string | null; frameworkName: string | null; version: string | null; grade: { code: string; displayName: string } | null; status: string }
  }
  focus: { nodes: Array<{ id: string; code: string; title: string; nodeType: string }>; outcomes: Array<{ id: string; code: string; statement: string }>; competencies: Array<{ id: string; code: string; name: string }>; values: Array<{ id: string; code: string; name: string }>; suggestedActivities: string[] }
  plans: { selected: { id: string; title: string; status: string } | null; open: Array<{ id: string; title: string; status: string; assessmentType: string; rubric: { id: string; name: string; criteria: Array<{ id: string; code: string; name: string; levels: Array<{ id: string; code: string; label: string; points: number | null }> }> } | null; components: Array<{ id: string; name: string; maxScore: number | null }> }>; recent: Array<{ id: string; title: string; status: string }> }
  learners: Learner[]
  attendance: { date: string }
  session: { id: string; state: string; revision: number; lastSavedAt: string }
  permissions: { canTakeAttendance: boolean; canCreateEvidence: boolean; canSubmit: boolean }
  warnings: Array<{ code: string; message: string }>
}

const statuses: AttendanceStatus[] = ["PRESENT", "ABSENT", "LATE", "EXCUSED"]

export default function LessonWorkspaceClient({ timetableEntryId, role }: { timetableEntryId: string; role: string }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [attendanceValues, setAttendanceValues] = useState<Record<string, AttendanceStatus>>({})
  const [selectedLearner, setSelectedLearner] = useState<Learner | null>(null)
  const [planId, setPlanId] = useState("")
  const [evidenceType, setEvidenceType] = useState("OBSERVATION")
  const [outcomeId, setOutcomeId] = useState("")
  const [score, setScore] = useState("")
  const [narrative, setNarrative] = useState("")
  const [internalNote, setInternalNote] = useState("")
  const [rubricSelections, setRubricSelections] = useState<Record<string, string>>({})
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const editable = role === "TEACHER" && workspace?.session.state !== "SUBMITTED" && workspace?.session.state !== "CLOSED"
  const currentPlan = workspace?.plans.open.find((plan) => plan.id === planId) ?? null

  const load = useCallback(async () => {
    setError("")
    const response = await fetch(`/api/teacher/lesson/${encodeURIComponent(timetableEntryId)}`, { cache: "no-store" })
    const result = await response.json()
    if (!response.ok) {
      setError(result.error || "Unable to load this lesson")
      return
    }
    const data = result as Workspace
    setWorkspace(data)
    setPlanId(data.plans.selected?.id ?? "")
    setAttendanceValues(Object.fromEntries(data.learners.flatMap((learner) => learner.attendance ? [[learner.id, learner.attendance.status]] : [])))
  }, [timetableEntryId])

  useEffect(() => { void load() }, [load])

  const selectPlan = async () => {
    if (!workspace || !editable) return
    setBusy(true)
    setError("")
    const response = await fetch(`/api/teacher/lesson/${encodeURIComponent(timetableEntryId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assessmentPlanId: planId || null, expectedRevision: workspace.session.revision }),
    })
    const result = await response.json()
    setBusy(false)
    if (!response.ok) { setError(result.error || "Unable to select plan"); return }
    setMessage("Assessment plan selected.")
    await load()
  }

  const saveAttendance = async () => {
    if (!workspace || !editable) return
    const records = Object.entries(attendanceValues).map(([studentId, status]) => ({ studentId, status }))
    if (!records.length) { setError("Choose attendance for at least one learner first."); return }
    setBusy(true)
    setError("")
    const response = await fetch(`/api/teacher/lesson/${encodeURIComponent(timetableEntryId)}/attendance`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: workspace.attendance.date, records, expectedRevision: workspace.session.revision }),
    })
    const result = await response.json()
    setBusy(false)
    if (!response.ok) { setError(result.error || "Unable to save attendance"); return }
    setMessage(`Attendance saved for ${result.savedCount} learner(s).`)
    await load()
  }

  const openEvidence = (learner: Learner) => {
    setSelectedLearner(learner)
    const existing = learner.evidence.find((item) => item.editable)
    setEvidenceType(existing?.evidenceType ?? "OBSERVATION")
    setOutcomeId(existing?.learningOutcomeId ?? workspace?.focus.outcomes[0]?.id ?? "")
    setScore(existing?.numericScore === null || existing?.numericScore === undefined ? "" : String(existing.numericScore))
    setNarrative(existing?.narrative ?? "")
    setInternalNote(existing?.internalNote ?? "")
    setRubricSelections(Object.fromEntries(existing?.rubricScores.map((item) => [item.criterionId, item.levelId]) ?? []))
  }

  const saveEvidence = async () => {
    if (!workspace || !editable || !selectedLearner || !planId) { setError("Select an open assessment plan before capturing evidence."); return }
    if (workspace.plans.selected?.id !== planId) { setError("Save the selected assessment plan before capturing evidence."); return }
    const existing = selectedLearner.evidence.find((item) => item.editable)
    setBusy(true)
    setError("")
    const response = await fetch(`/api/teacher/lesson/${encodeURIComponent(timetableEntryId)}/evidence/${encodeURIComponent(selectedLearner.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        evidenceId: existing?.id,
        expectedUpdatedAt: existing?.updatedAt,
        assessmentPlanId: planId,
        expectedRevision: workspace.session.revision,
        evidenceType,
        learningOutcomeId: outcomeId || undefined,
        numericScore: evidenceType === "SCORE" && score !== "" ? Number(score) : null,
        narrative,
        internalNote,
        rubricId: currentPlan?.rubric?.id,
        rubricScores: evidenceType === "RUBRIC" ? Object.entries(rubricSelections).map(([criterionId, levelId]) => ({ criterionId, levelId })) : [],
      }),
    })
    const result = await response.json()
    setBusy(false)
    if (!response.ok) { setError(result.error || "Unable to save evidence"); return }
    setMessage("Evidence saved as a private draft.")
    setSelectedLearner(null)
    await load()
  }

  const submit = async () => {
    if (!workspace || !editable || !planId) return
    setBusy(true)
    setError("")
    const response = await fetch(`/api/teacher/lesson/${encodeURIComponent(timetableEntryId)}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assessmentPlanId: planId,
        expectedRevision: workspace.session.revision,
        ...(workspace.session.state === "RETURNED" ? { studentIds: learners.filter((learner) => learner.evidence.some((item) => item.editable)).map((learner) => learner.id) } : {}),
      }),
    })
    const result = await response.json()
    setBusy(false)
    if (!response.ok) {
      setError(result.missingStudentIds?.length ? `${result.error}. ${result.missingStudentIds.length} learner(s) still need evidence.` : result.error || "Unable to submit")
      return
    }
    setMessage(`Submitted ${result.submittedCount} learner evidence record(s) for moderation.`)
    await load()
  }

  if (error && !workspace) return <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">{error}</div>
  if (!workspace) return <div className="p-8 text-sm text-[#6b6f7e]">Loading lesson…</div>

  const { context, focus, learners } = workspace
  const presentCount = learners.filter((learner) => attendanceValues[learner.id] === "PRESENT").length
  const draftCount = learners.filter((learner) => learner.evidence.some((item) => item.status === "DRAFT" || item.status === "RETURNED")).length

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <header className="sticky top-16 z-20 border-b border-[#e6e9eb] bg-[#f8faf9]/95 py-4 backdrop-blur lg:top-0">
        <Link href="/dashboard/timetable" className="text-xs font-semibold text-[#187574] hover:underline">← Timetable</Link>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#187574]">{context.timetableEntry.day} · {context.timetableEntry.startTime}–{context.timetableEntry.endTime} · {context.academicYear.name}{context.period ? ` · ${context.period.name}` : ""}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#1c1c1e] sm:text-3xl">{context.class.name} · {context.subject.name}</h1>
            <p className="mt-1 text-sm text-[#68717b]">{context.class.grade}{context.timetableEntry.room ? ` · Room ${context.timetableEntry.room}` : ""} · {context.teacher.name}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-[#e5f7f3] px-3 py-2 text-[#187574]">Attendance {presentCount}/{learners.length}</span>
            <span className="rounded-full bg-[#fff4d9] px-3 py-2 text-[#80651c]">Evidence {draftCount}/{learners.length}</span>
            <span className="rounded-full bg-[#f0f2f3] px-3 py-2 text-[#68717b]">{workspace.session.state}</span>
          </div>
        </div>
      </header>

      {message && <div role="status" className="rounded-xl border border-[#b7e1d9] bg-[#eaf8f5] px-4 py-3 text-sm text-[#17645f]">{message}</div>}
      {!editable && role === "TEACHER" && <div role="status" className="rounded-xl border border-[#dce2e2] bg-[#f1f3f3] px-4 py-3 text-sm text-[#526966]">This lesson has been submitted or closed and is read-only.</div>}
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
      {workspace.warnings.map((warning) => <div key={warning.code} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{warning.message}</div>)}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,.75fr)]">
        <main className="space-y-6">
          <section className="rounded-2xl border border-[#e6e9eb] bg-white p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#8e91a0]">Learning focus</p><h2 className="mt-1 text-lg font-semibold text-[#1c1c1e]">{context.curriculum.frameworkName ?? "Curriculum not linked"}{context.curriculum.version ? ` · ${context.curriculum.version}` : ""}</h2><p className="mt-1 text-sm text-[#68717b]">{context.curriculum.grade?.displayName ?? context.class.grade}</p></div>
              {workspace.permissions.canCreateEvidence && <div className="flex gap-2"><select aria-label="Assessment plan" value={planId} onChange={(event) => setPlanId(event.target.value)} className="min-h-11 min-w-0 rounded-lg border border-[#dce2e2] bg-white px-3 text-sm"><option value="">Choose open plan</option>{workspace.plans.open.map((plan) => <option key={plan.id} value={plan.id}>{plan.title}</option>)}</select><button type="button" onClick={selectPlan} disabled={busy || !planId || planId === workspace.plans.selected?.id} className="min-h-11 rounded-lg bg-[#173b3b] px-4 text-sm font-semibold text-white disabled:opacity-50">Use plan</button></div>}
            </div>
            {focus.outcomes.length > 0 ? <ul className="mt-5 space-y-2">{focus.outcomes.map((outcome) => <li key={outcome.id} className="rounded-lg bg-[#f5f9f8] p-3"><span className="mr-2 font-mono text-xs font-bold text-[#187574]">{outcome.code}</span><span className="text-sm text-[#273333]">{outcome.statement}</span></li>)}</ul> : <p className="mt-4 text-sm text-[#8e91a0]">No learning outcomes are attached to this lesson or selected plan yet.</p>}
            {focus.competencies.length > 0 && <p className="mt-4 text-xs text-[#68717b]">Competencies: {focus.competencies.map((item) => item.name).join(", ")}</p>}
            {focus.suggestedActivities.length > 0 && <div className="mt-4"><p className="text-[10px] font-bold uppercase tracking-wide text-[#8e91a0]">Suggested activities</p><ul className="mt-2 list-inside list-disc space-y-1 text-sm text-[#68717b]">{focus.suggestedActivities.slice(0, 5).map((activity) => <li key={activity}>{activity}</li>)}</ul></div>}
          </section>

          <section className="overflow-hidden rounded-2xl border border-[#e6e9eb] bg-white">
            <div className="flex flex-col gap-3 border-b border-[#eef0f2] p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#8e91a0]">Learner workflow</p><h2 className="mt-1 text-lg font-semibold text-[#1c1c1e]">{learners.length} learners</h2></div>{workspace.permissions.canTakeAttendance && <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setAttendanceValues(Object.fromEntries(learners.map((learner) => [learner.id, "PRESENT"]))) } className="min-h-11 rounded-lg border border-[#dce2e2] px-3 text-xs font-semibold text-[#335452]">Mark all present</button><button type="button" disabled={busy} onClick={saveAttendance} className="min-h-11 rounded-lg bg-[#176f69] px-4 text-xs font-semibold text-white disabled:opacity-50">Save attendance</button></div>}</div>
            <ul className="divide-y divide-[#eef0f2]">{learners.map((learner) => {
              const editableEvidence = learner.evidence.find((item) => item.editable)
              return <li key={learner.id} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5"><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#1c1c1e]">{learner.name}</p><p className="mt-0.5 text-xs text-[#8e91a0]">Admission {learner.admissionNo} · {learner.evidence[0]?.status ?? "No evidence"}</p></div><div className="flex flex-wrap items-center gap-2">{workspace.permissions.canTakeAttendance && <select aria-label={`Attendance for ${learner.name}`} value={attendanceValues[learner.id] ?? ""} onChange={(event) => setAttendanceValues({ ...attendanceValues, [learner.id]: event.target.value as AttendanceStatus })} className="min-h-11 rounded-lg border border-[#dce2e2] bg-white px-3 text-xs"><option value="">Attendance</option>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>}{workspace.permissions.canCreateEvidence && <button type="button" onClick={() => openEvidence(learner)} className="min-h-11 rounded-lg border border-[#a8cfca] px-3 text-xs font-semibold text-[#176f69]">{editableEvidence ? "Edit draft" : "Capture evidence"}</button>}</div></li>
            })}</ul>
            {learners.length === 0 && <p className="p-6 text-sm text-[#8e91a0]">No learners are enrolled in this class.</p>}
            {workspace.permissions.canSubmit && <div className="flex flex-col gap-3 border-t border-[#eef0f2] bg-[#f8faf9] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><p className="text-xs text-[#68717b]">Submission sends drafts to the school moderation queue; it does not publish them to families.</p><button type="button" disabled={busy || !planId || workspace.session.state === "SUBMITTED"} onClick={submit} className="min-h-11 rounded-lg bg-[#d85e43] px-5 text-sm font-semibold text-white disabled:opacity-50">Submit for review</button></div>}
          </section>
        </main>

        <aside className="h-fit rounded-2xl border border-[#e6e9eb] bg-[#f2f7f6] p-5 xl:sticky xl:top-28">
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#187574]">Lesson context</p>
          <dl className="mt-4 space-y-3 text-sm"><div><dt className="text-xs text-[#8e91a0]">Teacher</dt><dd className="font-medium text-[#273333]">{context.teacher.name}</dd></div><div><dt className="text-xs text-[#8e91a0]">Room</dt><dd className="font-medium text-[#273333]">{context.timetableEntry.room || "Not set"}</dd></div><div><dt className="text-xs text-[#8e91a0]">Selected plan</dt><dd className="font-medium text-[#273333]">{workspace.plans.selected?.title ?? "None"}</dd></div><div><dt className="text-xs text-[#8e91a0]">Last saved</dt><dd className="font-medium text-[#273333]">{new Date(workspace.session.lastSavedAt).toLocaleString()}</dd></div></dl>
          {context.timetableEntry.notes && <p className="mt-4 border-t border-[#dce8e6] pt-4 text-sm leading-6 text-[#526966]">{context.timetableEntry.notes}</p>}
        </aside>
      </div>

      {selectedLearner && <div role="presentation" className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 sm:items-center sm:p-6" onClick={(event) => { if (event.target === event.currentTarget) setSelectedLearner(null) }}><section role="dialog" aria-modal="true" aria-labelledby="evidence-title" className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-2xl sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#187574]">Private draft</p><h2 id="evidence-title" className="mt-1 text-xl font-semibold text-[#1c1c1e]">{selectedLearner.name}</h2><p className="mt-1 text-xs text-[#8e91a0]">{context.class.name} · {context.subject.name}</p></div><button type="button" aria-label="Close evidence form" onClick={() => setSelectedLearner(null)} className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#dce2e2] text-lg">×</button></div><div className="mt-5 grid gap-4"><label className="grid gap-1.5 text-xs font-semibold text-[#526966]">Evidence type<select value={evidenceType} onChange={(event) => setEvidenceType(event.target.value)} className="min-h-11 rounded-lg border border-[#dce2e2] px-3 text-sm text-[#273333]">{["OBSERVATION", "SCORE", "RUBRIC", "PROJECT", "PRACTICAL", "PRESENTATION", "SELF_REFLECTION", "PEER_REVIEW", "PORTFOLIO"].map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}</select></label>{focus.outcomes.length > 0 && <label className="grid gap-1.5 text-xs font-semibold text-[#526966]">Learning outcome<select value={outcomeId} onChange={(event) => setOutcomeId(event.target.value)} className="min-h-11 rounded-lg border border-[#dce2e2] px-3 text-sm text-[#273333]"><option value="">None</option>{focus.outcomes.map((outcome) => <option key={outcome.id} value={outcome.id}>{outcome.code} · {outcome.statement}</option>)}</select></label>}{evidenceType === "SCORE" && <label className="grid gap-1.5 text-xs font-semibold text-[#526966]">Score<input type="number" min="0" step="any" value={score} onChange={(event) => setScore(event.target.value)} className="min-h-11 rounded-lg border border-[#dce2e2] px-3 text-sm text-[#273333]" /></label>}{evidenceType === "RUBRIC" && currentPlan?.rubric && <fieldset className="grid gap-3"><legend className="text-xs font-semibold text-[#526966]">{currentPlan.rubric.name}</legend>{currentPlan.rubric.criteria.map((criterion) => <label key={criterion.id} className="grid gap-1 text-xs text-[#526966]">{criterion.name}<select value={rubricSelections[criterion.id] ?? ""} onChange={(event) => setRubricSelections({ ...rubricSelections, [criterion.id]: event.target.value })} className="min-h-11 rounded-lg border border-[#dce2e2] px-3 text-sm text-[#273333]"><option value="">Choose level</option>{criterion.levels.map((level) => <option key={level.id} value={level.id}>{level.label}</option>)}</select></label>)}</fieldset>}{evidenceType === "RUBRIC" && !currentPlan?.rubric && <p className="text-sm text-amber-800">This assessment plan has no rubric configured.</p>}<label className="grid gap-1.5 text-xs font-semibold text-[#526966]">Feedback / observation<textarea rows={4} maxLength={5000} value={narrative} onChange={(event) => setNarrative(event.target.value)} className="rounded-lg border border-[#dce2e2] p-3 text-sm text-[#273333]" /></label><label className="grid gap-1.5 text-xs font-semibold text-[#526966]">Internal moderation note<textarea rows={2} maxLength={5000} value={internalNote} onChange={(event) => setInternalNote(event.target.value)} className="rounded-lg border border-[#dce2e2] p-3 text-sm text-[#273333]" /></label></div><div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setSelectedLearner(null)} className="min-h-11 rounded-lg border border-[#dce2e2] px-4 text-sm font-semibold text-[#526966]">Cancel</button><button type="button" disabled={busy || !planId || (evidenceType === "RUBRIC" && !currentPlan?.rubric)} onClick={saveEvidence} className="min-h-11 rounded-lg bg-[#176f69] px-5 text-sm font-semibold text-white disabled:opacity-50">Save draft</button></div></section></div>}
    </div>
  )
}