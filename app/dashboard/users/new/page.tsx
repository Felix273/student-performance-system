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

interface Student {
  id: string
  name: string
  admissionNo: string
  userId?: string | null
  class: {
    name: string
  }
}

export default function NewUserPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [schools, setSchools] = useState<School[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [classQuery, setClassQuery] = useState("")
  const [studentQuery, setStudentQuery] = useState("")
  
  // Password utilities
  const [showPassword, setShowPassword] = useState(true)
  const [copied, setCopied] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "TEACHER",
    schoolId: "",
    classIds: [] as string[],
    studentIds: [] as string[]
  })

  useEffect(() => {
    fetchSession()
  }, [])

  useEffect(() => {
    if (formData.schoolId) {
      fetchClasses(formData.schoolId)
      fetchStudents(formData.schoolId)
    }
  }, [formData.schoolId])

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" })
      const session = await res.json()
      
      if (session?.user?.role === "SUPER_ADMIN") {
        setIsSuperAdmin(true)
        fetchSchools()
      } else if (session?.user?.schoolId) {
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
        setSchools(data.schools || data || [])
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

  const fetchStudents = async (schoolId: string) => {
    try {
      const res = await fetch(`/api/students?schoolId=${schoolId}`)
      if (res.ok) {
        const data = await res.json()
        setStudents(data)
      }
    } catch (err) {
      console.error("Failed to fetch students", err)
    }
  }

  const generatePassword = () => {
    const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ"
    const lowercase = "abcdefghjkmnpqrstuvwxyz"
    const numbers = "23456789"
    const special = "#$@!"
    const all = uppercase + lowercase + numbers + special

    let pwd = ""
    pwd += uppercase.charAt(Math.floor(Math.random() * uppercase.length))
    pwd += lowercase.charAt(Math.floor(Math.random() * lowercase.length))
    pwd += numbers.charAt(Math.floor(Math.random() * numbers.length))
    pwd += special.charAt(Math.floor(Math.random() * special.length))

    for (let i = 0; i < 6; i++) {
      pwd += all.charAt(Math.floor(Math.random() * all.length))
    }

    setFormData(prev => ({ ...prev, password: pwd }))
    setShowPassword(true)
  }

  const copyPassword = async () => {
    if (!formData.password) return
    try {
      await navigator.clipboard.writeText(formData.password)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  const toggleClass = (classId: string) => {
    setFormData(prev => ({
      ...prev,
      classIds: prev.classIds.includes(classId)
        ? prev.classIds.filter(id => id !== classId)
        : [...prev.classIds, classId]
    }))
  }

  const toggleStudent = (studentId: string) => {
    setFormData(prev => ({
      ...prev,
      studentIds: prev.studentIds.includes(studentId)
        ? prev.studentIds.filter(id => id !== studentId)
        : prev.role === "STUDENT"
          ? [studentId]
          : [...prev.studentIds, studentId]
    }))
  }

  const filteredClasses = classes.filter((cls) => `${cls.name} ${cls.grade}`.toLowerCase().includes(classQuery.toLowerCase()))
  const availableStudents = students.filter((student) => formData.role !== "STUDENT" || !student.userId)
  const filteredStudents = availableStudents.filter((student) => `${student.name} ${student.admissionNo} ${student.class.name}`.toLowerCase().includes(studentQuery.toLowerCase()))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create user")
      }

      router.push("/dashboard/users")
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create user")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-7 pb-10 animate-fade-in">
      <header className="border-b border-[#e0e2e8] pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#4262ff]">People & access</p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[#1c1c1e]">Add a user</h1>
            <p className="mt-1 text-sm text-[#6b6f7e]">Create a school account and connect it to classes or learners.</p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#fff4c4] px-3 py-1.5 text-xs font-semibold text-[#746019]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#c49312]" /> School account
          </span>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="overflow-hidden rounded-2xl border border-[#e0e2e8] bg-white shadow-[0_8px_30px_rgba(28,28,30,.04)]">
        {/* Step 1: Role */}
        <section className="border-b border-[#eef0f3] p-5 sm:p-7">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#8e91a0]">01 · Account type</p>
              <h2 className="mt-1 text-lg font-semibold text-[#1c1c1e]">Choose a role</h2>
            </div>
            <span className="text-xs font-medium text-[#8e91a0]">Required</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3" role="group" aria-label="User role">
            {[
              { role: "TEACHER", letter: "T", title: "Teacher", detail: "Classes and learning plans", color: "#187574", tint: "#e5f7f3" },
              { role: "PARENT", letter: "P", title: "Parent", detail: "Linked learner updates", color: "#80651c", tint: "#fff4d9" },
              { role: "STUDENT", letter: "S", title: "Student", detail: "Learner portal access", color: "#4262ff", tint: "#e7edff" },
            ].map((option) => (
              <button
                key={option.role}
                type="button"
                aria-pressed={formData.role === option.role}
                onClick={() => setFormData({ ...formData, role: option.role, classIds: [], studentIds: [] })}
                className={`flex min-h-23 items-center gap-3 rounded-xl border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4262ff] ${
                  formData.role === option.role
                    ? "border-[#4262ff] bg-[#f5f7ff] shadow-[inset_0_0_0_1px_#4262ff]"
                    : "border-[#e0e2e8] hover:border-[#aeb5c4] hover:bg-[#fafbfc]"
                }`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold" style={{ color: option.color, backgroundColor: option.tint }}>
                  {option.letter}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[#1c1c1e]">{option.title}</span>
                  <span className="mt-1 block text-xs text-[#6b6f7e]">{option.detail}</span>
                </span>
                <span className={`ml-auto flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${formData.role === option.role ? "border-[#4262ff]" : "border-[#c7cad5]"}`}>
                  {formData.role === option.role && <span className="h-2 w-2 rounded-full bg-[#4262ff]" />}
                </span>
              </button>
            ))}
          </div>
        </section>

        {isSuperAdmin && (
          <section className="border-b border-[#eef0f3] p-5 sm:p-7">
            <label className="block text-xs font-semibold text-[#4f5664]" htmlFor="user-school">
              School <span className="text-[#c83b46]">*</span>
            </label>
            <select
              id="user-school"
              required
              value={formData.schoolId}
              onChange={(e) => setFormData({ ...formData, schoolId: e.target.value, classIds: [], studentIds: [] })}
              className="mt-2 min-h-11 w-full rounded-lg border border-[#c7cad5] bg-white px-3 text-sm text-[#1c1c1e] outline-none focus:border-[#4262ff] focus:ring-3 focus:ring-[#4262ff]/10"
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

        {/* Step 2: Sign-in details with Password Generator */}
        <section className="border-b border-[#eef0f3] p-5 sm:p-7">
          <div className="mb-5">
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#8e91a0]">02 · Sign-in details</p>
            <h2 className="mt-1 text-lg font-semibold text-[#1c1c1e]">Account information</h2>
          </div>
          <div className="grid gap-x-5 gap-y-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[#4f5664]">
                Full name <span className="text-[#c83b46]">*</span>
              </span>
              <input
                type="text"
                required
                autoComplete="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="min-h-11 w-full rounded-lg border border-[#c7cad5] bg-white px-3 text-sm text-[#1c1c1e] outline-none placeholder:text-[#a5a8b5] focus:border-[#4262ff] focus:ring-3 focus:ring-[#4262ff]/10"
                placeholder="e.g. Jane Wanjiku"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[#4f5664]">
                Email address <span className="text-[#c83b46]">*</span>
              </span>
              <input
                type="email"
                required
                autoComplete="new-username"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="min-h-11 w-full rounded-lg border border-[#c7cad5] bg-white px-3 text-sm text-[#1c1c1e] outline-none placeholder:text-[#a5a8b5] focus:border-[#4262ff] focus:ring-3 focus:ring-[#4262ff]/10"
                placeholder="name@school.org"
              />
            </label>

            <div className="block md:col-span-2">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-semibold text-[#4f5664]">
                  Temporary password <span className="text-[#c83b46]">*</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="rounded-full bg-[#f0f4ff] px-2.5 py-1 text-[11px] font-bold text-[#4262ff] transition hover:bg-[#e0eaff]"
                  >
                    ⚡ Generate Password
                  </button>
                  {formData.password && (
                    <button
                      type="button"
                      onClick={copyPassword}
                      className="rounded-full border border-[#e0e2e8] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#4f5664] transition hover:bg-[#f5f6f8]"
                    >
                      {copied ? "✓ Copied!" : "📋 Copy"}
                    </button>
                  )}
                </div>
              </div>

              <div className="relative md:max-w-[calc(50%-10px)]">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="min-h-11 w-full rounded-lg border border-[#c7cad5] bg-white px-3 pr-16 font-mono text-sm text-[#1c1c1e] outline-none placeholder:text-[#a5a8b5] focus:border-[#4262ff] focus:ring-3 focus:ring-[#4262ff]/10"
                  placeholder="At least 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-xs font-semibold text-[#6b6f7e] hover:text-[#1c1c1e]"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              <span className="mt-1.5 block text-xs text-[#8e91a0]">
                Share this temporary password with the user. They will be prompted to change it immediately after signing in.
              </span>
            </div>
          </div>
        </section>

        {/* Teacher: Assign Classes */}
        {formData.role === "TEACHER" && formData.schoolId && classes.length > 0 && (
          <section className="border-b border-[#eef0f3] p-5 sm:p-7">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#8e91a0]">03 · Teaching access</p>
                <h2 className="mt-1 text-lg font-semibold text-[#1c1c1e]">
                  Assign classes <span className="text-sm font-normal text-[#8e91a0]">Optional</span>
                </h2>
              </div>
              <span className="w-fit rounded-full bg-[#e5f7f3] px-3 py-1.5 text-xs font-semibold text-[#187574]">
                {formData.classIds.length} selected
              </span>
            </div>
            <label className="relative block">
              <span className="sr-only">Search classes</span>
              <input
                type="search"
                value={classQuery}
                onChange={(event) => setClassQuery(event.target.value)}
                placeholder="Search by class or grade"
                className="min-h-10 w-full rounded-lg border border-[#c7cad5] bg-[#fafbfc] px-3 text-sm outline-none placeholder:text-[#8e91a0] focus:border-[#4262ff] focus:bg-white sm:max-w-sm"
              />
            </label>
            <div className="mt-3 grid max-h-64 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
              {filteredClasses.map((cls) => (
                <label
                  key={cls.id}
                  className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition ${
                    formData.classIds.includes(cls.id)
                      ? "border-[#7bbdb5] bg-[#f2faf8]"
                      : "border-[#e5e8ec] hover:border-[#bdc5cf] hover:bg-[#fafbfc]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.classIds.includes(cls.id)}
                    onChange={() => toggleClass(cls.id)}
                    className="h-4 w-4 shrink-0 accent-[#187574]"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-[#273333]">{cls.name}</span>
                    <span className="block text-xs text-[#8e91a0]">{cls.grade}</span>
                  </span>
                </label>
              ))}
              {filteredClasses.length === 0 && (
                <p className="py-5 text-sm text-[#8e91a0] sm:col-span-2 lg:col-span-3">No classes match that search.</p>
              )}
            </div>
          </section>
        )}

        {/* Parent: Link Students */}
        {formData.role === "PARENT" && formData.schoolId && students.length > 0 && (
          <section className="border-b border-[#eef0f3] p-5 sm:p-7">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#8e91a0]">03 · Family access</p>
                <h2 className="mt-1 text-lg font-semibold text-[#1c1c1e]">
                  Link learners <span className="text-sm font-normal text-[#8e91a0]">Optional</span>
                </h2>
              </div>
              <span className="w-fit rounded-full bg-[#fff4d9] px-3 py-1.5 text-xs font-semibold text-[#80651c]">
                {formData.studentIds.length} selected
              </span>
            </div>
            <input
              type="search"
              aria-label="Search learners"
              value={studentQuery}
              onChange={(event) => setStudentQuery(event.target.value)}
              placeholder="Search name, admission number, or class"
              className="min-h-10 w-full rounded-lg border border-[#c7cad5] bg-[#fafbfc] px-3 text-sm outline-none placeholder:text-[#8e91a0] focus:border-[#4262ff] focus:bg-white sm:max-w-md"
            />
            <div className="mt-3 grid max-h-64 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {filteredStudents.map((student) => (
                <label
                  key={student.id}
                  className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition ${
                    formData.studentIds.includes(student.id)
                      ? "border-[#e2c45d] bg-[#fffbeb]"
                      : "border-[#e5e8ec] hover:border-[#bdc5cf] hover:bg-[#fafbfc]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.studentIds.includes(student.id)}
                    onChange={() => toggleStudent(student.id)}
                    className="h-4 w-4 shrink-0 accent-[#a77d05]"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-[#273333]">{student.name}</span>
                    <span className="block truncate text-xs text-[#8e91a0]">
                      {student.class.name} · {student.admissionNo}
                    </span>
                  </span>
                </label>
              ))}
              {filteredStudents.length === 0 && (
                <p className="py-5 text-sm text-[#8e91a0] sm:col-span-2">No learners match that search.</p>
              )}
            </div>
          </section>
        )}

        {/* Student: Link Record */}
        {formData.role === "STUDENT" && formData.schoolId && (
          <section className="border-b border-[#eef0f3] p-5 sm:p-7">
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#8e91a0]">03 · Learner access</p>
              <h2 className="mt-1 text-lg font-semibold text-[#1c1c1e]">
                Connect a learner record <span className="text-sm font-normal text-[#c83b46]">* Required</span>
              </h2>
              <p className="mt-1 text-xs text-[#6b6f7e]">Choose the learner profile this account will use.</p>
            </div>
            <input
              type="search"
              aria-label="Search learners"
              value={studentQuery}
              onChange={(event) => setStudentQuery(event.target.value)}
              placeholder="Search name, admission number, or class"
              className="min-h-10 w-full rounded-lg border border-[#c7cad5] bg-[#fafbfc] px-3 text-sm outline-none placeholder:text-[#8e91a0] focus:border-[#4262ff] focus:bg-white sm:max-w-md"
            />
            <div className="mt-3 grid max-h-64 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {filteredStudents.map((student) => (
                <label
                  key={student.id}
                  className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition ${
                    formData.studentIds.includes(student.id)
                      ? "border-[#4262ff] bg-[#f5f7ff]"
                      : "border-[#e5e8ec] hover:border-[#bdc5cf] hover:bg-[#fafbfc]"
                  }`}
                >
                  <input
                    type="radio"
                    name="linkedStudent"
                    checked={formData.studentIds.includes(student.id)}
                    onChange={() => setFormData((current) => ({ ...current, studentIds: [student.id] }))}
                    className="h-4 w-4 shrink-0 accent-[#4262ff]"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-[#273333]">{student.name}</span>
                    <span className="block truncate text-xs text-[#8e91a0]">
                      {student.class.name} · {student.admissionNo}
                    </span>
                  </span>
                </label>
              ))}
              {filteredStudents.length === 0 && (
                <p className="py-5 text-sm text-[#8e91a0] sm:col-span-2">
                  {availableStudents.length === 0
                    ? "All learner records already have linked accounts."
                    : "No learners match that search."}
                </p>
              )}
            </div>
          </section>
        )}

        {error && (
          <div role="alert" className="mx-5 mt-5 rounded-lg border border-[#f0b7bb] bg-[#fff5f5] px-4 py-3 text-sm font-medium text-[#9b3030] sm:mx-7">
            {error}
          </div>
        )}

        <footer className="flex flex-col-reverse gap-3 bg-[#fafbfc] p-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <p className="text-xs text-[#8e91a0]">
            Fields marked <span className="font-semibold text-[#c83b46]">*</span> are required.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="min-h-11 rounded-lg border border-[#c7cad5] bg-white px-5 text-sm font-semibold text-[#4f5664] transition hover:bg-[#f5f6f8]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.schoolId || (formData.role === "STUDENT" && formData.studentIds.length !== 1)}
              className="min-h-11 min-w-44 rounded-lg bg-[#1c1c1e] px-5 text-sm font-semibold text-white transition hover:bg-[#303038] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Creating account…"
                : `Create ${formData.role === "TEACHER" ? "teacher" : formData.role === "STUDENT" ? "student" : "parent"}`}
            </button>
          </div>
        </footer>
      </form>
    </div>
  )
}
