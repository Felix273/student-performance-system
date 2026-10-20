"use client"

import { useState, useMemo } from "react"

interface School {
  id: string
  name: string
  county: string | null
}

interface ClassOption {
  id: string
  name: string
  grade: string
  schoolId: string
}

interface StudentOption {
  id: string
  name: string
  admissionNo: string
  schoolId: string
  classId: string
  class: { id: string; name: string; grade: string } | null
}

interface PeriodOption {
  id: string
  name: string
  isCurrentYear: boolean
}

interface Props {
  school: School | null
  classes: ClassOption[]
  students: StudentOption[]
  periods: PeriodOption[]
  userRole: string
  userSchoolId: string
}

type ReportKind =
  | "cbc-student"
  | "class-summary"
  | "assessment-broadsheet"
  | "student-roster"
  | "transcript"

export default function ReportsClient({
  school,
  classes,
  students,
  periods,
  userRole,
  userSchoolId,
}: Props) {
  const [reportType, setReportType] = useState<ReportKind>("cbc-student")
  const [selectedPeriod, setSelectedPeriod] = useState<string>(periods[0]?.id || "")
  const [selectedClass, setSelectedClass] = useState<string>("")
  const [selectedStudent, setSelectedStudent] = useState<string>("")
  const [studentSearch, setStudentSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Filter students based on selected class and search
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (selectedClass && s.classId !== selectedClass) return false
      if (studentSearch) {
        const query = studentSearch.toLowerCase()
        return (
          s.name.toLowerCase().includes(query) ||
          s.admissionNo.toLowerCase().includes(query)
        )
      }
      return true
    })
  }, [students, selectedClass, studentSearch])

  const download = async (endpoint: string, filename: string) => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch(endpoint)
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}))
        throw new Error(errJson.error || "The report could not be generated.")
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = filename
      anchor.click()
      window.URL.revokeObjectURL(url)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error generating report")
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = () => {
    setError("")
    const timestamp = new Date().toISOString().slice(0, 10)

    if (reportType === "cbc-student") {
      if (!selectedPeriod) return setError("Please select an Academic Term.")
      if (!selectedStudent) return setError("Please choose a student.")
      const student = students.find((s) => s.id === selectedStudent)
      download(
        `/api/reports/cbc-student-pdf?studentId=${selectedStudent}&periodId=${selectedPeriod}`,
        `CBC-Report-${student?.admissionNo || "student"}-${timestamp}.pdf`
      )
    } else if (reportType === "class-summary") {
      if (!selectedClass) return setError("Please choose a class.")
      const cls = classes.find((c) => c.id === selectedClass)
      download(
        `/api/reports/class-pdf?classId=${selectedClass}`,
        `Class-Summary-${cls?.name || "class"}-${timestamp}.pdf`
      )
    } else if (reportType === "assessment-broadsheet") {
      if (userRole === "TEACHER" && !selectedClass) {
        return setError("Please select an assigned class for your assessment export.")
      }
      download(
        `/api/reports/assessment-excel?schoolId=${userSchoolId}${selectedClass ? `&classId=${selectedClass}` : ""}`,
        `Assessment-Broadsheet-${timestamp}.xlsx`
      )
    } else if (reportType === "student-roster") {
      if (userRole === "TEACHER" && !selectedClass) {
        return setError("Please select a class for your roster export.")
      }
      download(
        `/api/reports/students-excel?schoolId=${userSchoolId}${selectedClass ? `&classId=${selectedClass}` : ""}`,
        `Learner-Roster-${timestamp}.xlsx`
      )
    } else if (reportType === "transcript") {
      if (!selectedStudent) return setError("Please choose a student.")
      const student = students.find((s) => s.id === selectedStudent)
      download(
        `/api/reports/student-pdf?studentId=${selectedStudent}`,
        `Transcript-${student?.admissionNo || "student"}-${timestamp}.pdf`
      )
    }
  }

  const reportCards = [
    {
      id: "cbc-student" as const,
      number: "01",
      badge: "CBC Standard",
      title: "CBC Term Report Card",
      detail: "Official learner report form with Mastery Bands (EE, ME, AE, BE) and teacher remarks.",
      tint: "bg-[#ffd02f]/20 border-[#ffd02f]",
    },
    {
      id: "class-summary" as const,
      number: "02",
      badge: "PDF Summary",
      title: "Class Performance Report",
      detail: "Stream-wide overview displaying learner distribution across subject areas.",
      tint: "bg-[#c3faf5]/30 border-[#7bbdb5]",
    },
    {
      id: "assessment-broadsheet" as const,
      number: "03",
      badge: "Excel Broadsheet",
      title: "Assessment Broadsheet",
      detail: "Full spreadsheet matrix of student marks, components, and scores by learning area.",
      tint: "bg-[#e7edff]/40 border-[#b5c7ff]",
    },
    {
      id: "student-roster" as const,
      number: "04",
      badge: "Excel Roster",
      title: "Learner Register Export",
      detail: "Export the official student directory with admission numbers, grades, and streams.",
      tint: "bg-[#ffd8f4]/30 border-[#e5a8d9]",
    },
    {
      id: "transcript" as const,
      number: "05",
      badge: "Historical",
      title: "Academic Transcript",
      detail: "Cumulative historical evaluation across all enrolled periods.",
      tint: "bg-slate-100 border-slate-300",
    },
  ]

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Hero Header */}
      <section className="flex flex-col justify-between gap-6 border-b border-[#e0e2e8] pb-8 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#4262ff]">
            Reports & Official Transcripts
          </p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight text-[#1c1c1e] sm:text-4xl">
            Documents & Decisions
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[#6b6f7e]">
            Generate official Kenyan CBC report cards, class broadsheets, and Excel matrices for{" "}
            <span className="font-semibold text-[#1c1c1e]">{school?.name || "your school"}</span>.
          </p>
        </div>
        <span className="miro-pill bg-[#1c1c1e] px-4 py-2 text-xs font-bold text-white">
          PDF + XLSX Engine
        </span>
      </section>

      {/* Report Type Selector Cards */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {reportCards.map((card) => {
          const isSelected = reportType === card.id
          return (
            <button
              key={card.id}
              onClick={() => {
                setReportType(card.id)
                setError("")
              }}
              className={`flex flex-col justify-between rounded-[22px] border p-5 text-left transition hover:-translate-y-0.5 ${
                card.tint
              } ${isSelected ? "ring-2 ring-[#1c1c1e] shadow-md" : "border-transparent bg-white shadow-sm"}`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#8e91a0]">{card.number}</span>
                  <span className="miro-pill bg-white px-2 py-0.5 text-[10px] font-bold text-[#1c1c1e]">
                    {card.badge}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[#1c1c1e]">{card.title}</h3>
                <p className="mt-1.5 text-xs leading-5 text-[#6b6f7e]">{card.detail}</p>
              </div>
              <span className="mt-4 text-xs font-bold text-[#1c1c1e]">
                {isSelected ? "Selected ✓" : "Choose this →"}
              </span>
            </button>
          )
        })}
      </section>

      {/* Configuration & Parameter Form */}
      <section className="miro-surface p-6 sm:p-8">
        <div className="mb-6">
          <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#8e91a0]">Report Parameters</p>
          <h2 className="mt-1 text-2xl font-medium tracking-tight text-[#1c1c1e]">Configure your download</h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Term Selector for CBC Report Card */}
          {reportType === "cbc-student" && (
            <label className="block md:col-span-2">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[.14em] text-[#6b6f7e]">
                Academic Year & Term <span className="text-red-500">*</span>
              </span>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full rounded-xl border border-[#c7cad5] bg-white px-4 py-3 text-sm text-[#1c1c1e] outline-none focus:border-[#4262ff]"
              >
                {periods.length === 0 ? (
                  <option value="">No academic terms configured (Set up in School Settings)</option>
                ) : (
                  periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.isCurrentYear ? "(Current Active Year)" : ""}
                    </option>
                  ))
                )}
              </select>
            </label>
          )}

          {/* Class Selector */}
          {(reportType === "class-summary" ||
            reportType === "cbc-student" ||
            reportType === "transcript" ||
            reportType === "assessment-broadsheet" ||
            reportType === "student-roster") && (
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[.14em] text-[#6b6f7e]">
                Class / Stream {reportType === "class-summary" ? "*" : "(Optional Filter)"}
              </span>
              <select
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value)
                  setSelectedStudent("")
                }}
                className="w-full rounded-xl border border-[#c7cad5] bg-white px-4 py-3 text-sm text-[#1c1c1e] outline-none focus:border-[#4262ff]"
              >
                <option value="">
                  {reportType === "class-summary" ? "Choose a class…" : "All classes & streams"}
                </option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} (Grade {cls.grade})
                  </option>
                ))}
              </select>
            </label>
          )}

          {/* Student Selector (for CBC Report Card or Transcript) */}
          {(reportType === "cbc-student" || reportType === "transcript") && (
            <div className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[.14em] text-[#6b6f7e]">
                Learner <span className="text-red-500">*</span>
              </span>
              <input
                type="search"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Filter by name or admission no…"
                className="mb-2 w-full rounded-lg border border-[#e0e2e8] bg-[#fafbfc] px-3 py-1.5 text-xs outline-none"
              />
              <select
                required
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full rounded-xl border border-[#c7cad5] bg-white px-4 py-3 text-sm text-[#1c1c1e] outline-none focus:border-[#4262ff]"
              >
                <option value="">Select a learner…</option>
                {filteredStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.admissionNo}) {s.class ? `· ${s.class.name}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {error && (
          <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* Action Button */}
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="miro-pill bg-[#1c1c1e] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#2c2c34] disabled:opacity-50"
          >
            {loading
              ? "Preparing document…"
              : reportType.includes("excel") || reportType.includes("broadsheet") || reportType.includes("roster")
              ? "Export to Excel (.xlsx) →"
              : "Generate Official PDF →"}
          </button>
          <span className="text-xs text-[#8e91a0]">
            The document will download directly to your device.
          </span>
        </div>
      </section>
    </div>
  )
}
