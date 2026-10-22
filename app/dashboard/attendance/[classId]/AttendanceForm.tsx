"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"

interface Student {
  id: string
  name: string
  admissionNo: string
}

interface ClassData {
  id: string
  name: string
  students: Student[]
}

interface ExistingAttendance {
  id: string
  studentId: string
  status: string
  remarks: string | null
}

interface Props {
  classData: ClassData
  existingAttendance: ExistingAttendance[]
  userId: string
}

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"

const CANNED_REASONS = [
  "Sick / Medical",
  "Fee Balance",
  "Family Emergency",
  "Transport Delay",
  "Unexcused",
]

export default function AttendanceForm({ classData, existingAttendance, userId }: Props) {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [loading, setLoading] = useState(false)
  const [fetchingDate, setFetchingDate] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [attendance, setAttendance] = useState<Record<string, { status: AttendanceStatus; remarks: string }>>(() => {
    const initial: Record<string, { status: AttendanceStatus; remarks: string }> = {}
    existingAttendance.forEach((att) => {
      initial[att.studentId] = {
        status: att.status as AttendanceStatus,
        remarks: att.remarks || "",
      }
    })
    classData.students.forEach((student) => {
      if (!initial[student.id]) {
        initial[student.id] = { status: "PRESENT", remarks: "" }
      }
    })
    return initial
  })

  // When date changes, reload attendance for that specific date
  const handleDateChange = async (newDate: string) => {
    setSelectedDate(newDate)
    setFetchingDate(true)
    setError("")
    setSuccess("")
    try {
      const res = await fetch(`/api/attendance?classId=${classData.id}&startDate=${newDate}&endDate=${newDate}`)
      const data = await res.json()
      if (res.ok && Array.isArray(data)) {
        const updated: Record<string, { status: AttendanceStatus; remarks: string }> = {}
        data.forEach((att: any) => {
          updated[att.studentId] = {
            status: att.status as AttendanceStatus,
            remarks: att.remarks || "",
          }
        })
        classData.students.forEach((student) => {
          if (!updated[student.id]) {
            updated[student.id] = { status: "PRESENT", remarks: "" }
          }
        })
        setAttendance(updated)
      }
    } catch {
      // Keep existing state on error
    } finally {
      setFetchingDate(false)
    }
  }

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], status },
    }))
  }

  const handleRemarksChange = (studentId: string, remarks: string) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], remarks },
    }))
  }

  const markAll = (status: AttendanceStatus) => {
    const updated: Record<string, { status: AttendanceStatus; remarks: string }> = {}
    classData.students.forEach((student) => {
      updated[student.id] = {
        status,
        remarks: attendance[student.id]?.remarks || "",
      }
    })
    setAttendance(updated)
  }

  const summary = useMemo(() => {
    const present = Object.values(attendance).filter((a) => a.status === "PRESENT").length
    const absent = Object.values(attendance).filter((a) => a.status === "ABSENT").length
    const late = Object.values(attendance).filter((a) => a.status === "LATE").length
    const excused = Object.values(attendance).filter((a) => a.status === "EXCUSED").length
    const total = classData.students.length
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0

    return { present, absent, late, excused, rate }
  }, [attendance, classData.students.length])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const records = Object.entries(attendance).map(([studentId, data]) => ({
        studentId,
        status: data.status,
        remarks: data.remarks || null,
        date: selectedDate,
      }))

      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: classData.id,
          records,
          createdBy: userId,
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || "Failed to save attendance")
      }

      setSuccess(`✓ Attendance saved for ${records.length} learner(s)!`)
      setTimeout(() => {
        router.refresh()
      }, 1500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error saving attendance")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Date & Quick Action Controls */}
      <div className="miro-surface p-6 sm:p-7 space-y-5">
        <div className="flex flex-wrap gap-4 items-end justify-between">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#6b6f7e] mb-1.5">
              Attendance Register Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full max-w-xs px-4 py-2.5 border border-[#e0e2e8] rounded-xl text-xs font-semibold outline-none focus:border-[#4262ff]"
            />
            {fetchingDate && (
              <span className="block mt-1 text-[11px] text-[#8e91a0]">Loading date records…</span>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => markAll("PRESENT")}
              className="miro-pill bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 text-xs font-semibold transition"
            >
              ✓ Mark All Present
            </button>
            <button
              type="button"
              onClick={() => markAll("ABSENT")}
              className="miro-pill border border-red-200 text-red-700 hover:bg-red-50 px-4 py-2 text-xs font-semibold transition"
            >
              ✕ Mark All Absent
            </button>
          </div>
        </div>

        {/* Live Presence Rate and Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4 border-t border-[#eef0f3]">
          <div className="bg-[#f0f9f6] rounded-xl p-3.5 border border-[#b7e1d9]">
            <span className="text-[10px] uppercase font-bold text-[#187574]">Presence Rate</span>
            <div className="text-2xl font-bold font-mono text-[#187574]">{summary.rate}%</div>
          </div>
          <div className="bg-[#f7f8fa] rounded-xl p-3.5">
            <span className="text-[10px] uppercase font-bold text-[#8e91a0]">Present</span>
            <div className="text-2xl font-bold font-mono text-[#1c1c1e]">{summary.present}</div>
          </div>
          <div className="bg-[#fff4f4] rounded-xl p-3.5 border border-red-100">
            <span className="text-[10px] uppercase font-bold text-red-600">Absent</span>
            <div className="text-2xl font-bold font-mono text-red-700">{summary.absent}</div>
          </div>
          <div className="bg-[#fffbeb] rounded-xl p-3.5">
            <span className="text-[10px] uppercase font-bold text-amber-700">Late</span>
            <div className="text-2xl font-bold font-mono text-amber-800">{summary.late}</div>
          </div>
          <div className="bg-[#eff6ff] rounded-xl p-3.5 col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-bold text-blue-700">Excused</span>
            <div className="text-2xl font-bold font-mono text-blue-800">{summary.excused}</div>
          </div>
        </div>
      </div>

      {/* Student Roll-Call List */}
      <div className="miro-surface overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-[#eef0f3] flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#1c1c1e]">
            Learner Roll-Call Sheet ({classData.students.length} Learners)
          </h3>
          <span className="miro-pill bg-slate-100 px-3 py-1 text-xs font-semibold text-[#555a6a]">
            {classData.name}
          </span>
        </div>

        <div className="divide-y divide-[#eef0f3]">
          {classData.students.map((student) => {
            const currentStatus = attendance[student.id]?.status || "PRESENT"
            const currentRemarks = attendance[student.id]?.remarks || ""

            return (
              <div key={student.id} className="p-4 sm:p-5 hover:bg-[#fafbfc] transition">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        currentStatus === "PRESENT"
                          ? "bg-emerald-100 text-emerald-800"
                          : currentStatus === "ABSENT"
                          ? "bg-red-100 text-red-800"
                          : currentStatus === "LATE"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {student.name.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <div className="text-sm font-bold text-[#1c1c1e]">{student.name}</div>
                      <div className="text-xs font-mono text-[#8e91a0]">Adm: {student.admissionNo}</div>
                    </div>
                  </div>

                  {/* 4 Attendance Status Buttons */}
                  <div className="flex gap-1.5 flex-wrap">
                    {(["PRESENT", "ABSENT", "LATE", "EXCUSED"] as AttendanceStatus[]).map((status) => {
                      const isActive = currentStatus === status
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => handleStatusChange(student.id, status)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                            isActive
                              ? status === "PRESENT"
                                ? "bg-emerald-700 text-white border-emerald-700"
                                : status === "ABSENT"
                                ? "bg-red-600 text-white border-red-600"
                                : status === "LATE"
                                ? "bg-amber-500 text-white border-amber-500"
                                : "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-[#6b6f7e] border-[#e0e2e8] hover:bg-[#f7f8fa]"
                          }`}
                        >
                          {status}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Absence Remarks & Quick Canned Chips */}
                {currentStatus !== "PRESENT" && (
                  <div className="mt-3.5 rounded-xl border border-[#e0e2e8] bg-[#fafbfc] p-3 space-y-2 animate-fade-in">
                    <div className="flex items-center justify-between text-[11px] text-[#6b6f7e]">
                      <span className="font-semibold">Quick Absence Reason:</span>
                      <div className="flex gap-1.5 flex-wrap">
                        {CANNED_REASONS.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => handleRemarksChange(student.id, preset)}
                            className="rounded-md border border-[#dfe2e8] bg-white px-2 py-0.5 text-[10px] font-medium text-[#4f5664] hover:bg-slate-50"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="text"
                      value={currentRemarks}
                      onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                      placeholder="Add detailed note or parent contact reason…"
                      className="w-full px-3 py-1.5 border border-[#dfe2e8] bg-white rounded-lg text-xs outline-none focus:border-[#4262ff]"
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 text-red-700 p-4 rounded-xl text-xs font-semibold border border-red-200">
          {error}
        </div>
      )}

      {success && (
        <div role="status" className="bg-[#c3faf5] text-[#187574] p-4 rounded-xl text-xs font-semibold border border-[#9fdcd4]">
          {success}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="miro-pill w-full bg-[#1c1c1e] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#2c2c34] disabled:opacity-50"
      >
        {loading ? "Saving Register…" : `Save Attendance Register for ${selectedDate} →`}
      </button>
    </form>
  )
}
