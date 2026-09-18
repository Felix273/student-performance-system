"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface School {
  id: string
  name: string
}

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
  const [schools, setSchools] = useState<School[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
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
      fetchSubjects(formData.schoolId)
    }
  }, [formData.schoolId])

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/debug/session")
      const session = await res.json()
      
      if (session.user.role === "SUPER_ADMIN") {
        setIsSuperAdmin(true)
        fetchSchools()
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

  const fetchSubjects = async (schoolId: string) => {
    try {
      const res = await fetch(`/api/subjects?schoolId=${schoolId}`)
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

      router.push("/dashboard/assessments")
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Create New Assessment</h2>
        <p className="text-gray-600 mt-1">Set up a new assessment for students</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
        {isSuperAdmin && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select School *
            </label>
            <select
              required
              value={formData.schoolId}
              onChange={(e) => setFormData({...formData, schoolId: e.target.value, classId: "", subjectId: ""})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
            >
              <option value="">-- Select School --</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Assessment Title *
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
            placeholder="e.g., Mid-Term Mathematics Exam"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assessment Type *
            </label>
            <select
              required
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
            >
              <option value="QUIZ">Quiz</option>
              <option value="ASSIGNMENT">Assignment</option>
              <option value="MID_TERM">Mid-Term</option>
              <option value="FINAL_EXAM">Final Exam</option>
              <option value="PROJECT">Project</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Maximum Score *
            </label>
            <input
              type="number"
              required
              min="1"
              step="0.01"
              value={formData.maxScore}
              onChange={(e) => setFormData({...formData, maxScore: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Class *
          </label>
          <select
            required
            value={formData.classId}
            onChange={(e) => setFormData({...formData, classId: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
            disabled={!formData.schoolId}
          >
            <option value="">-- Select Class --</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} (Grade {cls.grade})
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Subject *
            </label>
            {formData.schoolId && (
              <button
                type="button"
                onClick={() => setShowSubjectForm(!showSubjectForm)}
                className="text-sm text-purple-600 hover:text-purple-700"
              >
                + Create Subject
              </button>
            )}
          </div>

          {showSubjectForm && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
              <input
                type="text"
                placeholder="Subject Name (e.g., Mathematics)"
                value={subjectFormData.name}
                onChange={(e) => setSubjectFormData({...subjectFormData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                placeholder="Subject Code (e.g., MATH101)"
                value={subjectFormData.code}
                onChange={(e) => setSubjectFormData({...subjectFormData, code: e.target.value.toUpperCase()})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCreateSubject}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowSubjectForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
            disabled={!formData.schoolId}
          >
            <option value="">-- Select Subject --</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name} ({subject.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Assessment Date *
          </label>
          <input
            type="date"
            required
            value={formData.date}
            onChange={(e) => setFormData({...formData, date: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
          />
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Assessment"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
