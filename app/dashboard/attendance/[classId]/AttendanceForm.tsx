"use client"

import { useState } from "react"
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

export default function AttendanceForm({ classData, existingAttendance, userId }: Props) {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [attendance, setAttendance] = useState<Record<string, { status: AttendanceStatus; remarks: string }>>(() => {
    const initial: Record<string, { status: AttendanceStatus; remarks: string }> = {}
    existingAttendance.forEach(att => {
      initial[att.studentId] = {
        status: att.status as AttendanceStatus,
        remarks: att.remarks || ""
      }
    })
    // Default all students to PRESENT if not already marked
    classData.students.forEach(student => {
      if (!initial[student.id]) {
        initial[student.id] = { status: "PRESENT", remarks: "" }
      }
    })
    return initial
  })

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], status }
    }))
  }

  const handleRemarksChange = (studentId: string, remarks: string) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], remarks }
    }))
  }

  const markAll = (status: AttendanceStatus) => {
    const updated: Record<string, { status: AttendanceStatus; remarks: string }> = {}
    classData.students.forEach(student => {
      updated[student.id] = { 
        status, 
        remarks: attendance[student.id]?.remarks || "" 
      }
    })
    setAttendance(updated)
  }

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
        date: selectedDate
      }))

      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: classData.id,
          records,
          createdBy: userId
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to save attendance")
      }

      setSuccess(`✓ Attendance saved for ${records.length} student(s)!`)
      
      setTimeout(() => {
        router.refresh()
      }, 1500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const statusColors = {
    PRESENT: "bg-green-100 text-green-800 border-green-300",
    ABSENT: "bg-red-100 text-red-800 border-red-300",
    LATE: "bg-yellow-100 text-yellow-800 border-yellow-300",
    EXCUSED: "bg-blue-100 text-blue-800 border-blue-300"
  }

  const summary = {
    present: Object.values(attendance).filter(a => a.status === "PRESENT").length,
    absent: Object.values(attendance).filter(a => a.status === "ABSENT").length,
    late: Object.values(attendance).filter(a => a.status === "LATE").length,
    excused: Object.values(attendance).filter(a => a.status === "EXCUSED").length
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Date and Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Attendance Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => markAll("PRESENT")}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition"
            >
              Mark All Present
            </button>
            <button
              type="button"
              onClick={() => markAll("ABSENT")}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition"
            >
              Mark All Absent
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t">
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-xs text-green-600 font-medium">Present</div>
            <div className="text-2xl font-bold text-green-900">{summary.present}</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <div className="text-xs text-red-600 font-medium">Absent</div>
            <div className="text-2xl font-bold text-red-900">{summary.absent}</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3">
            <div className="text-xs text-yellow-600 font-medium">Late</div>
            <div className="text-2xl font-bold text-yellow-900">{summary.late}</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-xs text-blue-600 font-medium">Excused</div>
            <div className="text-2xl font-bold text-blue-900">{summary.excused}</div>
          </div>
        </div>
      </div>

      {/* Student List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Students ({classData.students.length})
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {classData.students.map((student) => (
            <div key={student.id} className="p-4 hover:bg-gray-50">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{student.name}</div>
                  <div className="text-sm text-gray-500">Adm: {student.admissionNo}</div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {(["PRESENT", "ABSENT", "LATE", "EXCUSED"] as AttendanceStatus[]).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => handleStatusChange(student.id, status)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition border-2 ${
                        attendance[student.id]?.status === status
                          ? statusColors[status]
                          : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Remarks */}
              {(attendance[student.id]?.status === "ABSENT" || 
                attendance[student.id]?.status === "LATE" || 
                attendance[student.id]?.status === "EXCUSED") && (
                <div className="mt-3">
                  <input
                    type="text"
                    value={attendance[student.id]?.remarks || ""}
                    onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                    placeholder="Add remarks (optional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-600 p-4 rounded-lg">
          {success}
        </div>
      )}

      {/* Submit Button */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Attendance"}
        </button>
      </div>
    </form>
  )
}
