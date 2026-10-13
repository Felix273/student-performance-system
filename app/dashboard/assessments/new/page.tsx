"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface Class {
  id: string
  name: string
  grade: string
}

interface Subject {
  id: string
  name: string
  code: string
}

export default function NewAssessmentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [classes, setClasses] = useState<Class[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [userRole, setUserRole] = useState("")
  const [showSubjectForm, setShowSubjectForm] = useState(false)
  
  const [formData, setFormData] = useState({
    title: "",
    type: "QUIZ",
    maxScore: "100",
    classId: "",
    subjectId: "",
    schoolId: "",
    date: new Date().toISOString().split('T')[0]
  })

  const [subjectFormData, setSubjectFormData] = useState({
    name: "",
    code: ""
  })

  useEffect(() => {
    fetchSession()
  }, [])

  useEffect(() => {
    if (formData.schoolId) {
      fetchClasses(formData.schoolId)
      if (userRole !== "TEACHER") fetchSubjects(formData.schoolId)
    }
  }, [formData.schoolId, userRole])

  useEffect(() => {
    if (userRole === "TEACHER" && formData.schoolId && formData.classId) {
      fetchSubjects(formData.schoolId, formData.classId)
    }
  }, [formData.schoolId, formData.classId, userRole])

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" })
      if (!res.ok) return
      const session = await res.json()
      if (!session?.user) return

      setUserRole(session.user.role)
      
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

  const fetchSubjects = async (schoolId: string, classId?: string) => {
    try {
      const params = new URLSearchParams({ schoolId })
      if (classId) params.set("classId", classId)
      const res = await fetch(`/api/subjects?${params}`)
      if (res.ok) {
        const data = await res.json()
        setSubjects(data)
      }
    } catch (err) {
      console.error("Failed to fetch subjects", err)
    }
  }

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...subjectFormData,
          schoolId: formData.schoolId
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create subject")
      }

      const newSubject = await res.json()
      setSubjects([...subjects, newSubject])
      setFormData({ ...formData, subjectId: newSubject.id })
      setShowSubjectForm(false)
      setSubjectFormData({ name: "", code: "" })
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          maxScore: parseFloat(formData.maxScore)
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create assessment")
      }

      router.push(userRole === "TEACHER" ? `/dashboard/assessments/${data.id}/record` : "/dashboard/assessments")
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 animate-fade-in">
      <div><p className="text-xs font-bold uppercase tracking-[.16em] text-violet-600">Measure progress</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Create assessment</h1><p className="mt-2 text-sm font-medium text-slate-500">{userRole === "TEACHER" ? "Create a quiz, assignment, or test for a class and subject assigned to you." : "Set up a focused checkpoint and make the next result easier to understand."}</p></div>
      <form onSubmit={handleSubmit} className="space-y-7 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgb(15,23,42,0.04)] sm:p-8">
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600">
            Assessment Title *
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-950 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10"
            placeholder="e.g., Mid-Term Mathematics Exam"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600">
              Assessment Type *
            </label>
            <select
              required
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-950 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10"
            >
              <option value="QUIZ">Quiz</option>
              <option value="ASSIGNMENT">Assignment</option>
              <option value="MID_TERM">Mid-Term</option>
              <option value="FINAL_EXAM">Final Exam</option>
              <option value="PROJECT">Project</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600">
              Maximum Score *
            </label>
            <input
              type="number"
              required
              min="1"
              step="0.01"
              value={formData.maxScore}
              onChange={(e) => setFormData({...formData, maxScore: e.target.value})}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-950 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600">
            Class *
          </label>
          <select
            required
            value={formData.classId}
            onChange={(e) => { setSubjects([]); setFormData({...formData, classId: e.target.value, subjectId: ""}) }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-950 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10"
            disabled={!formData.schoolId}
          >
            <option value="">-- Select Class --</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} · {cls.grade}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Subject *
            </label>
            {formData.schoolId && userRole === "SCHOOL_ADMIN" && (
              <button
                type="button"
                onClick={() => setShowSubjectForm(!showSubjectForm)}
                className="text-xs font-bold text-violet-600 hover:text-violet-800"
              >
                + Create Subject
              </button>
            )}
          </div>

          {showSubjectForm && (
            <div className="mb-4 space-y-3 rounded-xl border border-violet-100 bg-violet-50/50 p-4">
              <input
                type="text"
                placeholder="Subject Name (e.g., Mathematics)"
                value={subjectFormData.name}
                onChange={(e) => setSubjectFormData({...subjectFormData, name: e.target.value})}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-500"
              />
              <input
                type="text"
                placeholder="Subject Code (e.g., MATH101)"
                value={subjectFormData.code}
                onChange={(e) => setSubjectFormData({...subjectFormData, code: e.target.value.toUpperCase()})}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-500"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCreateSubject}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowSubjectForm(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <select
            required
            value={formData.subjectId}
            onChange={(e) => setFormData({...formData, subjectId: e.target.value})}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-950 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10"
            disabled={!formData.schoolId || (userRole === "TEACHER" && !formData.classId)}
          >
            <option value="">{userRole === "TEACHER" && !formData.classId ? "Choose a class first" : subjects.length ? "Choose a subject" : "No subjects assigned for this class"}</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name} ({subject.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600">
            Assessment Date *
          </label>
          <input
            type="date"
            required
            value={formData.date}
            onChange={(e) => setFormData({...formData, date: e.target.value})}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-950 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-violet-600 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Assessment"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
