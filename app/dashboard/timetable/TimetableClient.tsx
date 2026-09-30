"use client"

import { useEffect, useMemo, useState } from "react"

type Entry = { id: string; day: string; startTime: string; endTime: string; room: string | null; class: { id: string; name: string; grade: string }; teacher: { id: string; name: string }; subject: { id: string; name: string; code: string }; academicYear: { id: string; name: string }; period: { id: string; name: string } | null }
type Option = { id: string; name: string; grade?: string; code?: string; academicYearId?: string; isCurrent?: boolean }
const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]

export default function TimetableClient({ role }: { role: string }) {
  const admin = role !== "TEACHER"
  const [entries, setEntries] = useState<Entry[]>([])
  const [years, setYears] = useState<Option[]>([])
  const [classes, setClasses] = useState<Option[]>([])
  const [teachers, setTeachers] = useState<Option[]>([])
  const [subjects, setSubjects] = useState<Option[]>([])
  const [periods, setPeriods] = useState<Option[]>([])
  const [yearId, setYearId] = useState("")
  const [form, setForm] = useState({ academicYearId: "", periodId: "", classId: "", teacherId: "", subjectId: "", day: "MONDAY", startTime: "08:00", endTime: "08:40", room: "" })
  const [message, setMessage] = useState("")

  const load = async (selectedYear?: string) => {
    const query = selectedYear ? `?academicYearId=${encodeURIComponent(selectedYear)}` : ""
    const response = await fetch(`/api/timetable${query}`, { cache: "no-store" }); const result = await response.json()
    if (!response.ok) { setMessage(result.error || "Unable to load timetable"); return }
    setEntries(result.entries); setYears(result.years); setClasses(result.classes || []); setTeachers(result.teachers || []); setSubjects(result.subjects || []); setPeriods(result.periods || [])
    const active = selectedYear || result.years.find((year: Option) => year.isCurrent)?.id || result.years[0]?.id || ""
    setYearId(active); setForm((current) => ({ ...current, academicYearId: active }))
  }
  useEffect(() => { load() }, [])
  const filteredPeriods = useMemo(() => periods.filter((period) => period.academicYearId === yearId), [periods, yearId])
  const grouped = useMemo(() => DAYS.map((day) => ({ day, items: entries.filter((entry) => entry.day === day) })), [entries])

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setMessage("")
    const response = await fetch("/api/timetable", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); const result = await response.json()
    setMessage(response.ok ? "Timetable entry added." : result.error || "Unable to save timetable entry")
    if (response.ok) { await load(yearId); setForm({ ...form, periodId: "", room: "" }) }
  }
  const remove = async (id: string) => { const response = await fetch(`/api/timetable?id=${encodeURIComponent(id)}`, { method: "DELETE" }); const result = await response.json(); setMessage(response.ok ? "Entry removed." : result.error || "Unable to remove entry"); if (response.ok) await load(yearId) }

  return <div className="space-y-8 animate-fade-in"><section className="relative overflow-hidden rounded-[28px] bg-[#c3faf5] px-7 py-10 sm:px-12 sm:py-14"><div className="absolute -right-10 -top-16 h-64 w-64 rounded-full border-[32px] border-[#83dcd5]" /><div className="relative"><p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#187574]">Weekly rhythm</p><h1 className="mt-3 text-4xl font-medium tracking-[-.055em] sm:text-6xl">A clear week, at a glance.</h1><p className="mt-5 max-w-2xl text-sm leading-6 text-[#397e7b]">{admin ? "Build a clash-aware timetable for classes and teachers." : "Your teaching timetable, organized by day, time, class, and room."}</p></div></section>{message && <div role="status" className="rounded-2xl bg-[#fff4c4] px-5 py-4 text-sm font-semibold text-[#746019]">{message}</div>}<div className="flex flex-wrap items-center gap-3"><label className="text-xs font-bold uppercase tracking-wide text-[#6b6f7e]">Academic year<select className="ml-3 rounded-xl border border-[#e0e2e8] bg-white px-4 py-2 text-sm" value={yearId} onChange={(event) => { setYearId(event.target.value); load(event.target.value) }}>{years.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</select></label></div>{admin && <form onSubmit={save} className="miro-surface grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-4"><select required className="rounded-xl border border-[#e0e2e8] bg-white px-3 py-3 text-sm" value={form.classId} onChange={(event) => setForm({ ...form, classId: event.target.value })}><option value="">Class</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select required className="rounded-xl border border-[#e0e2e8] bg-white px-3 py-3 text-sm" value={form.teacherId} onChange={(event) => setForm({ ...form, teacherId: event.target.value })}><option value="">Teacher</option>{teachers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select required className="rounded-xl border border-[#e0e2e8] bg-white px-3 py-3 text-sm" value={form.subjectId} onChange={(event) => setForm({ ...form, subjectId: event.target.value })}><option value="">Subject</option>{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select required className="rounded-xl border border-[#e0e2e8] bg-white px-3 py-3 text-sm" value={form.day} onChange={(event) => setForm({ ...form, day: event.target.value })}>{DAYS.map((day) => <option key={day} value={day}>{day}</option>)}</select><input required type="time" className="rounded-xl border border-[#e0e2e8] px-3 py-3 text-sm" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} /><input required type="time" className="rounded-xl border border-[#e0e2e8] px-3 py-3 text-sm" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} /><select className="rounded-xl border border-[#e0e2e8] bg-white px-3 py-3 text-sm" value={form.periodId} onChange={(event) => setForm({ ...form, periodId: event.target.value })}><option value="">Term (optional)</option>{filteredPeriods.map((period) => <option key={period.id} value={period.id}>{period.name}</option>)}</select><input className="rounded-xl border border-[#e0e2e8] px-3 py-3 text-sm" placeholder="Room (optional)" value={form.room} onChange={(event) => setForm({ ...form, room: event.target.value })} /><button className="miro-pill bg-[#1c1c1e] px-5 py-3 text-sm font-medium text-white sm:col-span-2 lg:col-span-4">Add timetable entry +</button></form>}<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{grouped.map(({ day, items }) => <div key={day} className="miro-surface min-h-44 overflow-hidden"><div className="border-b border-[#eef0f3] bg-[#fafbfc] px-5 py-4"><p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#187574]">{day}</p></div>{items.length === 0 ? <p className="p-5 text-sm text-[#8e91a0]">No classes scheduled.</p> : <div className="divide-y divide-[#eef0f3]">{items.map((entry) => <div key={entry.id} className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-xs font-bold text-[#187574]">{entry.startTime}–{entry.endTime}</p><h3 className="mt-1 text-sm font-semibold">{entry.subject.name}</h3><p className="mt-1 text-xs text-[#6b6f7e]">{entry.class.name} · {admin ? entry.teacher.name : entry.room || "Room not set"}</p></div>{admin && <button type="button" onClick={() => remove(entry.id)} className="text-xs font-semibold text-[#a33c68]">Remove</button>}</div>{entry.room && admin && <p className="mt-2 text-[11px] text-[#8e91a0]">Room {entry.room}</p>}</div>)}</div>}</div>)}</section></div>
}
