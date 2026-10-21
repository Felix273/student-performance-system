"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type AcademicPeriod = {
  id: string
  name: string
  code: string
  startsOn: Date | string
  endsOn: Date | string
  sequence: number
}

type AcademicYear = {
  id: string
  name: string
  startsOn: Date | string
  endsOn: Date | string
  isCurrent: boolean
  periods: AcademicPeriod[]
}

type SubjectItem = {
  id: string
  name: string
  code: string
  _count?: { teachers: number; assessments: number }
}

type SchoolData = {
  id: string
  name: string
  domain: string
  schoolLevel: string | null
  logoUrl?: string | null
  county: string | null
  contactEmail: string | null
  contactPhone: string | null
  timezone: string
}

function toDateInputValue(val: Date | string): string {
  try {
    const d = new Date(val)
    if (isNaN(d.getTime())) return ""
    return d.toISOString().slice(0, 10)
  } catch {
    return ""
  }
}

export default function SchoolSettingsWorkspace({
  school,
  initialAcademicYears,
  initialSubjects = [],
}: {
  school: SchoolData
  initialAcademicYears: AcademicYear[]
  initialSubjects?: SubjectItem[]
  notificationPref: unknown
}) {
  const router = useRouter()
  const [tab, setTab] = useState<"profile" | "subjects" | "calendar">("profile")

  // Profile Form state
  const [name, setName] = useState(school.name)
  const [schoolLevel, setSchoolLevel] = useState(school.schoolLevel || "PRIMARY")
  const [logoUrl, setLogoUrl] = useState(school.logoUrl || "")
  const [county, setCounty] = useState(school.county || "")
  const [contactEmail, setContactEmail] = useState(school.contactEmail || "")
  const [contactPhone, setContactPhone] = useState(school.contactPhone || "")
  const [timezone, setTimezone] = useState(school.timezone || "Africa/Nairobi")
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileMsg, setProfileMsg] = useState("")
  const [profileErr, setProfileErr] = useState("")

  // Calendar State
  const [years, setYears] = useState<AcademicYear[]>(initialAcademicYears)
  const [showYearModal, setShowYearModal] = useState(false)
  const [yearName, setYearName] = useState(`${new Date().getFullYear()}`)
  const [startsOn, setStartsOn] = useState(`${new Date().getFullYear()}-01-05`)
  const [endsOn, setEndsOn] = useState(`${new Date().getFullYear()}-11-25`)
  const [isCurrent, setIsCurrent] = useState(true)
  const [calLoading, setCalLoading] = useState(false)
  const [calMsg, setCalMsg] = useState("")
  const [calErr, setCalErr] = useState("")

  // Edit Year & Terms Modal State
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null)
  const [editYearName, setEditYearName] = useState("")
  const [editYearStartsOn, setEditYearStartsOn] = useState("")
  const [editYearEndsOn, setEditYearEndsOn] = useState("")
  const [editPeriods, setEditPeriods] = useState<Array<{ id: string; name: string; startsOn: string; endsOn: string }>>([])

  // Subjects State
  const [subjects, setSubjects] = useState<SubjectItem[]>(initialSubjects)
  const [subjectSearch, setSubjectSearch] = useState("")
  const [subjectLoading, setSubjectLoading] = useState(false)
  const [subjectMsg, setSubjectMsg] = useState("")
  const [subjectErr, setSubjectErr] = useState("")

  // Add / Edit Subject Modal State
  const [showSubjectModal, setShowSubjectModal] = useState(false)
  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null)
  const [subName, setSubName] = useState("")
  const [subCode, setSubCode] = useState("")

  // Handle Logo Image Upload (convert to base64)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      alert("Please upload a logo image under 2MB.")
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setLogoUrl(base64)
    }
    reader.readAsDataURL(file)
  }

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileLoading(true)
    setProfileMsg("")
    setProfileErr("")
    try {
      const res = await fetch(`/api/schools/${school.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          schoolLevel: schoolLevel || null,
          logoUrl: logoUrl || null,
          county,
          contactEmail,
          contactPhone,
          timezone,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Failed to update profile")

      // Automatically sync learning areas for the chosen school level
      await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoPopulate: true }),
      })

      const updatedSubjects = await fetch("/api/subjects").then((r) => r.json())
      if (Array.isArray(updatedSubjects)) {
        setSubjects(updatedSubjects)
      }

      setProfileMsg("School profile and logo updated! Learning areas synchronized to your school structure.")
      router.refresh()
    } catch (err: unknown) {
      setProfileErr(err instanceof Error ? err.message : "Error updating school")
    } finally {
      setProfileLoading(false)
    }
  }

  const createAcademicYear = async (e: React.FormEvent) => {
    e.preventDefault()
    setCalLoading(true)
    setCalMsg("")
    setCalErr("")
    try {
      const res = await fetch("/api/settings/academic-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: yearName,
          startsOn,
          endsOn,
          isCurrent,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Failed to create academic year")
      setYears((prev) => [result.academicYear, ...prev.map((y) => (isCurrent ? { ...y, isCurrent: false } : y))])
      setCalMsg(`Academic year ${yearName} created with CBC Terms.`)
      setShowYearModal(false)
      router.refresh()
    } catch (err: unknown) {
      setCalErr(err instanceof Error ? err.message : "Error creating year")
    } finally {
      setCalLoading(false)
    }
  }

  const openEditYearModal = (y: AcademicYear) => {
    setEditingYear(y)
    setEditYearName(y.name)
    setEditYearStartsOn(toDateInputValue(y.startsOn))
    setEditYearEndsOn(toDateInputValue(y.endsOn))
    setEditPeriods(
      (y.periods || []).map((p) => ({
        id: p.id,
        name: p.name,
        startsOn: toDateInputValue(p.startsOn),
        endsOn: toDateInputValue(p.endsOn),
      }))
    )
  }

  const saveEditedYear = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingYear) return
    setCalLoading(true)
    setCalMsg("")
    setCalErr("")
    try {
      const res = await fetch("/api/settings/academic-years", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingYear.id,
          name: editYearName,
          startsOn: editYearStartsOn,
          endsOn: editYearEndsOn,
          periods: editPeriods,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Failed to update academic year")
      setYears((prev) => prev.map((y) => (y.id === editingYear.id ? result.academicYear : y)))
      setCalMsg(`Academic year ${editYearName} and term dates updated successfully.`)
      setEditingYear(null)
      router.refresh()
    } catch (err: unknown) {
      setCalErr(err instanceof Error ? err.message : "Error updating year")
    } finally {
      setCalLoading(false)
    }
  }

  const setCurrentYear = async (id: string) => {
    try {
      const res = await fetch("/api/settings/academic-years", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isCurrent: true }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Failed to activate year")
      setYears((prev) =>
        prev.map((y) => ({
          ...y,
          isCurrent: y.id === id,
        }))
      )
      setCalMsg("Active academic year updated.")
      router.refresh()
    } catch (err: unknown) {
      setCalErr(err instanceof Error ? err.message : "Error activating year")
    }
  }

  const handleAutoPopulate = async () => {
    setSubjectLoading(true)
    setSubjectMsg("")
    setSubjectErr("")
    try {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoPopulate: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to auto-populate subjects")
      setSubjectMsg(data.message || "Kenya CBC learning areas populated successfully!")
      const updated = await fetch("/api/subjects").then((r) => r.json())
      setSubjects(Array.isArray(updated) ? updated : [])
      router.refresh()
    } catch (err: unknown) {
      setSubjectErr(err instanceof Error ? err.message : "Error auto-populating")
    } finally {
      setSubjectLoading(false)
    }
  }

  const openSubjectModal = (item?: SubjectItem) => {
    if (item) {
      setEditingSubject(item)
      setSubName(item.name)
      setSubCode(item.code)
    } else {
      setEditingSubject(null)
      setSubName("")
      setSubCode("")
    }
    setShowSubjectModal(true)
  }

  const saveSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubjectLoading(true)
    setSubjectMsg("")
    setSubjectErr("")
    try {
      if (editingSubject) {
        const res = await fetch(`/api/subjects/${editingSubject.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: subName, code: subCode }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to update subject")
        setSubjects((prev) =>
          prev.map((s) => (s.id === editingSubject.id ? { ...s, name: subName, code: subCode } : s))
        )
        setSubjectMsg(`Subject "${subName}" updated successfully.`)
      } else {
        const res = await fetch("/api/subjects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: subName, code: subCode }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to add subject")
        setSubjects((prev) => [...prev, data])
        setSubjectMsg(`Subject "${subName}" added successfully.`)
      }
      setShowSubjectModal(false)
      router.refresh()
    } catch (err: unknown) {
      setSubjectErr(err instanceof Error ? err.message : "Failed to save subject")
    } finally {
      setSubjectLoading(false)
    }
  }

  const deleteSubject = async (id: string, subTitle: string) => {
    if (!window.confirm(`Are you sure you want to remove ${subTitle}?`)) return
    setSubjectLoading(true)
    setSubjectMsg("")
    setSubjectErr("")
    try {
      const res = await fetch(`/api/subjects/${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to delete subject")
      setSubjects((prev) => prev.filter((s) => s.id !== id))
      setSubjectMsg(`Subject "${subTitle}" removed.`)
      router.refresh()
    } catch (err: unknown) {
      setSubjectErr(err instanceof Error ? err.message : "Error deleting subject")
    } finally {
      setSubjectLoading(false)
    }
  }

  const filteredSubjects = subjects.filter((s) => {
    const q = subjectSearch.toLowerCase()
    return s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex border-b border-[#e0e2e8] text-sm font-semibold">
        <button
          onClick={() => setTab("profile")}
          className={`border-b-2 px-5 py-3 transition ${
            tab === "profile"
              ? "border-[#1c1c1e] text-[#1c1c1e]"
              : "border-transparent text-[#6b6f7e] hover:text-[#1c1c1e]"
          }`}
        >
          Institutional Profile & Logo
        </button>
        <button
          onClick={() => setTab("subjects")}
          className={`border-b-2 px-5 py-3 transition ${
            tab === "subjects"
              ? "border-[#1c1c1e] text-[#1c1c1e]"
              : "border-transparent text-[#6b6f7e] hover:text-[#1c1c1e]"
          }`}
        >
          CBC Learning Areas ({subjects.length})
        </button>
        <button
          onClick={() => setTab("calendar")}
          className={`border-b-2 px-5 py-3 transition ${
            tab === "calendar"
              ? "border-[#1c1c1e] text-[#1c1c1e]"
              : "border-transparent text-[#6b6f7e] hover:text-[#1c1c1e]"
          }`}
        >
          Academic Calendar & Terms
        </button>
      </div>

      {/* Tab 1: Profile & Logo */}
      {tab === "profile" && (
        <section className="miro-surface max-w-3xl p-6 sm:p-8">
          <h2 className="text-xl font-medium tracking-tight text-[#1c1c1e]">School Profile & Official Identity</h2>
          <p className="mt-1 text-xs text-[#6b6f7e]">
            Your official logo and school structure are displayed sitewide and printed on official CBC report cards.
          </p>

          <form onSubmit={saveProfile} className="mt-6 space-y-6">
            {/* Logo Upload & Preview Card */}
            <div className="rounded-2xl border border-[#e0e2e8] bg-[#fbfbfc] p-5">
              <span className="block text-xs font-bold uppercase tracking-wider text-[#4f5664]">
                Official School Crest / Logo
              </span>
              <p className="mt-0.5 text-xs text-[#8e91a0]">
                Appears on the sidebar, header, and official student report forms (PNG, JPG, or SVG).
              </p>

              <div className="mt-4 flex flex-col sm:flex-row items-center gap-5">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[#c7cad5] bg-white shadow-sm p-1">
                  {logoUrl ? (
                    <img src={logoUrl} alt="School Logo" className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-2xl text-slate-400">🏫</span>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="inline-block cursor-pointer rounded-xl bg-[#1c1c1e] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2c2c34] transition">
                    Upload Logo File
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="sr-only"
                    />
                  </label>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl("")}
                      className="ml-2 text-xs font-semibold text-red-600 hover:underline"
                    >
                      Remove Logo
                    </button>
                  )}
                  <p className="text-[11px] text-[#8e91a0]">Recommended square aspect ratio (e.g. 250x250px).</p>
                </div>
              </div>
            </div>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[.14em] text-[#6b6f7e]">
                Official School Name <span className="text-red-500">*</span>
              </span>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-[#e0e2e8] bg-white px-4 py-3 text-sm outline-none focus:border-[#4262ff]"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Selectable School Level */}
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[.14em] text-[#6b6f7e]">
                  School Level & Structure <span className="text-red-500">*</span>
                </span>
                <select
                  value={schoolLevel}
                  onChange={(e) => setSchoolLevel(e.target.value)}
                  className="w-full rounded-xl border border-[#e0e2e8] bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[#4262ff]"
                >
                  <option value="PRE_PRIMARY">Pre-Primary Only (PP1 – PP2)</option>
                  <option value="PRIMARY">Primary School (Pre-Primary + Grade 1 to 6)</option>
                  <option value="PRIMARY_AND_JUNIOR">Comprehensive School (Pre-Primary + Primary + Junior School: PP1 – Grade 9)</option>
                  <option value="JUNIOR">Junior School Only (Grades 7 – 9)</option>
                  <option value="SENIOR">Senior School (Grades 10 – 12)</option>
                </select>
                <span className="mt-1.5 block text-xs text-[#8e91a0]">
                  Learning areas and assessment bands automatically synchronize to this educational structure.
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[.14em] text-[#6b6f7e]">
                  County
                </span>
                <input
                  value={county}
                  onChange={(e) => setCounty(e.target.value)}
                  placeholder="e.g. Nairobi, Nakuru, Kiambu"
                  className="w-full rounded-xl border border-[#e0e2e8] bg-white px-4 py-3 text-sm outline-none focus:border-[#4262ff]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[.14em] text-[#6b6f7e]">
                  Official Contact Email
                </span>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="admin@school.ac.ke"
                  className="w-full rounded-xl border border-[#e0e2e8] bg-white px-4 py-3 text-sm outline-none focus:border-[#4262ff]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[.14em] text-[#6b6f7e]">
                  Contact Phone Number
                </span>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+254 700 000 000"
                  className="w-full rounded-xl border border-[#e0e2e8] bg-white px-4 py-3 text-sm outline-none focus:border-[#4262ff]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[.14em] text-[#6b6f7e]">
                  Timezone
                </span>
                <input
                  required
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full rounded-xl border border-[#e0e2e8] bg-white px-4 py-3 font-mono text-sm outline-none focus:border-[#4262ff]"
                />
              </label>
            </div>

            {profileErr && (
              <p role="alert" className="rounded-xl bg-[#fff1f1] px-4 py-3 text-sm font-semibold text-[#a33a3a]">
                {profileErr}
              </p>
            )}
            {profileMsg && (
              <p role="status" className="rounded-xl bg-[#c3faf5] px-4 py-3 text-sm font-semibold text-[#187574]">
                {profileMsg}
              </p>
            )}

            <button
              disabled={profileLoading}
              className="miro-pill bg-[#1c1c1e] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#2c2c34] disabled:opacity-50"
            >
              {profileLoading ? "Saving…" : "Save Profile & Sync Structure →"}
            </button>
          </form>
        </section>
      )}

      {/* Tab 2: Subjects */}
      {tab === "subjects" && (
        <section className="space-y-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-medium tracking-tight text-[#1c1c1e]">
                Kenyan CBC Learning Areas
              </h2>
              <p className="mt-1 text-xs text-[#6b6f7e]">
                Synchronized with your school structure ({schoolLevel.replace(/_/g, " ")}).
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                disabled={subjectLoading}
                onClick={handleAutoPopulate}
                className="miro-pill bg-[#ffd02f] px-4 py-2.5 text-xs font-bold text-[#1c1c1e] hover:bg-[#fcb900] disabled:opacity-50"
              >
                {subjectLoading ? "Populating…" : "⚡ Auto-populate Learning Areas"}
              </button>
              <button
                type="button"
                onClick={() => openSubjectModal()}
                className="miro-pill bg-[#1c1c1e] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#2c2c34]"
              >
                + Add Custom Subject
              </button>
            </div>
          </div>

          {subjectMsg && (
            <p role="status" className="rounded-xl bg-[#c3faf5] px-4 py-3 text-sm font-semibold text-[#187574]">
              {subjectMsg}
            </p>
          )}
          {subjectErr && (
            <p role="alert" className="rounded-xl bg-[#fff1f1] px-4 py-3 text-sm font-semibold text-[#a33a3a]">
              {subjectErr}
            </p>
          )}

          <div className="flex items-center gap-3">
            <input
              type="search"
              value={subjectSearch}
              onChange={(e) => setSubjectSearch(e.target.value)}
              placeholder="Search by subject name or code…"
              className="w-full max-w-md rounded-xl border border-[#e0e2e8] bg-white px-4 py-2.5 text-xs outline-none focus:border-[#4262ff]"
            />
            <span className="text-xs text-[#8e91a0]">
              Showing {filteredSubjects.length} of {subjects.length} subjects
            </span>
          </div>

          {subjects.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#cfd5df] bg-[#fffdf5] p-12 text-center">
              <h3 className="text-lg font-bold text-[#1c1c1e]">No subjects populated yet</h3>
              <p className="mt-1.5 text-xs text-[#6b6f7e]">
                Click below to populate learning areas for {schoolLevel.replace(/_/g, " ")}.
              </p>
              <button
                type="button"
                onClick={handleAutoPopulate}
                className="miro-pill mt-5 bg-[#1c1c1e] px-5 py-2.5 text-xs font-bold text-white"
              >
                ⚡ Auto-populate Learning Areas Now
              </button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredSubjects.map((item) => (
                <div
                  key={item.id}
                  className="miro-surface flex flex-col justify-between p-5 transition hover:border-[#1c1c1e]"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-[#4262ff] bg-[#e7edff] px-2 py-0.5 rounded-md">
                        {item.code}
                      </span>
                      <span className="text-[10px] text-[#8e91a0]">
                        {item._count?.teachers ? `${item._count.teachers} teacher(s)` : "Unassigned"}
                      </span>
                    </div>
                    <h3 className="mt-3 text-base font-bold text-[#1c1c1e]">{item.name}</h3>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2 border-t border-[#f0f2f5] pt-3">
                    <button
                      type="button"
                      onClick={() => openSubjectModal(item)}
                      className="rounded-lg border border-[#e0e2e8] bg-white px-2.5 py-1 text-xs font-semibold text-[#1c1c1e] hover:bg-[#f7f8fa]"
                    >
                      Edit ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSubject(item.id, item.name)}
                      className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showSubjectModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-md rounded-[24px] bg-white p-7 shadow-2xl animate-fade-in">
                <h3 className="text-lg font-bold text-[#1c1c1e]">
                  {editingSubject ? "Edit Subject" : "Add Custom Subject / Learning Area"}
                </h3>
                <p className="mt-1 text-xs text-[#6b6f7e]">
                  {editingSubject
                    ? "Update the name or code for this learning area."
                    : "Add an elective or custom subject for your school."}
                </p>

                <form onSubmit={saveSubject} className="mt-5 space-y-4">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-[#6b6f7e]">
                      Subject Name <span className="text-red-500">*</span>
                    </span>
                    <input
                      required
                      value={subName}
                      onChange={(e) => setSubName(e.target.value)}
                      placeholder="e.g. French Language, Computer Science"
                      className="w-full rounded-xl border border-[#e0e2e8] px-4 py-2.5 text-sm outline-none focus:border-[#4262ff]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-[#6b6f7e]">
                      Subject Code <span className="text-red-500">*</span>
                    </span>
                    <input
                      required
                      value={subCode}
                      onChange={(e) => setSubCode(e.target.value.toUpperCase())}
                      placeholder="e.g. FRE, CS, GER, ARA"
                      className="w-full rounded-xl border border-[#e0e2e8] px-4 py-2.5 font-mono text-sm uppercase outline-none focus:border-[#4262ff]"
                    />
                  </label>

                  <div className="mt-6 flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowSubjectModal(false)}
                      className="miro-pill border border-[#e0e2e8] px-4 py-2 text-xs font-semibold text-[#6b6f7e]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={subjectLoading}
                      className="miro-pill bg-[#1c1c1e] px-4 py-2 text-xs font-semibold text-white"
                    >
                      {subjectLoading ? "Saving…" : editingSubject ? "Save Changes" : "Add Subject"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Tab 3: Calendar */}
      {tab === "calendar" && (
        <section className="space-y-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-medium tracking-tight text-[#1c1c1e]">Academic Years & Terms</h2>
              <p className="mt-1 text-xs text-[#6b6f7e]">
                Set exact start and end dates for each term. Assessments and timetables synchronize directly with these dates.
              </p>
            </div>
            <button
              onClick={() => setShowYearModal(true)}
              className="miro-pill bg-[#ffd02f] px-5 py-2.5 text-xs font-bold text-[#1c1c1e] hover:bg-[#fcb900]"
            >
              + New Academic Year
            </button>
          </div>

          {calErr && (
            <p role="alert" className="rounded-xl bg-[#fff1f1] px-4 py-3 text-sm font-semibold text-[#a33a3a]">
              {calErr}
            </p>
          )}
          {calMsg && (
            <p role="status" className="rounded-xl bg-[#c3faf5] px-4 py-3 text-sm font-semibold text-[#187574]">
              {calMsg}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {years.map((y) => (
              <div
                key={y.id}
                className={`miro-surface p-6 transition ${
                  y.isCurrent ? "ring-2 ring-[#ffd02f] border-transparent" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-2xl font-bold text-[#1c1c1e]">{y.name}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditYearModal(y)}
                      className="rounded-lg border border-[#e0e2e8] bg-white px-3 py-1 text-xs font-semibold text-[#1c1c1e] hover:bg-[#f7f8fa]"
                    >
                      Edit Dates ✏️
                    </button>
                    {y.isCurrent ? (
                      <span className="miro-pill bg-[#c3faf5] px-3 py-1 text-xs font-bold text-[#187574]">
                        Active Year
                      </span>
                    ) : (
                      <button
                        onClick={() => setCurrentYear(y.id)}
                        className="miro-pill border border-[#e0e2e8] bg-white px-3 py-1 text-xs font-semibold text-[#6b6f7e] hover:border-[#1c1c1e] hover:text-[#1c1c1e]"
                      >
                        Set as Active
                      </button>
                    )}
                  </div>
                </div>

                <p className="mt-2 text-xs text-[#6b6f7e]">
                  Overall Year: <strong className="text-[#1c1c1e]">{new Date(y.startsOn).toLocaleDateString()}</strong> — <strong className="text-[#1c1c1e]">{new Date(y.endsOn).toLocaleDateString()}</strong>
                </p>

                <div className="mt-5 space-y-2 border-t border-[#e0e2e8] pt-4">
                  <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#8e91a0]">Curriculum Terms & Windows</p>
                  <div className="space-y-1.5">
                    {y.periods && y.periods.length > 0 ? (
                      y.periods.map((period) => (
                        <div
                          key={period.id}
                          className="flex items-center justify-between rounded-lg bg-[#f7f8fa] px-3 py-2 text-xs font-medium"
                        >
                          <span className="font-semibold text-[#1c1c1e]">{period.name}</span>
                          <span className="font-mono text-[11px] text-[#6b6f7e]">
                            {new Date(period.startsOn).toLocaleDateString()} – {new Date(period.endsOn).toLocaleDateString()}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[#8e91a0]">No terms defined yet.</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {showYearModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-md rounded-[24px] bg-white p-7 shadow-2xl animate-fade-in">
                <h3 className="text-lg font-bold text-[#1c1c1e]">Add New Academic Year</h3>
                <p className="mt-1 text-xs text-[#6b6f7e]">
                  Auto-scaffolds Term 1, Term 2, and Term 3 for the Kenyan CBC calendar.
                </p>

                <form onSubmit={createAcademicYear} className="mt-5 space-y-4">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-[#6b6f7e]">Year Label</span>
                    <input
                      required
                      value={yearName}
                      onChange={(e) => setYearName(e.target.value)}
                      placeholder="e.g. 2026"
                      className="w-full rounded-xl border border-[#e0e2e8] px-4 py-2.5 text-sm"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-[#6b6f7e]">Starts On</span>
                      <input
                        type="date"
                        required
                        value={startsOn}
                        onChange={(e) => setStartsOn(e.target.value)}
                        className="w-full rounded-xl border border-[#e0e2e8] px-3 py-2 text-xs"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-[#6b6f7e]">Ends On</span>
                      <input
                        type="date"
                        required
                        value={endsOn}
                        onChange={(e) => setEndsOn(e.target.value)}
                        className="w-full rounded-xl border border-[#e0e2e8] px-3 py-2 text-xs"
                      />
                    </label>
                  </div>

                  <label className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      checked={isCurrent}
                      onChange={(e) => setIsCurrent(e.target.checked)}
                      className="h-4 w-4 rounded border-[#e0e2e8]"
                    />
                    <span className="text-xs font-medium text-[#1c1c1e]">Set as currently active academic year</span>
                  </label>

                  <div className="mt-6 flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowYearModal(false)}
                      className="miro-pill border border-[#e0e2e8] px-4 py-2 text-xs font-semibold text-[#6b6f7e]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={calLoading}
                      className="miro-pill bg-[#1c1c1e] px-4 py-2 text-xs font-semibold text-white"
                    >
                      {calLoading ? "Creating…" : "Create Year"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {editingYear && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-lg rounded-[24px] bg-white p-7 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold text-[#1c1c1e]">
                  Edit Academic Year & Terms: {editingYear.name}
                </h3>
                <p className="mt-1 text-xs text-[#6b6f7e]">
                  Specify the exact start and end dates for the academic year and each curriculum term.
                </p>

                <form onSubmit={saveEditedYear} className="mt-5 space-y-5">
                  <div className="rounded-xl border border-[#e0e2e8] bg-[#fbfbfc] p-4 space-y-3">
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-[#4f5664]">Year Label</span>
                      <input
                        required
                        value={editYearName}
                        onChange={(e) => setEditYearName(e.target.value)}
                        className="w-full rounded-xl border border-[#e0e2e8] bg-white px-3 py-2 text-sm outline-none focus:border-[#4262ff]"
                      />
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-[#4f5664]">Year Starts</span>
                        <input
                          type="date"
                          required
                          value={editYearStartsOn}
                          onChange={(e) => setEditYearStartsOn(e.target.value)}
                          className="w-full rounded-xl border border-[#e0e2e8] bg-white px-3 py-2 text-xs outline-none"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-[#4f5664]">Year Ends</span>
                        <input
                          type="date"
                          required
                          value={editYearEndsOn}
                          onChange={(e) => setEditYearEndsOn(e.target.value)}
                          className="w-full rounded-xl border border-[#e0e2e8] bg-white px-3 py-2 text-xs outline-none"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#6b6f7e]">
                      Term Start & End Dates
                    </p>
                    {editPeriods.map((period, idx) => (
                      <div
                        key={period.id}
                        className="rounded-xl border border-[#e0e2e8] bg-[#fafbfc] p-3.5 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <input
                            required
                            value={period.name}
                            onChange={(e) => {
                              const val = e.target.value
                              setEditPeriods((prev) =>
                                prev.map((p, i) => (i === idx ? { ...p, name: val } : p))
                              )
                            }}
                            className="font-bold text-xs bg-transparent border-b border-gray-300 focus:border-[#4262ff] outline-none px-1 py-0.5 text-[#1c1c1e]"
                          />
                          <span className="text-[10px] text-slate-400 font-mono">Term {idx + 1}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <label className="block">
                            <span className="mb-1 block text-[11px] text-[#6b6f7e]">Term Starts</span>
                            <input
                              type="date"
                              required
                              value={period.startsOn}
                              onChange={(e) => {
                                const val = e.target.value
                                setEditPeriods((prev) =>
                                  prev.map((p, i) => (i === idx ? { ...p, startsOn: val } : p))
                                )
                              }}
                              className="w-full rounded-lg border border-[#e0e2e8] bg-white px-2.5 py-1.5 text-xs outline-none"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-[11px] text-[#6b6f7e]">Term Ends</span>
                            <input
                              type="date"
                              required
                              value={period.endsOn}
                              onChange={(e) => {
                                const val = e.target.value
                                setEditPeriods((prev) =>
                                  prev.map((p, i) => (i === idx ? { ...p, endsOn: val } : p))
                                )
                              }}
                              className="w-full rounded-lg border border-[#e0e2e8] bg-white px-2.5 py-1.5 text-xs outline-none"
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex justify-end gap-2 pt-2 border-t border-[#e0e2e8]">
                    <button
                      type="button"
                      onClick={() => setEditingYear(null)}
                      className="miro-pill border border-[#e0e2e8] px-4 py-2 text-xs font-semibold text-[#6b6f7e]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={calLoading}
                      className="miro-pill bg-[#1c1c1e] px-5 py-2 text-xs font-semibold text-white"
                    >
                      {calLoading ? "Saving…" : "Save Year & Term Dates →"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
