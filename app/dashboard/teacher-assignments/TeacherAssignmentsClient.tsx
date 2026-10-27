"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"

type Option = { id: string; name: string; email?: string; grade?: string; code?: string }
type Assignment = {
  id: string
  teacherId: string
  classId: string
  subjectId: string | null
  teacher: { id?: string; name: string; email: string }
  class: { id?: string; name: string; grade: string }
  subject: { id?: string; name: string; code: string } | null
}

export default function TeacherAssignmentsClient() {
  const [teachers, setTeachers] = useState<Option[]>([])
  const [classes, setClasses] = useState<Option[]>([])
  const [subjects, setSubjects] = useState<Option[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  
  // Create Form State
  const [assignmentType, setAssignmentType] = useState<"CLASS_TEACHER" | "SUBJECT_TEACHER">("CLASS_TEACHER")
  const [form, setForm] = useState({ teacherId: "", classId: "", subjectId: "" })
  
  // Edit Modal State
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null)
  const [editTeacherId, setEditTeacherId] = useState("")
  const [editClassId, setEditClassId] = useState("")
  const [editSubjectId, setEditSubjectId] = useState("")
  const [editAssignmentType, setEditAssignmentType] = useState<"CLASS_TEACHER" | "SUBJECT_TEACHER">("CLASS_TEACHER")

  // Search and filter state
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState<"ALL" | "CLASS_TEACHER" | "SUBJECT_TEACHER">("ALL")
  
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/teacher-assignments", { cache: "no-store" })
      const result = await response.json()
      if (response.ok) {
        setTeachers(result.teachers || [])
        setClasses(result.classes || [])
        setSubjects(result.subjects || [])
        setAssignments(result.assignments || [])
      } else {
        setMessage(result.error || "Unable to load teacher assignments")
      }
    } catch {
      setMessage("Failed to load teacher assignments.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setMessage("")

    const payload = {
      teacherId: form.teacherId,
      classId: form.classId,
      subjectId: assignmentType === "CLASS_TEACHER" ? "" : form.subjectId,
    }

    if (assignmentType === "SUBJECT_TEACHER" && !form.subjectId) {
      setMessage("Please choose a subject for this subject teacher.")
      setSaving(false)
      return
    }

    try {
      const response = await fetch("/api/teacher-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok) {
        setMessage(result.error || "Unable to save assignment")
      } else {
        setMessage(
          assignmentType === "CLASS_TEACHER"
            ? "Class teacher assigned successfully."
            : "Subject teacher assigned successfully."
        )
        setForm({ ...form, subjectId: "" })
        await load()
      }
    } catch {
      setMessage("Failed to save assignment.")
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (a: Assignment) => {
    setEditingAssignment(a)
    setEditTeacherId(a.teacherId)
    setEditClassId(a.classId)
    setEditSubjectId(a.subjectId || "")
    setEditAssignmentType(a.subjectId === null ? "CLASS_TEACHER" : "SUBJECT_TEACHER")
  }

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingAssignment) return
    setSaving(true)
    setMessage("")

    const payload = {
      id: editingAssignment.id,
      teacherId: editTeacherId,
      classId: editClassId,
      subjectId: editAssignmentType === "CLASS_TEACHER" ? "" : editSubjectId,
    }

    if (editAssignmentType === "SUBJECT_TEACHER" && !editSubjectId) {
      setMessage("Please choose a subject for this subject teacher.")
      setSaving(false)
      return
    }

    try {
      const response = await fetch("/api/teacher-assignments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok) {
        setMessage(result.error || "Unable to update assignment")
      } else {
        setMessage("Assignment updated and remapped successfully.")
        setEditingAssignment(null)
        await load()
      }
    } catch {
      setMessage("Failed to update assignment.")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!window.confirm("Remove this teacher assignment?")) return
    try {
      const response = await fetch(`/api/teacher-assignments?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      })
      const result = await response.json()
      setMessage(response.ok ? "Assignment removed." : result.error || "Unable to remove assignment")
      if (response.ok) await load()
    } catch {
      setMessage("Failed to remove assignment.")
    }
  }

  // Calculate classes that have a designated Class Teacher (subjectId === null)
  const classesWithClassTeacher = useMemo(() => {
    return new Set(assignments.filter((a) => a.subjectId === null).map((a) => a.classId))
  }, [assignments])

  const unassignedClasses = useMemo(() => {
    return classes.filter((c) => !classesWithClassTeacher.has(c.id))
  }, [classes, classesWithClassTeacher])

  // Filtered assignments
  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const matchesSearch =
        a.teacher.name.toLowerCase().includes(search.toLowerCase()) ||
        a.class.name.toLowerCase().includes(search.toLowerCase()) ||
        (a.subject?.name || "").toLowerCase().includes(search.toLowerCase())

      if (!matchesSearch) return false

      if (filterType === "CLASS_TEACHER") return a.subjectId === null
      if (filterType === "SUBJECT_TEACHER") return a.subjectId !== null
      return true
    })
  }, [assignments, search, filterType])

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-[28px] bg-[#e7edff] px-7 py-10 sm:px-12 sm:py-14">
        <div className="absolute -right-12 -top-16 h-64 w-64 rounded-full border-[32px] border-[#cbd7ff]" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#4262ff]">
            School Operations & Staffing
          </p>
          <h1 className="mt-3 text-4xl font-medium tracking-[-.055em] text-[#1c1c1e] sm:text-5xl">
            Put every teacher in the right room.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[#5263a6]">
            Assign <strong>Class Teachers (Homeroom)</strong> to lead attendance and report cards, or map <strong>Subject Teachers</strong> to specific CBC learning areas.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/dashboard/users/new"
              className="miro-pill bg-[#1c1c1e] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#2c2c34]"
            >
              + Onboard New Teacher
            </Link>
            <Link
              href="/dashboard/timetable"
              className="miro-pill border border-[#4262ff]/30 bg-white/60 px-4 py-2.5 text-xs font-semibold text-[#1c1c1e] hover:bg-white"
            >
              View Timetable ↗
            </Link>
          </div>
        </div>
      </section>

      {/* Coverage Status Bar */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="miro-surface p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#8e91a0]">Total Teachers</p>
          <p className="mt-2 font-mono text-3xl font-semibold text-[#1c1c1e]">{teachers.length}</p>
          <p className="mt-1 text-xs text-[#8e91a0]">Teaching staff</p>
        </div>
        <div className="miro-surface p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#8e91a0]">Total Classes</p>
          <p className="mt-2 font-mono text-3xl font-semibold text-[#1c1c1e]">{classes.length}</p>
          <p className="mt-1 text-xs text-[#8e91a0]">Active streams</p>
        </div>
        <div className="miro-surface p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#8e91a0]">Total Assignments</p>
          <p className="mt-2 font-mono text-3xl font-semibold text-[#4262ff]">{assignments.length}</p>
          <p className="mt-1 text-xs text-[#8e91a0]">Active connections</p>
        </div>
        <div className={`miro-surface p-5 ${unassignedClasses.length > 0 ? "border-amber-300 bg-[#fffdf0]" : ""}`}>
          <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#8e91a0]">Missing Class Teacher</p>
          <p className={`mt-2 font-mono text-3xl font-semibold ${unassignedClasses.length > 0 ? "text-[#b45309]" : "text-[#187574]"}`}>
            {unassignedClasses.length}
          </p>
          <p className="mt-1 text-xs text-[#8e91a0]">
            {unassignedClasses.length > 0 ? "Needs homeroom lead" : "All classes assigned"}
          </p>
        </div>
      </section>

      {/* Warning Alert if any classes lack Class Teacher */}
      {unassignedClasses.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-[#fffbeb] p-4 text-xs text-amber-900">
          <span className="font-bold">Attention:</span> The following classes do not have a designated Class Teacher:{" "}
          <span className="font-semibold">{unassignedClasses.map((c) => c.name).join(", ")}</span>.
          Assign a Class Teacher so daily attendance and report cards have an official sign-off lead.
        </div>
      )}

      {message && (
        <div role="status" className="rounded-2xl bg-[#fff4c4] px-5 py-4 text-sm font-semibold text-[#746019]">
          {message}
        </div>
      )}

      {/* Main Workspace Grid */}
      <section className="grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
        {/* Left: Assignment Creation Form */}
        <form onSubmit={save} className="miro-surface space-y-5 p-6 sm:p-8 self-start">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#8e91a0]">New Assignment</p>
            <h2 className="mt-1 text-2xl font-medium tracking-tight text-[#1c1c1e]">Connect Teacher to Class</h2>
          </div>

          <div>
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#6b6f7e]">
              Assignment Scope
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAssignmentType("CLASS_TEACHER")}
                className={`rounded-xl border p-3 text-left transition ${
                  assignmentType === "CLASS_TEACHER"
                    ? "border-[#1c1c1e] bg-[#1c1c1e] text-white"
                    : "border-[#e0e2e8] bg-white text-[#1c1c1e] hover:bg-[#f7f8fa]"
                }`}
              >
                <span className="block text-xs font-bold">🏫 Class Teacher</span>
                <span className={`mt-0.5 block text-[10px] ${assignmentType === "CLASS_TEACHER" ? "text-slate-300" : "text-[#8e91a0]"}`}>
                  Homeroom & attendance
                </span>
              </button>
              <button
                type="button"
                onClick={() => setAssignmentType("SUBJECT_TEACHER")}
                className={`rounded-xl border p-3 text-left transition ${
                  assignmentType === "SUBJECT_TEACHER"
                    ? "border-[#1c1c1e] bg-[#1c1c1e] text-white"
                    : "border-[#e0e2e8] bg-white text-[#1c1c1e] hover:bg-[#f7f8fa]"
                }`}
              >
                <span className="block text-xs font-bold">📚 Subject Teacher</span>
                <span className={`mt-0.5 block text-[10px] ${assignmentType === "SUBJECT_TEACHER" ? "text-slate-300" : "text-[#8e91a0]"}`}>
                  Specific learning area
                </span>
              </button>
            </div>
          </div>

          <label className="block text-xs font-bold uppercase tracking-wide text-[#6b6f7e]">
            Teacher <span className="text-red-500">*</span>
            <select
              required
              value={form.teacherId}
              onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
              className="mt-2 w-full rounded-xl border border-[#e0e2e8] bg-white px-4 py-3 text-sm outline-none focus:border-[#4262ff]"
            >
              <option value="">Select teacher…</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.email})
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-bold uppercase tracking-wide text-[#6b6f7e]">
            Class / Stream <span className="text-red-500">*</span>
            <select
              required
              value={form.classId}
              onChange={(e) => setForm({ ...form, classId: e.target.value })}
              className="mt-2 w-full rounded-xl border border-[#e0e2e8] bg-white px-4 py-3 text-sm outline-none focus:border-[#4262ff]"
            >
              <option value="">Select class…</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · Grade {c.grade} {!classesWithClassTeacher.has(c.id) ? "(No Class Teacher)" : ""}
                </option>
              ))}
            </select>
          </label>

          {assignmentType === "SUBJECT_TEACHER" && (
            <label className="block text-xs font-bold uppercase tracking-wide text-[#6b6f7e] animate-fade-in">
              Learning Area / Subject <span className="text-red-500">*</span>
              <select
                required
                value={form.subjectId}
                onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
                className="mt-2 w-full rounded-xl border border-[#e0e2e8] bg-white px-4 py-3 text-sm outline-none focus:border-[#4262ff]"
              >
                <option value="">Choose subject…</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </label>
          )}

          <button
            disabled={saving}
            className="miro-pill w-full bg-[#1c1c1e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2c2c34] disabled:opacity-50"
          >
            {saving
              ? "Saving…"
              : assignmentType === "CLASS_TEACHER"
              ? "Assign as Class Teacher →"
              : "Assign Subject Teacher →"}
          </button>
        </form>

        {/* Right: Assignments List & Filter */}
        <div className="miro-surface overflow-hidden">
          <div className="border-b border-[#eef0f3] p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#8e91a0]">Current Roster</p>
                <h2 className="mt-1 text-2xl font-medium tracking-tight text-[#1c1c1e]">Who Manages What</h2>
              </div>
              <span className="miro-pill bg-[#f7f8fa] px-3 py-1 text-xs font-semibold text-[#555a6a]">
                {filteredAssignments.length} shown
              </span>
            </div>

            {/* Filter controls */}
            <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search teacher, class, or subject…"
                className="w-full rounded-xl border border-[#e0e2e8] bg-white px-3 py-2 text-xs outline-none focus:border-[#4262ff] sm:max-w-xs"
              />
              <div className="flex gap-1.5 overflow-x-auto text-xs">
                {(["ALL", "CLASS_TEACHER", "SUBJECT_TEACHER"] as const).map((ft) => (
                  <button
                    key={ft}
                    onClick={() => setFilterType(ft)}
                    className={`rounded-full px-3 py-1.5 font-semibold transition ${
                      filterType === ft
                        ? "bg-[#1c1c1e] text-white"
                        : "bg-[#f7f8fa] text-[#6b6f7e] hover:bg-[#eef0f3]"
                    }`}
                  >
                    {ft === "ALL" ? "All" : ft === "CLASS_TEACHER" ? "Class Teachers" : "Subject Teachers"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <p className="p-8 text-sm text-[#6b6f7e]">Loading assignments…</p>
          ) : filteredAssignments.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-medium text-[#555a6a]">No matching assignments found.</p>
              <p className="mt-1 text-xs text-[#8e91a0]">Try adjusting your search or add a new assignment.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#eef0f3] max-h-[560px] overflow-y-auto">
              {filteredAssignments.map((assignment) => {
                const isClassTeacher = assignment.subjectId === null
                return (
                  <div
                    key={assignment.id}
                    className="flex flex-col justify-between gap-3 p-5 transition hover:bg-[#fafbfc] sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-bold text-[#1c1c1e]">{assignment.teacher.name}</p>
                        {isClassTeacher ? (
                          <span className="miro-pill bg-[#c3faf5] px-2.5 py-0.5 text-[10px] font-bold text-[#187574]">
                            🏫 Class Teacher
                          </span>
                        ) : (
                          <span className="miro-pill bg-[#e7edff] px-2.5 py-0.5 text-[10px] font-bold text-[#4262ff]">
                            📚 {assignment.subject?.name || "Subject"}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-[#6b6f7e]">
                        {assignment.class.name} · Grade {assignment.class.grade} ·{" "}
                        <span className="font-mono text-[11px] text-[#8e91a0]">{assignment.teacher.email}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => openEdit(assignment)}
                        className="rounded-lg border border-[#e0e2e8] bg-white px-2.5 py-1 text-xs font-semibold text-[#1c1c1e] hover:bg-[#f7f8fa] transition"
                      >
                        Edit ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(assignment.id)}
                        className="rounded-lg border border-[#f1c6d7] px-2.5 py-1 text-xs font-semibold text-[#a33c68] transition hover:bg-[#fff1f6]"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* Edit Assignment Modal */}
      {editingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-[24px] bg-white p-6 sm:p-7 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#e0e2e8] pb-4">
              <div>
                <h3 className="text-lg font-bold text-[#1c1c1e]">Edit Teacher Assignment</h3>
                <p className="mt-0.5 text-xs text-[#6b6f7e]">Remap assigned class, teacher, or subject.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingAssignment(null)}
                className="text-sm font-bold text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={saveEdit} className="mt-5 space-y-4">
              <div>
                <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#6b6f7e]">
                  Role Scope
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditAssignmentType("CLASS_TEACHER")}
                    className={`rounded-xl border p-2.5 text-left transition ${
                      editAssignmentType === "CLASS_TEACHER"
                        ? "border-[#1c1c1e] bg-[#1c1c1e] text-white"
                        : "border-[#e0e2e8] bg-white text-[#1c1c1e]"
                    }`}
                  >
                    <span className="block text-xs font-bold">🏫 Class Teacher</span>
                    <span className={`text-[10px] ${editAssignmentType === "CLASS_TEACHER" ? "text-slate-300" : "text-[#8e91a0]"}`}>
                      Homeroom lead
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditAssignmentType("SUBJECT_TEACHER")}
                    className={`rounded-xl border p-2.5 text-left transition ${
                      editAssignmentType === "SUBJECT_TEACHER"
                        ? "border-[#1c1c1e] bg-[#1c1c1e] text-white"
                        : "border-[#e0e2e8] bg-white text-[#1c1c1e]"
                    }`}
                  >
                    <span className="block text-xs font-bold">📚 Subject Teacher</span>
                    <span className={`text-[10px] ${editAssignmentType === "SUBJECT_TEACHER" ? "text-slate-300" : "text-[#8e91a0]"}`}>
                      Learning area
                    </span>
                  </button>
                </div>
              </div>

              <label className="block text-xs font-bold uppercase tracking-wide text-[#6b6f7e]">
                Assigned Teacher
                <select
                  required
                  value={editTeacherId}
                  onChange={(e) => setEditTeacherId(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#e0e2e8] bg-white px-3.5 py-2.5 text-sm"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.email})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-bold uppercase tracking-wide text-[#6b6f7e]">
                Assigned Class
                <select
                  required
                  value={editClassId}
                  onChange={(e) => setEditClassId(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#e0e2e8] bg-white px-3.5 py-2.5 text-sm"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · Grade {c.grade}
                    </option>
                  ))}
                </select>
              </label>

              {editAssignmentType === "SUBJECT_TEACHER" && (
                <label className="block text-xs font-bold uppercase tracking-wide text-[#6b6f7e]">
                  Subject / Learning Area
                  <select
                    required
                    value={editSubjectId}
                    onChange={(e) => setEditSubjectId(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-[#e0e2e8] bg-white px-3.5 py-2.5 text-sm"
                  >
                    <option value="">Select subject…</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div className="mt-6 flex justify-end gap-2 pt-2 border-t border-[#e0e2e8]">
                <button
                  type="button"
                  onClick={() => setEditingAssignment(null)}
                  className="miro-pill border border-[#e0e2e8] px-4 py-2 text-xs font-semibold text-[#6b6f7e]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="miro-pill bg-[#1c1c1e] px-5 py-2 text-xs font-semibold text-white"
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
