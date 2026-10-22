"use client"

import { useState, useMemo } from "react"
import Link from "next/link"

type TimetableDay = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY"

type TimetableLesson = {
  id: string
  day: TimetableDay
  startTime: string
  endTime: string
  room: string | null
  notes: string | null
  class: { id: string; name: string; grade: string }
  subject: { id: string; name: string; code: string }
  teacher: { id: string; name: string; email: string }
  sessions: Array<{ id: string; state: string; lastSavedAt: Date | string }>
  focuses: Array<{ id: string; learningOutcomeId: string | null; competencyId: string | null; note: string | null }>
}

type TeacherOption = {
  id: string
  name: string
  email: string
}

const DAYS: Array<{ id: TimetableDay | "ALL"; label: string }> = [
  { id: "ALL", label: "All Days" },
  { id: "MONDAY", label: "Monday" },
  { id: "TUESDAY", label: "Tuesday" },
  { id: "WEDNESDAY", label: "Wednesday" },
  { id: "THURSDAY", label: "Thursday" },
  { id: "FRIDAY", label: "Friday" },
  { id: "SATURDAY", label: "Saturday" },
]

function getInitialDay(): TimetableDay | "ALL" {
  const dayIndex = new Date().getDay()
  const map: Record<number, TimetableDay> = {
    1: "MONDAY",
    2: "TUESDAY",
    3: "WEDNESDAY",
    4: "THURSDAY",
    5: "FRIDAY",
    6: "SATURDAY",
  }
  return map[dayIndex] || "ALL"
}

