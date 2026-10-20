"use client"

import { useState, useMemo } from "react"
import Link from "next/link"

type StudentRecord = {
  id: string
  name: string
  admissionNo: string
  class: { id: string; name: string; grade: string } | null
  school: { name: string } | null
  _count: { assessments: number }
}

export default function StudentsDirectoryClient({
  students,
  isSuperAdmin = false,
}: {
  students: StudentRecord[]
  isSuperAdmin?: boolean
}) {
  const [search, setSearch] = useState("")
  const [selectedClass, setSelectedClass] = useState("ALL")
  const [recordFilter, setRecordFilter] = useState<"ALL" | "WITH_RECORDS" | "NO_RECORDS">("ALL")

  // Extract unique classes for filter dropdown
  const classOptions = useMemo(() => {
    const map = new Map<string, string>()
    students.forEach((s) => {
      if (s.class) {
        map.set(s.class.id, `${s.class.name} (Grade ${s.class.grade})`)
      }
    })
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }))
  }, [students])

  // Filter students
  const filtered = useMemo(() => {
    return students.filter((s) => {
      const query = search.toLowerCase()
      const matchesSearch =
        s.name.toLowerCase().includes(query) ||
        s.admissionNo.toLowerCase().includes(query) ||
        (s.class?.name || "").toLowerCase().includes(query)

      if (!matchesSearch) return false

      if (selectedClass !== "ALL" && s.class?.id !== selectedClass) return false

      if (recordFilter === "WITH_RECORDS" && s._count.assessments === 0) return false
      if (recordFilter === "NO_RECORDS" && s._count.assessments > 0) return false

      return true
    })
  }, [students, search, selectedClass, recordFilter])

  return (
    <div className="overflow-hidden miro-surface">
      {/* Header & Controls */}
      <div className="border-b border-slate-100 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-950">Student directory</h2>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Showing {filtered.length} of {students.length} learner{students.length === 1 ? "" : "s"}
            </p>
          </div>
          <span className="miro-pill w-fit bg-[#c3faf5] px-3 py-1.5 text-xs font-semibold text-[#187574]">
            Live Roster
          </span>
        </div>

        {/* Filter Bar */}
        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          {/* Search Input */}
          <div className="relative">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by learner name, admission no, or class…"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs outline-none focus:border-[#4262ff] focus:ring-2 focus:ring-[#4262ff]/10"
            />
          </div>

          {/* Class Filter */}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#4262ff]"
          >
            <option value="ALL">All Classes & Streams</option>
            {classOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>

          {/* Assessment Record Filter */}
          <select
            value={recordFilter}
            onChange={(e) => setRecordFilter(e.target.value as "ALL" | "WITH_RECORDS" | "NO_RECORDS")}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#4262ff]"
          >
            <option value="ALL">All assessment statuses</option>
            <option value="WITH_RECORDS">With assessment records</option>
            <option value="NO_RECORDS">No records yet</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto" tabIndex={0} aria-label="Students table">
        <table className="min-w-[680px] w-full divide-y divide-slate-100">
          <thead className="bg-[#f7f8fa]">
            <tr>
              {["Admission no.", "Student", "Class", "Assessments", ""].map((heading) => (
                <th
                  key={heading}
                  className="px-6 py-3.5 text-left text-[11px] font-bold uppercase tracking-[.12em] text-slate-400"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((student) => (
              <tr key={student.id} className="group transition hover:bg-blue-50/30">
                <td className="px-6 py-4 font-mono text-xs font-bold text-slate-600">
                  {student.admissionNo}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e7edff] text-xs font-black text-[#4262ff]">
                      {student.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="text-sm font-bold text-slate-900">{student.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs font-semibold text-slate-600">
                  {student.class ? (
                    <span className="miro-pill bg-slate-100 px-2.5 py-1 text-slate-700">
                      {student.class.name}
                    </span>
                  ) : (
                    <span className="text-slate-400">Unassigned</span>
                  )}
                </td>
                {isSuperAdmin && (
                  <td className="px-6 py-4 text-xs text-slate-500">{student.school?.name}</td>
                )}
                <td className="px-6 py-4">
                  <span
                    className={`miro-pill px-2.5 py-1 text-xs font-medium ${
                      student._count.assessments > 0
                        ? "bg-[#c3faf5] text-[#187574]"
                        : "bg-[#fff4c4] text-[#746019]"
                    }`}
                  >
                    {student._count.assessments}{" "}
                    {student._count.assessments === 1 ? "record" : "records"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <Link
                    href={`/dashboard/students/${student.id}`}
                    className="text-xs font-bold text-[#4262ff] transition hover:text-[#2a45db]"
                  >
                    View profile <span className="ml-0.5">→</span>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl text-slate-500">
              🔍
            </div>
            <h3 className="font-bold text-slate-900">No matching learners found</h3>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Try adjusting your search terms or class filter.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
