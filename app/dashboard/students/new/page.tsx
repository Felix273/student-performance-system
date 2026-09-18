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
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Add New Student</h2>
        <p className="text-gray-600 mt-1">Enter student information</p>
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
              onChange={(e) => setFormData({...formData, schoolId: e.target.value, classId: ""})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
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
            Student Name *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
            placeholder="e.g., John Doe"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Admission Number *
          </label>
          <input
            type="text"
            required
            value={formData.admissionNo}
            onChange={(e) => setFormData({...formData, admissionNo: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
            placeholder="e.g., 2024001"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Class *
            </label>
            {formData.schoolId && (
              <button
                type="button"
                onClick={() => setShowClassForm(!showClassForm)}
                className="text-sm text-green-600 hover:text-green-700"
              >
                + Create Class
              </button>
            )}
          </div>

          {showClassForm && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
              <input
                type="text"
                placeholder="Class Name (e.g., Grade 10A)"
                value={classFormData.name}
                onChange={(e) => setClassFormData({...classFormData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                placeholder="Grade (e.g., 10)"
                value={classFormData.grade}
                onChange={(e) => setClassFormData({...classFormData, grade: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCreateClass}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowClassForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <select
            required
            value={formData.classId}
            onChange={(e) => setFormData({...formData, classId: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
            disabled={!formData.schoolId}
          >
            <option value="">-- Select Class --</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} (Grade {cls.grade})
              </option>
            ))}
          </select>
          {!formData.schoolId && (
            <p className="text-xs text-gray-500 mt-1">Select a school first</p>
          )}
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
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Student"}
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
