"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import StudentBulkUpload from "@/components/upload/StudentBulkUpload"
import AssessmentBulkUpload from "@/components/upload/AssessmentBulkUpload"

interface School {
  id: string
  name: string
}

export default function BulkUploadPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"students" | "scores">("students")
  const [schools, setSchools] = useState<School[]>([])
  const [selectedSchool, setSelectedSchool] = useState("")
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [userSchoolId, setUserSchoolId] = useState("")

  useEffect(() => {
    fetchSession()
  }, [])

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" })
      const session = await res.json()
      
      if (session.user.role === "SUPER_ADMIN") {
        setIsSuperAdmin(true)
        fetchSchools()
      } else if (session.user.schoolId) {
        setUserSchoolId(session.user.schoolId)
        setSelectedSchool(session.user.schoolId)
      }
    } catch (err) {
      console.error("Failed to fetch session", err)
    }
  }

  const fetchSchools = async () => {
    try {
      const res = await fetch("/api/schools")
      if (res.ok) {
        const data = await res.json()
        setSchools(data)
      }
    } catch (err) {
      console.error("Failed to fetch schools", err)
    }
  }

  const handleUploadComplete = () => {
    router.refresh()
  }

  const activeSchoolName = schools.find((school) => school.id === selectedSchool)?.name

  return (
    <div className="mx-auto max-w-6xl space-y-7 pb-10">
      <header className="flex flex-col gap-5 border-b border-[#e0e2e8] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#187574]">Records & data</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#1c1c1e]">Bulk upload</h1>
          <p className="mt-1 max-w-xl text-sm leading-6 text-[#6b6f7e]">Bring learner records or assessment results into your school workspace.</p>
        </div>
        {activeSchoolName && <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#dce2e2] bg-white px-3 py-2 text-xs font-semibold text-[#335452]"><span className="h-2 w-2 rounded-full bg-[#39a393]" />{activeSchoolName}</span>}
      </header>

      {/* School Selector for Super Admin */}
      {isSuperAdmin && (
        <div className="flex flex-col gap-2 sm:max-w-md">
          <label className="text-xs font-semibold text-[#4f5664]" htmlFor="bulk-school">School <span className="text-[#c83b46">*</span></label>
          <select
            id="bulk-school"
            value={selectedSchool}
            onChange={(e) => setSelectedSchool(e.target.value)}
            className="min-h-11 w-full rounded-lg border border-[#c7cad5] bg-white px-3 text-sm text-[#1c1c1e] outline-none focus:border-[#187574] focus:ring-3 focus:ring-[#187574]/10"
          >
            <option value="">Choose a school</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedSchool && (
        <>
          <section role="tablist" aria-label="Choose import type" className="flex w-full gap-1 rounded-xl border border-[#e0e2e8] bg-[#f1f3f4] p-1 sm:w-fit">
            <button id="bulk-learners-tab" type="button" role="tab" aria-controls="bulk-learners-panel" aria-selected={activeTab === "students"} onClick={() => setActiveTab("students")} className={`min-h-10 flex-1 rounded-lg px-4 text-sm font-semibold transition sm:flex-none ${activeTab === "students" ? "bg-white text-[#176f69] shadow-sm" : "text-[#68717b] hover:text-[#1c1c1e]"}`}>Import learners</button>
            <button id="bulk-scores-tab" type="button" role="tab" aria-controls="bulk-scores-panel" aria-selected={activeTab === "scores"} onClick={() => setActiveTab("scores")} className={`min-h-10 flex-1 rounded-lg px-4 text-sm font-semibold transition sm:flex-none ${activeTab === "scores" ? "bg-white text-[#176f69] shadow-sm" : "text-[#68717b] hover:text-[#1c1c1e]"}`}>Import scores</button>
          </section>

          <div role="tabpanel" id={activeTab === "students" ? "bulk-learners-panel" : "bulk-scores-panel"} aria-labelledby={activeTab === "students" ? "bulk-learners-tab" : "bulk-scores-tab"}>
            {activeTab === "students" ? (
              <StudentBulkUpload schoolId={selectedSchool} onUploadComplete={handleUploadComplete} />
            ) : (
              <AssessmentBulkUpload schoolId={selectedSchool} onUploadComplete={handleUploadComplete} />
            )}
          </div>

          <p className="text-xs leading-5 text-[#8e91a0]">Download the matching template, fill the required columns, then review the preview before importing. Learners must exist before you import assessment scores.</p>
        </>
      )}

      {!selectedSchool && (
        <div className="flex min-h-52 flex-col items-center justify-center border-y border-[#e0e2e8] px-6 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e5f7f3] text-sm font-bold text-[#187574]">01</span>
          <h2 className="mt-4 text-lg font-semibold text-[#1c1c1e]">Choose a school to begin</h2>
          <p className="mt-1 max-w-sm text-sm text-[#6b6f7e]">Select the school whose learner records or assessment results you’re importing.</p>
        </div>
      )}
    </div>
  )
}