export default function TeacherLessonsScheduleClient({
  lessons,
  teachers = [],
  isSchoolAdmin = false,
}: {
  lessons: TimetableLesson[]
  teachers?: TeacherOption[]
  isSchoolAdmin?: boolean
}) {
  const [selectedDay, setSelectedDay] = useState<TimetableDay | "ALL">(getInitialDay())
  const [search, setSearch] = useState("")
  const [selectedTeacher, setSelectedTeacher] = useState<string>("ALL")

  const filteredLessons = useMemo(() => {
    return lessons
      .filter((l) => {
        if (selectedDay !== "ALL" && l.day !== selectedDay) return false
        if (selectedTeacher !== "ALL" && l.teacher.id !== selectedTeacher) return false
        if (search) {
          const q = search.toLowerCase()
          return (
            l.subject.name.toLowerCase().includes(q) ||
            l.subject.code.toLowerCase().includes(q) ||
            l.class.name.toLowerCase().includes(q) ||
            (l.room || "").toLowerCase().includes(q)
          )
        }
        return true
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }, [lessons, selectedDay, selectedTeacher, search])

  // Count lessons scheduled for today
  const todayEnum = getInitialDay()
  const todayCount = lessons.filter((l) => l.day === todayEnum).length

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header */}
      <section className="flex flex-col justify-between gap-6 border-b border-[#e0e2e8] pb-8 sm:flex-row sm:items-end">
        <div>
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[.2em] text-[#4262ff]">
            CBC Curriculum & Timetable
          </p>
          <h1 className="text-4xl font-medium tracking-[-.055em] text-[#1c1c1e] sm:text-5xl">
            Lesson Workspace
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b6f7e]">
            Access scheduled timetable slots to prepare lesson notes, tag KICD learning outcomes, and record in-lesson learner evidence.
          </p>
        </div>

        <Link
          href="/dashboard/timetable"
          className="miro-pill inline-flex items-center justify-center border border-[#e0e2e8] bg-white px-5 py-2.5 text-xs font-semibold text-[#1c1c1e] hover:bg-[#f7f8fa]"
        >
          View Full School Timetable ↗
        </Link>
      </section>

      {/* Metrics Row */}
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[20px] bg-[#e7edff] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#4262ff]">Today&apos;s Lessons</p>
          <p className="mt-3 font-mono text-4xl font-medium text-[#4262ff]">
            {todayEnum !== "ALL" ? todayCount : lessons.length}
          </p>
          <p className="mt-1 text-xs text-[#555a6a]">Scheduled for {todayEnum}</p>
        </div>

        <div className="rounded-[20px] bg-[#fff4c4] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#746019]">Total Week Slots</p>
          <p className="mt-3 font-mono text-4xl font-medium text-[#1c1c1e]">{lessons.length}</p>
          <p className="mt-1 text-xs text-[#746019]">Across weekly timetable</p>
        </div>

        <div className="rounded-[20px] bg-[#c3faf5] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#187574]">Curriculum Status</p>
          <p className="mt-3 text-2xl font-bold text-[#187574]">KICD CBC Aligned</p>
          <p className="mt-1 text-xs text-[#555a6a]">Competencies & rubrics active</p>
        </div>
      </section>

      {/* Day Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {DAYS.map((d) => (
          <button
            key={d.id}
            onClick={() => setSelectedDay(d.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${
              selectedDay === d.id
                ? "bg-[#1c1c1e] text-white shadow-sm"
                : "bg-white text-[#6b6f7e] border border-[#e0e2e8] hover:bg-[#f7f8fa]"
            }`}
          >
            {d.label} {d.id !== "ALL" && `(${lessons.filter((l) => l.day === d.id).length})`}
          </button>
        ))}
      </div>

      {/* Search and Filters */}
      <section className="miro-surface overflow-hidden">
        <div className="border-b border-[#eef0f3] p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by subject, code, class, or room…"
              className="w-full max-w-sm rounded-xl border border-[#e0e2e8] bg-white px-3.5 py-2 text-xs outline-none focus:border-[#4262ff]"
            />

            {isSchoolAdmin && teachers.length > 0 && (
              <select
                value={selectedTeacher}
                onChange={(e) => setSelectedTeacher(e.target.value)}
                className="rounded-xl border border-[#e0e2e8] bg-white px-3.5 py-2 text-xs font-semibold text-[#1c1c1e] outline-none"
              >
                <option value="ALL">All Teachers</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Lesson Slots Grid */}
        {filteredLessons.length === 0 ? (
          <div className="p-12 text-center">
            <span className="text-3xl">🗓️</span>
            <h3 className="mt-3 text-base font-bold text-[#1c1c1e]">No lessons scheduled</h3>
            <p className="mt-1 text-xs text-[#8e91a0]">
              {selectedDay !== "ALL"
                ? `No lessons scheduled on ${selectedDay}. Check another day or review your timetable.`
                : "No timetable entries found for your account."}
            </p>
            <Link
              href="/dashboard/timetable"
              className="miro-pill inline-block mt-4 bg-[#1c1c1e] px-4 py-2 text-xs font-semibold text-white"
            >
              Configure Timetable →
            </Link>
          </div>
        ) : (
          <div className="grid gap-3.5 p-5 sm:grid-cols-2 lg:grid-cols-3 sm:p-6">
            {filteredLessons.map((l) => {
              const latestSession = l.sessions[0]
              const sessionState = latestSession?.state || "OPEN"
              const outcomeCount = l.focuses.filter((f) => f.learningOutcomeId).length

              return (
                <div
                  key={l.id}
                  className="miro-surface flex flex-col justify-between p-5 transition hover:border-[#1c1c1e] hover:-translate-y-0.5"
                >
                  <div>
                    {/* Time & Room Header */}
                    <div className="flex items-center justify-between border-b border-[#f0f2f5] pb-3">
                      <span className="font-mono text-xs font-bold text-[#187574] bg-[#e5f7f3] px-2.5 py-0.5 rounded-md">
                        ⏰ {l.startTime} – {l.endTime}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {l.room ? `Room ${l.room}` : l.day}
                      </span>
                    </div>

                    {/* Subject & Class */}
                    <div className="mt-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-[#4262ff] bg-[#e7edff] px-2 py-0.5 rounded">
                          {l.subject.code}
                        </span>
                        <h3 className="text-base font-bold text-[#1c1c1e] truncate">{l.subject.name}</h3>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-slate-600">
                        {l.class.name} · Grade {l.class.grade}
                      </p>
                      {isSchoolAdmin && (
                        <p className="mt-0.5 text-[11px] text-[#8e91a0]">Teacher: {l.teacher.name}</p>
                      )}
                    </div>

                    {/* CBC Outcomes & State Badges */}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          sessionState === "SUBMITTED"
                            ? "bg-[#c3faf5] text-[#187574]"
                            : sessionState === "IN_PROGRESS"
                            ? "bg-[#fff4c4] text-[#746019]"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {sessionState}
                      </span>
                      {outcomeCount > 0 ? (
                        <span className="text-[10px] font-semibold text-[#4262ff] bg-[#f0f4ff] px-2 py-0.5 rounded">
                          ✓ {outcomeCount} Outcome{outcomeCount === 1 ? "" : "s"} Tagged
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#8e91a0]">No outcomes tagged yet</span>
                      )}
                    </div>
                  </div>

                  {/* Open Workspace Action */}
                  <div className="mt-5 border-t border-[#f0f2f5] pt-3">
                    <Link
                      href={`/dashboard/teacher/lesson/${l.id}`}
                      className="miro-pill w-full inline-flex items-center justify-center bg-[#1c1c1e] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#2c2c34]"
                    >
                      Open Lesson Workspace →
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
