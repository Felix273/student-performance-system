"use client"

import { useState, useMemo } from "react"
import Link from "next/link"

type StudentAttendanceRecord = {
  id: string
  studentId: string
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"
  remarks: string | null
  student: {
    id: string
    name: string
    admissionNo: string
    class: { id: string; name: string; grade: string }
  }
}

type ClassOverview = {
  id: string
  name: string
  grade: string
  _count: { students: number }
}

export default function AttendanceOverviewClient({
  classes,
  todayRecords,
  todayFormatted,
}: {
  classes: ClassOverview[]
  todayRecords: StudentAttendanceRecord[]
  todayFormatted: string
}) {
  const [activeTab, setActiveTab] = useState<"classes" | "absentees">("classes")
  const [searchAbsent, setSearchAbsent] = useState("")

  const totalStudents = useMemo(
    () => classes.reduce((sum, cls) => sum + cls._count.students, 0),
    [classes]
  )

  // Class completion map
  const classStatusMap = useMemo(() => {
    const map = new Map<
      string,
      { present: number; absent: number; late: number; excused: number; total: number; completed: boolean }
    >()

    classes.forEach((c) => {
      const recordsForClass = todayRecords.filter((r) => r.student.class?.id === c.id)
      const present = recordsForClass.filter((r) => r.status === "PRESENT").length
      const absent = recordsForClass.filter((r) => r.status === "ABSENT").length
      const late = recordsForClass.filter((r) => r.status === "LATE").length
      const excused = recordsForClass.filter((r) => r.status === "EXCUSED").length
      const total = recordsForClass.length
      const completed = total > 0

      map.set(c.id, { present, absent, late, excused, total, completed })
    })

    return map
  }, [classes, todayRecords])

  // Overall statistics
  const summary = useMemo(() => {
    const present = todayRecords.filter((r) => r.status === "PRESENT").length
    const absent = todayRecords.filter((r) => r.status === "ABSENT").length
    const late = todayRecords.filter((r) => r.status === "LATE").length
    const excused = todayRecords.filter((r) => r.status === "EXCUSED").length
    const markedTotal = todayRecords.length

    const rate = markedTotal > 0 ? Math.round(((present + late) / markedTotal) * 100) : 0
    const classesCompleted = Array.from(classStatusMap.values()).filter((v) => v.completed).length

    return { present, absent, late, excused, markedTotal, rate, classesCompleted }
  }, [todayRecords, classStatusMap])

  // List of all absentees today
  const absentees = useMemo(() => {
    return todayRecords
      .filter((r) => r.status === "ABSENT" || r.status === "EXCUSED")
      .filter((r) => {
        const q = searchAbsent.toLowerCase()
        return (
          r.student.name.toLowerCase().includes(q) ||
          r.student.admissionNo.toLowerCase().includes(q) ||
          r.student.class.name.toLowerCase().includes(q) ||
          (r.remarks || "").toLowerCase().includes(q)
        )
      })
  }, [todayRecords, searchAbsent])

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header */}
      <section className="flex flex-col justify-between gap-6 border-b border-[#e0e2e8] pb-8 sm:flex-row sm:items-end">
        <div>
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[.2em] text-[#187574]">
            Daily Rhythm & Accountability
          </p>
          <h1 className="text-4xl font-medium tracking-[-.055em] text-[#1c1c1e] sm:text-5xl">
            Attendance Dashboard
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b6f7e]">
            Live tracking of student presence, stream roll-calls, and absence follow-up across your school.
          </p>
        </div>

        <div className="rounded-[16px] bg-[#c3faf5] px-5 py-3.5 text-right border border-[#9fdcd4]">
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#187574]">Today&apos;s Date</p>
          <p className="mt-0.5 text-sm font-bold text-[#1c1c1e]">{todayFormatted}</p>
        </div>
      </section>

      {/* Real-time Metric Cards */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="miro-surface p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#8e91a0]">Attendance Rate</p>
          <p className="mt-3 font-mono text-3xl font-bold text-[#187574]">
            {summary.markedTotal > 0 ? `${summary.rate}%` : "—"}
          </p>
          <p className="mt-1 text-xs text-[#8e91a0]">
            {summary.markedTotal} of {totalStudents} marked
          </p>
        </div>

        <div className="miro-surface p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#187574]">Present Today</p>
          <p className="mt-3 font-mono text-3xl font-bold text-[#187574]">{summary.present}</p>
          <p className="mt-1 text-xs text-[#8e91a0]">In school</p>
        </div>

        <div className={`miro-surface p-5 ${summary.absent > 0 ? "border-red-200 bg-[#fff8f8]" : ""}`}>
          <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-red-600">Absent Today</p>
          <p className={`mt-3 font-mono text-3xl font-bold ${summary.absent > 0 ? "text-red-700" : "text-[#1c1c1e]"}`}>
            {summary.absent}
          </p>
          <p className="mt-1 text-xs text-[#8e91a0]">Unexcused absence</p>
        </div>

        <div className="miro-surface p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#8e91a0]">Late / Excused</p>
          <p className="mt-3 font-mono text-3xl font-bold text-amber-700">{summary.late + summary.excused}</p>
          <p className="mt-1 text-xs text-[#8e91a0]">{summary.late} late · {summary.excused} excused</p>
        </div>

        <div className="miro-surface p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#4262ff]">Roll-Call Progress</p>
          <p className="mt-3 font-mono text-3xl font-bold text-[#4262ff]">
            {summary.classesCompleted}/{classes.length}
          </p>
          <p className="mt-1 text-xs text-[#8e91a0]">Streams submitted</p>
        </div>
      </section>

      {/* Tabs: Classes Roll-Call vs Absence Tracker */}
      <div className="flex border-b border-[#e0e2e8] text-sm font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab("classes")}
          className={`border-b-2 px-5 py-3 transition ${
            activeTab === "classes"
              ? "border-[#1c1c1e] text-[#1c1c1e]"
              : "border-transparent text-[#6b6f7e] hover:text-[#1c1c1e]"
          }`}
        >
          Classes & Roll-Call Status ({classes.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("absentees")}
          className={`border-b-2 px-5 py-3 transition flex items-center gap-2 ${
            activeTab === "absentees"
              ? "border-red-600 text-red-700"
              : "border-transparent text-[#6b6f7e] hover:text-[#1c1c1e]"
          }`}
        >
          <span>Daily Absence Tracker</span>
          {summary.absent > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
              {summary.absent}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Class Roll-Call Cards with Live Status */}
      {activeTab === "classes" && (
        <section className="miro-surface overflow-hidden">
          <div className="border-b border-[#eef0f3] p-5 sm:p-7">
            <h2 className="text-xl font-medium tracking-tight text-[#1c1c1e]">Today&apos;s Class Registers</h2>
            <p className="mt-1 text-xs text-[#6b6f7e]">
              Click on any class to take morning roll-call or review attendance marks.
            </p>
          </div>

          <div className="grid gap-3.5 p-5 sm:grid-cols-2 sm:p-7 lg:grid-cols-3">
            {classes.map((cls) => {
              const status = classStatusMap.get(cls.id)
              const completed = status?.completed
              const rate = status && status.total > 0 ? Math.round(((status.present + status.late) / status.total) * 100) : 0

              return (
                <Link
                  key={cls.id}
                  href={`/dashboard/attendance/${cls.id}`}
                  className="miro-surface group flex flex-col justify-between p-5 transition hover:border-[#1c1c1e] hover:-translate-y-0.5"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8e91a0]">
                        Grade {cls.grade}
                      </span>
                      {completed ? (
                        <span className="miro-pill bg-[#c3faf5] px-2.5 py-0.5 text-[10px] font-bold text-[#187574]">
                          ✓ Marked ({rate}%)
                        </span>
                      ) : (
                        <span className="miro-pill bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                          ⚠ Roll-Call Pending
                        </span>
                      )}
                    </div>
                    <h3 className="mt-3 text-xl font-bold text-[#1c1c1e]">{cls.name}</h3>
                  </div>

                  <div className="mt-5 border-t border-[#f0f2f5] pt-3">
                    <div className="flex items-center justify-between text-xs text-[#6b6f7e]">
                      <span>{cls._count.students} enrolled</span>
                      {completed && (
                        <span className="font-semibold text-slate-700">
                          {status.present} present · {status.absent} absent
                        </span>
                      )}
                    </div>
                    <span className="mt-2 block text-xs font-bold text-[#4262ff] transition group-hover:translate-x-1">
                      {completed ? "Update Register →" : "Take Attendance →"}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Tab 2: Absence Tracker with Search & Follow-Up */}
      {activeTab === "absentees" && (
        <section className="miro-surface overflow-hidden">
          <div className="border-b border-[#eef0f3] p-5 sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-medium tracking-tight text-[#1c1c1e]">
                  Learners Absent Today
                </h2>
                <p className="mt-1 text-xs text-[#6b6f7e]">
                  Follow up with parents and guardians on recorded absences.
                </p>
              </div>
              <input
                type="search"
                value={searchAbsent}
                onChange={(e) => setSearchAbsent(e.target.value)}
                placeholder="Search absent learner or class…"
                className="w-full max-w-xs rounded-xl border border-[#e0e2e8] bg-white px-3.5 py-2 text-xs outline-none focus:border-[#4262ff]"
              />
            </div>
          </div>

          {absentees.length === 0 ? (
            <div className="p-12 text-center text-sm text-[#8e91a0]">
              🎉 No absences recorded today! All marked learners are in school.
            </div>
          ) : (
            <div className="divide-y divide-[#eef0f3]">
              {absentees.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col justify-between gap-3 p-5 transition hover:bg-[#fafbfc] sm:flex-row sm:items-center sm:px-7"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-700">
                      {item.student.name.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-[#1c1c1e]">{item.student.name}</p>
                        <span
                          className={`miro-pill px-2 py-0.5 text-[10px] font-bold ${
                            item.status === "ABSENT" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <p className="text-xs text-[#8e91a0]">
                        {item.student.class.name} · Adm: {item.student.admissionNo}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="block text-[11px] font-medium text-slate-500">
                        Reason: {item.remarks || "No reason specified"}
                      </span>
                    </div>

                    <Link
                      href={`/dashboard/attendance/${item.student.class.id}`}
                      className="rounded-lg border border-[#e0e2e8] bg-white px-3 py-1.5 text-xs font-semibold text-[#1c1c1e] hover:bg-[#f7f8fa]"
                    >
                      Class Register →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
