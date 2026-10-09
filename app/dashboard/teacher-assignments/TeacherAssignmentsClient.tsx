"use client"

import { useEffect, useState } from "react"

type Option = { id: string; name: string; email?: string; grade?: string; code?: string }
type Assignment = { id: string; teacherId: string; classId: string; subjectId: string | null; teacher: { name: string; email: string }; class: { name: string; grade: string }; subject: { name: string; code: string } | null }

export default function TeacherAssignmentsClient() {
  const [teachers, setTeachers] = useState<Option[]>([])
  const [classes, setClasses] = useState<Option[]>([])
  const [subjects, setSubjects] = useState<Option[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [form, setForm] = useState({ teacherId: "", classId: "", subjectId: "" })
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const response = await fetch("/api/teacher-assignments", { cache: "no-store" })
    const result = await response.json()
    if (response.ok) { setTeachers(result.teachers); setClasses(result.classes); setSubjects(result.subjects); setAssignments(result.assignments) }
    else setMessage(result.error || "Unable to load teacher assignments")
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setMessage("")
    const response = await fetch("/api/teacher-assignments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    const result = await response.json()
    if (!response.ok) setMessage(result.error || "Unable to save assignment")
    else { setMessage("Teacher assigned successfully."); setForm({ ...form, subjectId: "" }); await load() }
    setSaving(false)
  }

  const remove = async (id: string) => {
    if (!window.confirm("Remove this teacher assignment?")) return
    const response = await fetch(`/api/teacher-assignments?id=${encodeURIComponent(id)}`, { method: "DELETE" })
    const result = await response.json()
    setMessage(response.ok ? "Assignment removed." : result.error || "Unable to remove assignment")
    if (response.ok) await load()
  }

  return <div className="space-y-8 animate-fade-in"><section className="relative overflow-hidden rounded-[28px] bg-[#e7edff] px-7 py-10 sm:px-12 sm:py-14"><div className="absolute -right-12 -top-16 h-64 w-64 rounded-full border-[32px] border-[#cbd7ff]" /><div className="relative"><p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#4262ff]">School operations</p><h1 className="mt-3 text-4xl font-medium tracking-[-.055em] sm:text-6xl">Put every teacher in the right room.</h1><p className="mt-5 max-w-2xl text-sm leading-6 text-[#5263a6]">Manage class ownership centrally. Subject assignments are optional, so a teacher can oversee an entire class or a specific learning area.</p></div></section>{message && <div role="status" className="rounded-2xl bg-[#fff4c4] px-5 py-4 text-sm font-semibold text-[#746019]">{message}</div>}<section className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]"><form onSubmit={save} className="miro-surface space-y-4 p-6 sm:p-8"><div><p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#8e91a0]">New connection</p><h2 className="mt-2 text-2xl font-medium tracking-tight">Assign teacher</h2></div><label className="block text-xs font-bold uppercase tracking-wide text-[#6b6f7e]">Teacher<select required value={form.teacherId} onChange={(event) => setForm({ ...form, teacherId: event.target.value })} className="mt-2 w-full rounded-xl border border-[#e0e2e8] bg-white px-4 py-3 text-sm"><option value="">Select teacher</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name} · {teacher.email}</option>)}</select></label><label className="block text-xs font-bold uppercase tracking-wide text-[#6b6f7e]">Class<select required value={form.classId} onChange={(event) => setForm({ ...form, classId: event.target.value })} className="mt-2 w-full rounded-xl border border-[#e0e2e8] bg-white px-4 py-3 text-sm"><option value="">Select class</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name} · Grade {item.grade}</option>)}</select></label><label className="block text-xs font-bold uppercase tracking-wide text-[#6b6f7e]">Subject <span className="font-normal normal-case text-[#8e91a0]">(optional)</span><select value={form.subjectId} onChange={(event) => setForm({ ...form, subjectId: event.target.value })} className="mt-2 w-full rounded-xl border border-[#e0e2e8] bg-white px-4 py-3 text-sm"><option value="">All subjects</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name} · {subject.code}</option>)}</select></label><button disabled={saving} className="miro-pill w-full bg-[#1c1c1e] px-5 py-3 text-sm font-medium text-white disabled:opacity-50">{saving ? "Saving…" : "Assign teacher +"}</button></form><div className="miro-surface overflow-hidden"><div className="border-b border-[#eef0f3] p-6"><p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#8e91a0]">Current connections</p><h2 className="mt-2 text-2xl font-medium tracking-tight">Who manages what</h2></div>{loading ? <p className="p-6 text-sm text-[#6b6f7e]">Loading assignments…</p> : assignments.length === 0 ? <p className="p-6 text-sm text-[#6b6f7e]">No teacher-class assignments yet.</p> : <div className="divide-y divide-[#eef0f3]">{assignments.map((assignment) => <div key={assignment.id} className="flex items-center justify-between gap-4 p-5"><div><p className="text-sm font-semibold">{assignment.teacher.name}</p><p className="mt-1 text-xs text-[#6b6f7e]">{assignment.class.name} · Grade {assignment.class.grade} · {assignment.subject?.name || "All subjects"}</p></div><button type="button" onClick={() => remove(assignment.id)} className="rounded-full border border-[#f1c6d7] px-3 py-1.5 text-xs font-semibold text-[#a33c68] hover:bg-[#fff1f6]">Remove</button></div>)}</div>}</div></section></div>
}
