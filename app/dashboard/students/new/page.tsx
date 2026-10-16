"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface School {
  id: string
  name: string
  domain: string
}

interface Class {
  id: string
  name: string
  grade: string
}

const fieldClass = "min-h-11 w-full rounded-xl border border-[#c7cad5] bg-white px-3.5 text-sm text-[#1c1c1e] outline-none transition placeholder:text-[#a5a8b5] focus:border-[#4262ff] focus:ring-3 focus:ring-[#4262ff]/10 disabled:cursor-not-allowed disabled:bg-[#f7f8fa]"
const labelClass = "mb-1.5 block text-xs font-semibold text-[#4f5664]"

export default function NewStudentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [schools, setSchools] = useState<School[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [showClassForm, setShowClassForm] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  
  const [formData, setFormData] = useState({
    name: "",
    admissionNo: "",
    classId: "",
    schoolId: ""
  })

  const [classFormData, setClassFormData] = useState({
    name: "",
    grade: ""
  })

  useEffect(() => {
    fetchSession()
  }, [])

  useEffect(() => {
    if (formData.schoolId) {
      fetchClasses(formData.schoolId)
    }
  }, [formData.schoolId])

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" })
      const session = await res.json()
      
      if (session.user.role === "SUPER_ADMIN") {
        router.replace("/dashboard/platform")
        return
      } else if (session.user.schoolId) {
        setFormData(prev => ({ ...prev, schoolId: session.user.schoolId }))
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

  const fetchClasses = async (schoolId: string) => {
    try {
      const res = await fetch(`/api/classes?schoolId=${schoolId}`)
      if (res.ok) {
        const data = await res.json()
        setClasses(data)
      }
    } catch (err) {
      console.error("Failed to fetch classes", err)
    }
  }

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...classFormData,
          schoolId: formData.schoolId
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create class")
      }

      const newClass = await res.json()
      setClasses([...classes, newClass])
      setFormData({ ...formData, classId: newClass.id })
      setShowClassForm(false)
      setClassFormData({ name: "", grade: "" })
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create student")
      }

      router.push("/dashboard/students")
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-7 pb-10 animate-fade-in">
      <header className="relative overflow-hidden rounded-3xl bg-[#1c1c1e] px-6 py-7 text-white sm:px-8 sm:py-8">
        <div aria-hidden="true" className="absolute -right-5 -top-9 hidden h-36 w-36 rotate-12 border-20 border-[#ffd02f]/20 sm:block" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[.18em] text-[#ffd02f]">People &amp; records / Enrollment</p>
            <h1 className="text-4xl font-medium leading-[1.05] tracking-[-.045em] sm:text-5xl">Add a student.</h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-[#c7cad5]">Create a learner record and place them in the right class.</p>
          </div>
          <span className="miro-pill inline-flex w-fit items-center gap-2 border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white/85"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#ffd02f]" />New learner record</span>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="miro-surface overflow-hidden">
        {isSuperAdmin && (
          <section className="border-b border-[#eef0f3] p-5 sm:p-7">
            <label className={labelClass} htmlFor="student-school">School <span className="text-[#c83b46">*</span></label>
            <select
              id="student-school"
              required
              value={formData.schoolId}
              onChange={(e) => setFormData({...formData, schoolId: e.target.value, classId: ""})}
              className={fieldClass}
            >
              <option value="">Choose a school</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </section>
        )}

        <section className="border-b border-[#eef0f3] p-5 sm:p-7">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#8e91a0]">01 · Learner profile</p><h2 className="mt-1 text-lg font-semibold text-[#1c1c1e]">Student details</h2></div>
            <span className="text-xs font-medium text-[#8e91a0]">Required</span>
          </div>
          <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            <label className="block"><span className={labelClass}>Student name <span className="text-[#c83b46">*</span></span><input type="text" required autoComplete="off" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className={fieldClass} placeholder="e.g. Amina Wanjiku" /></label>
            <label className="block"><span className={labelClass}>Admission number <span className="text-[#c83b46">*</span></span><input type="text" required autoComplete="off" value={formData.admissionNo} onChange={(e) => setFormData({...formData, admissionNo: e.target.value})} className={fieldClass} placeholder="e.g. 2026001" /></label>
          </div>
        </section>

        <section className="p-5 sm:p-7">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#8e91a0]">02 · Placement</p><h2 className="mt-1 text-lg font-semibold text-[#1c1c1e]">Class placement</h2></div>
            <span className="rounded-full bg-[#e7edff] px-3 py-1.5 text-xs font-semibold text-[#4262ff]">Required</span>
          </div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <label className={labelClass} htmlFor="student-class">Class <span className="text-[#c83b46">*</span></label>
            {formData.schoolId && (
              <button
                type="button"
                onClick={() => setShowClassForm(!showClassForm)}
                aria-expanded={showClassForm}
                className="rounded-full border border-[#d8dde5] px-3 py-1.5 text-xs font-semibold text-[#4262ff] transition hover:border-[#4262ff] hover:bg-[#f5f7ff]"
              >
                {showClassForm ? "Close class setup" : "+ Create class"}
              </button>
            )}
          </div>

          {showClassForm && (
            <div className="mb-4 space-y-3 rounded-xl border border-[#e0e2e8] bg-[#f7f8fa] p-4">
              <p className="text-xs font-semibold text-[#1c1c1e]">Quick class setup</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block"><span className={labelClass}>Class name</span><input type="text" placeholder="e.g. Grade 1 Blue" value={classFormData.name} onChange={(e) => setClassFormData({...classFormData, name: e.target.value})} className={fieldClass} /></label>
                <label className="block"><span className={labelClass}>Grade</span><input type="text" placeholder="e.g. Grade 1" value={classFormData.grade} onChange={(e) => setClassFormData({...classFormData, grade: e.target.value})} className={fieldClass} /></label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCreateClass}
                  className="min-h-10 rounded-full bg-[#1c1c1e] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#34343a]"
                >
                  Create class
                </button>
                <button
                  type="button"
                  onClick={() => setShowClassForm(false)}
                  className="min-h-10 rounded-full border border-[#d9dce5] px-4 py-2 text-xs font-semibold text-[#555a6a] transition hover:bg-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <select
            id="student-class"
            required
            value={formData.classId}
            onChange={(e) => setFormData({...formData, classId: e.target.value})}
            className={fieldClass}
            disabled={!formData.schoolId}
          >
            <option value="">Choose a class</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} (Grade {cls.grade})
              </option>
            ))}
          </select>
          {!formData.schoolId && (
            <p className="mt-2 text-xs text-[#8e91a0]">Select a school first.</p>
          )}
          {formData.schoolId && classes.length === 0 && (
            <p className="mt-2 text-xs text-[#8e91a0]">No classes yet. Create a class to place this student.</p>
          )}
        </section>

        {error && (
          <div role="alert" className="mx-5 mb-5 rounded-xl border border-[#ffc6c6] bg-[#fff1f1] px-4 py-3 text-sm font-semibold text-[#9b3030] sm:mx-7">
            {error}
          </div>
        )}

        <footer className="flex flex-col-reverse gap-3 border-t border-[#eef0f3] bg-[#f7f8fa] p-5 sm:flex-row sm:justify-end sm:px-7">
          <button
            type="submit"
            disabled={loading}
            className="min-h-11 rounded-full bg-[#1c1c1e] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#34343a] disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-44"
          >
            {loading ? "Creating..." : "Create Student"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="min-h-11 rounded-full border border-[#d9dce5] px-6 py-2.5 text-sm font-semibold text-[#555a6a] transition hover:bg-white"
          >
            Cancel
          </button>
        </footer>
      </form>
    </div>
  )
}
