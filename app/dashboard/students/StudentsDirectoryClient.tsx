"use client"

import { useState, useMemo, useEffect } from "react"
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
  const [viewMode, setViewMode] = useState<"table" | "grouped">("table")

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)

  // Reset pagination to page 1 on search or filter change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, selectedClass, recordFilter, pageSize])

  // Extract distinct classes and calculate learner counts per class
  const classCategories = useMemo(() => {
    const map = new Map<string, { id: string; name: string; grade: string; count: number }>()
    let unassignedCount = 0

    students.forEach((s) => {
      if (s.class) {
        const existing = map.get(s.class.id)
        if (existing) {
          existing.count++
        } else {
          map.set(s.class.id, {
            id: s.class.id,
            name: s.class.name,
            grade: s.class.grade,
            count: 1,
          })
        }
      } else {
        unassignedCount++
      }
    })

    const sortedClasses = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
    return {
      classes: sortedClasses,
      unassignedCount,
    }
  }, [students])

  // Filter students based on search and filters
  const filtered = useMemo(() => {
    return students.filter((s) => {
      const query = search.toLowerCase()
      const matchesSearch =
        s.name.toLowerCase().includes(query) ||
        s.admissionNo.toLowerCase().includes(query) ||
        (s.class?.name || "").toLowerCase().includes(query)

      if (!matchesSearch) return false

      if (selectedClass === "UNASSIGNED") {
        if (s.class !== null) return false
      } else if (selectedClass !== "ALL") {
        if (s.class?.id !== selectedClass) return false
      }

      if (recordFilter === "WITH_RECORDS" && s._count.assessments === 0) return false
      if (recordFilter === "NO_RECORDS" && s._count.assessments > 0) return false

      return true
    })
  }, [students, search, selectedClass, recordFilter])

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, filtered.length)
  const paginatedStudents = filtered.slice(startIndex, endIndex)

  // Grouped by Class for the Grouped View
  const groupedStudents = useMemo(() => {
    const groups = new Map<string, { className: string; grade: string; students: StudentRecord[] }>()

    filtered.forEach((s) => {
      const key = s.class ? s.class.id : "UNASSIGNED"
      const label = s.class ? s.class.name : "Unassigned Learners"
      const grade = s.class ? s.class.grade : ""

      if (!groups.has(key)) {
        groups.set(key, { className: label, grade, students: [] })
      }
      groups.get(key)!.students.push(s)
    })

    return Array.from(groups.values())
  }, [filtered])

  return (
    <div className="space-y-6">
      {/* 1. Class Categorization Tabs (Horizontal Scrollable) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedClass("ALL")}
          className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${
            selectedClass === "ALL"
              ? "bg-[#1c1c1e] text-white shadow-sm"
              : "bg-white text-[#6b6f7e] border border-[#e0e2e8] hover:bg-[#f7f8fa]"
          }`}
        >
          All Learners ({students.length})
        </button>

        {classCategories.classes.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedClass(c.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${
              selectedClass === c.id
                ? "bg-[#1c1c1e] text-white shadow-sm"
                : "bg-white text-[#6b6f7e] border border-[#e0e2e8] hover:bg-[#f7f8fa]"
            }`}
          >
            {c.name} ({c.count})
          </button>
        ))}

        {classCategories.unassignedCount > 0 && (
          <button
            onClick={() => setSelectedClass("UNASSIGNED")}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${
              selectedClass === "UNASSIGNED"
                ? "bg-red-700 text-white shadow-sm"
                : "bg-white text-red-600 border border-red-200 hover:bg-red-50"
            }`}
          >
            Unassigned ({classCategories.unassignedCount})
          </button>
        )}
      </div>

      {/* 2. Main Surface with Controls */}
      <div className="overflow-hidden miro-surface">
        {/* Header & Search */}
        <div className="border-b border-slate-100 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-950">Learner Roster</h2>
              <p className="mt-1 text-xs font-medium text-slate-500">
                {selectedClass === "ALL"
                  ? `Showing all classes · ${filtered.length} total matched`
                  : `Class view · ${filtered.length} learners in this selection`}
              </p>
            </div>

            {/* View Mode Toggle: Table vs Grouped */}
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-[#f7f8fa] p-1 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`rounded-lg px-3 py-1 font-semibold transition ${
                  viewMode === "table" ? "bg-white text-[#1c1c1e] shadow-sm" : "text-[#6b6f7e]"
                }`}
              >
                Paginated Table
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grouped")}
                className={`rounded-lg px-3 py-1 font-semibold transition ${
                  viewMode === "grouped" ? "bg-white text-[#1c1c1e] shadow-sm" : "text-[#6b6f7e]"
                }`}
              >
                Categorized by Class
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by learner name, admission no, or stream…"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs outline-none focus:border-[#4262ff] focus:ring-2 focus:ring-[#4262ff]/10"
            />

            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#4262ff]"
            >
              <option value="ALL">All Classes & Streams</option>
              {classCategories.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (Grade {c.grade})
                </option>
              ))}
              {classCategories.unassignedCount > 0 && (
                <option value="UNASSIGNED">Unassigned Learners</option>
              )}
            </select>

            <select
              value={recordFilter}
              onChange={(e) => setRecordFilter(e.target.value as "ALL" | "WITH_RECORDS" | "NO_RECORDS")}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#4262ff]"
            >
              <option value="ALL">All assessment statuses</option>
              <option value="WITH_RECORDS">With assessment marks</option>
              <option value="NO_RECORDS">Missing assessments</option>
            </select>
          </div>
        </div>

        {/* 3A. View Mode: Grouped by Class */}
        {viewMode === "grouped" ? (
          <div className="p-5 sm:p-6 space-y-6">
            {groupedStudents.length === 0 ? (
              <div className="py-12 text-center text-sm text-[#8e91a0]">
                No learners found matching this filter.
              </div>
            ) : (
              groupedStudents.map((group) => (
                <div
                  key={group.className}
                  className="rounded-2xl border border-[#e0e2e8] bg-white overflow-hidden shadow-sm"
                >
                  <div className="flex items-center justify-between border-b border-[#eef0f3] bg-[#fafbfc] px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#1c1c1e]">🏫 {group.className}</span>
                      {group.grade && (
                        <span className="miro-pill bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          Grade {group.grade}
                        </span>
                      )}
                    </div>
                    <span className="miro-pill bg-white border border-[#e0e2e8] px-2.5 py-0.5 text-xs font-semibold text-[#555a6a]">
                      {group.students.length} learner{group.students.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {group.students.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-4 px-5 transition hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e7edff] text-xs font-bold text-[#4262ff]">
                            {student.name.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{student.name}</p>
                            <p className="text-xs font-mono text-slate-500">
                              Adm: {student.admissionNo}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <span
                            className={`miro-pill px-2.5 py-0.5 text-[11px] font-medium ${
                              student._count.assessments > 0
                                ? "bg-[#c3faf5] text-[#187574]"
                                : "bg-[#fff4c4] text-[#746019]"
                            }`}
                          >
                            {student._count.assessments} assessments
                          </span>
                          <Link
                            href={`/dashboard/students/${student.id}`}
                            className="text-xs font-bold text-[#4262ff] hover:underline"
                          >
                            Profile →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* 3B. View Mode: Paginated Table */
          <div>
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
                  {paginatedStudents.map((student) => (
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
                          <span className="miro-pill bg-red-100 px-2.5 py-1 text-red-700">
                            Unassigned
                          </span>
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
                    Try adjusting your search terms or class selection.
                  </p>
                </div>
              )}
            </div>

            {/* 4. Pagination Controls */}
            {filtered.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between bg-[#fafbfc]">
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>
                    Showing <strong>{startIndex + 1}</strong> to <strong>{endIndex}</strong> of{" "}
                    <strong>{filtered.length}</strong> learners
                  </span>
                  <div className="flex items-center gap-1.5 ml-2 border-l border-slate-200 pl-3">
                    <span>Rows per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold outline-none"
                    >
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-center sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ← Prev
                  </button>

                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNumber = i + 1
                      if (totalPages > 5 && currentPage > 3) {
                        pageNumber = currentPage - 2 + i
                        if (pageNumber > totalPages) pageNumber = totalPages - 4 + i
                      }
                      return (
                        <button
                          key={pageNumber}
                          type="button"
                          onClick={() => setCurrentPage(pageNumber)}
                          className={`min-w-8 h-8 rounded-lg text-xs font-semibold transition ${
                            currentPage === pageNumber
                              ? "bg-[#1c1c1e] text-white"
                              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {pageNumber}
                        </button>
                      )
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
