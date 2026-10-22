"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import TeacherAssignmentsClient from "../teacher-assignments/TeacherAssignmentsClient"

type TeacherClassItem = {
  id: string
  class: { id: string; name: string; grade: string }
  subject?: { id: string; name: string } | null
}

type UserRecord = {
  id: string
  name: string
  email: string
  role: "TEACHER" | "PARENT" | "STUDENT"
  isActive: boolean
  teacherClasses: TeacherClassItem[]
  children: Array<{ student: { id: string; name: string } }>
  studentProfile: { id: string; name: string; admissionNo: string } | null
}

type ClassOption = {
  id: string
  name: string
  grade: string
}

export default function UsersDirectoryClient({
  initialUsers,
  classes,
}: {
  initialUsers: UserRecord[]
  classes: ClassOption[]
}) {
  const router = useRouter()
  const [users, setUsers] = useState<UserRecord[]>(initialUsers)
  const [search, setSearch] = useState("")
  const [roleTab, setRoleTab] = useState<"ALL" | "TEACHER" | "PARENT" | "STUDENT">("ALL")
  const [activeHub, setActiveHub] = useState<"directory" | "assignments">("directory")

  // Edit Modal State
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null)
  const [editName, setEditName] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editRole, setEditRole] = useState<"TEACHER" | "PARENT" | "STUDENT">("TEACHER")
  const [editIsActive, setEditIsActive] = useState(true)
  const [editClassIds, setEditClassIds] = useState<string[]>([])
  const [editPassword, setEditPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(false)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789#$@!"
    let pwd = ""
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setEditPassword(pwd)
    setShowPassword(true)
  }

  const copyPassword = async () => {
    if (!editPassword) return
    await navigator.clipboard.writeText(editPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const openEditModal = (u: UserRecord) => {
    setEditingUser(u)
    setEditName(u.name)
    setEditEmail(u.email)
    setEditRole(u.role)
    setEditIsActive(u.isActive)
    setEditClassIds(u.teacherClasses.map((tc) => tc.class?.id || "").filter(Boolean))
    setEditPassword("")
    setShowPassword(false)
    setError("")
    setSuccess("")
  }

  const saveUserEdits = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return
    setSaving(true)
    setError("")
    setSuccess("")

    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          role: editRole,
          isActive: editIsActive,
          password: editPassword || undefined,
          classIds: editRole === "TEACHER" ? editClassIds : undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update user")

      setUsers((prev) =>
        prev.map((u) => {
          if (u.id !== editingUser.id) return u
          return {
            ...u,
            name: editName,
            email: editEmail,
            role: editRole,
            isActive: editIsActive,
            teacherClasses:
              editRole === "TEACHER"
                ? editClassIds.map((cid) => {
                    const foundClass = classes.find((c) => c.id === cid)
                    return {
                      id: `${u.id}-${cid}`,
                      class: {
                        id: cid,
                        name: foundClass?.name || "Class",
                        grade: foundClass?.grade || "",
                      },
                    }
                  })
                : [],
          }
        })
      )

      setSuccess(`Account for "${editName}" updated successfully.`)
      setEditingUser(null)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error saving updates")
    } finally {
      setSaving(false)
    }
  }

  const deleteUser = async (id: string, userName: string) => {
    if (!window.confirm(`Are you sure you want to remove the account for "${userName}"?`)) return
    setSaving(true)
    setError("")
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to delete user")
      setUsers((prev) => prev.filter((u) => u.id !== id))
      setSuccess(`Account for "${userName}" removed.`)
      setEditingUser(null)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error removing user")
    } finally {
      setSaving(false)
    }
  }

  const toggleClass = (classId: string) => {
    setEditClassIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    )
  }

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = search.toLowerCase()
      const matchesSearch = u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      if (!matchesSearch) return false
      if (roleTab !== "ALL" && u.role !== roleTab) return false
      return true
    })
  }, [users, search, roleTab])

  const teachers = users.filter((u) => u.role === "TEACHER")
  const parents = users.filter((u) => u.role === "PARENT")
  const students = users.filter((u) => u.role === "STUDENT")

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Hub Navigation Tabs */}
      <div className="flex border-b border-[#e0e2e8] text-sm font-semibold">
        <button
          type="button"
          onClick={() => setActiveHub("directory")}
          className={`border-b-2 px-5 py-3 transition ${
            activeHub === "directory"
              ? "border-[#1c1c1e] text-[#1c1c1e]"
              : "border-transparent text-[#6b6f7e] hover:text-[#1c1c1e]"
          }`}
        >
          Staff & User Accounts ({users.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveHub("assignments")}
          className={`border-b-2 px-5 py-3 transition ${
            activeHub === "assignments"
              ? "border-[#1c1c1e] text-[#1c1c1e]"
              : "border-transparent text-[#6b6f7e] hover:text-[#1c1c1e]"
          }`}
        >
          Class & Subject Assignments 🏫
        </button>
      </div>

      {activeHub === "assignments" ? (
        <TeacherAssignmentsClient />
      ) : (
        <div className="space-y-8">
          {/* Metrics Row */}
          <section className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[20px] bg-[#fff4c4] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#746019]">Total Accounts</p>
              <p className="mt-3 font-mono text-4xl font-medium text-[#1c1c1e]">{users.length}</p>
              <p className="mt-1 text-xs text-[#746019]">Active school community</p>
            </div>
            <div className="rounded-[20px] bg-[#e7edff] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#4262ff]">Teachers</p>
              <p className="mt-3 font-mono text-4xl font-medium text-[#4262ff]">{teachers.length}</p>
              <p className="mt-1 text-xs text-[#555a6a]">Teaching staff</p>
            </div>
            <div className="rounded-[20px] bg-[#ffd8f4] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#6f35c8]">Parents</p>
              <p className="mt-3 font-mono text-4xl font-medium text-[#6f35c8]">{parents.length}</p>
              <p className="mt-1 text-xs text-[#555a6a]">Family accounts</p>
            </div>
          </section>

          {success && (
            <div role="status" className="rounded-2xl bg-[#c3faf5] px-5 py-4 text-sm font-semibold text-[#187574]">
              {success}
            </div>
          )}

          {/* Directory Section */}
          <section className="miro-surface overflow-hidden">
            <div className="border-b border-[#eef0f3] p-5 sm:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#8e91a0]">Staff & Users</p>
                  <h2 className="mt-1 text-2xl font-medium tracking-tight text-[#1c1c1e]">School Roster</h2>
                </div>
                <Link
                  href="/dashboard/users/new"
                  className="miro-pill inline-flex items-center justify-center bg-[#1c1c1e] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#2c2c34]"
                >
                  + Add User
                </Link>
              </div>

              {/* Filter Bar */}
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or email…"
                  className="w-full rounded-xl border border-[#e0e2e8] bg-white px-3.5 py-2 text-xs outline-none focus:border-[#4262ff] sm:max-w-xs"
                />
                <div className="flex gap-1.5 overflow-x-auto text-xs">
                  {(["ALL", "TEACHER", "PARENT", "STUDENT"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRoleTab(r)}
                      className={`rounded-full px-3 py-1.5 font-semibold transition ${
                        roleTab === r ? "bg-[#1c1c1e] text-white" : "bg-[#f7f8fa] text-[#6b6f7e] hover:bg-[#eef0f3]"
                      }`}
                    >
                      {r === "ALL" ? "All" : r === "TEACHER" ? `Teachers (${teachers.length})` : r === "PARENT" ? `Parents (${parents.length})` : `Students (${students.length})`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* User Rows */}
            <div className="divide-y divide-[#eef0f3]">
              {filteredUsers.length === 0 ? (
                <div className="p-10 text-center text-sm text-[#8e91a0]">
                  No users found matching your search.
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const isTeacher = u.role === "TEACHER"
                  const linked = isTeacher
                    ? Array.from(new Set(u.teacherClasses.map((tc) => tc.class?.name || "Class")))
                    : u.role === "PARENT"
                    ? Array.from(new Set(u.children.map((c) => c.student.name)))
                    : u.studentProfile
                    ? [`${u.studentProfile.name} · ${u.studentProfile.admissionNo}`]
                    : []

                  return (
                    <div
                      key={u.id}
                      className="flex flex-col justify-between gap-4 p-5 transition hover:bg-[#fafbfc] sm:flex-row sm:items-center sm:px-7"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                            isTeacher
                              ? "bg-[#e7edff] text-[#4262ff]"
                              : u.role === "PARENT"
                              ? "bg-[#ffd8f4] text-[#6f35c8]"
                              : "bg-[#d4f5d4] text-[#187574]"
                          }`}
                        >
                          {u.name.charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-bold text-[#1c1c1e]">{u.name}</p>
                            {!u.isActive && (
                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                                Deactivated
                              </span>
                            )}
                          </div>
                          <p className="truncate text-xs text-[#8e91a0]">
                            {u.email} ·{" "}
                            <span className="capitalize font-medium text-[#555a6a]">
                              {u.role.toLowerCase()}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-xs text-[#555a6a]">
                          {linked.length ? (
                            <div className="flex flex-wrap gap-1.5">
                              {linked.slice(0, 3).map((item, idx) => (
                                <span
                                  key={`${u.id}-${item}-${idx}`}
                                  className="miro-pill bg-[#f7f8fa] border border-[#e0e2e8] px-2.5 py-0.5 text-[11px] font-medium text-[#555a6a]"
                                >
                                  {item}
                                </span>
                              ))}
                              {linked.length > 3 && (
                                <span className="px-1 text-xs text-[#8e91a0]">+{linked.length - 3}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[#a5a8b5]">
                              {isTeacher ? "No classes assigned" : "No learners linked"}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => openEditModal(u)}
                          className="rounded-lg border border-[#e0e2e8] bg-white px-3 py-1.5 text-xs font-semibold text-[#1c1c1e] hover:bg-[#f7f8fa] transition shrink-0"
                        >
                          Edit ✏️
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </section>

          {/* Edit User Modal */}
          {editingUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-lg rounded-[24px] bg-white p-6 sm:p-7 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-[#e0e2e8] pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-[#1c1c1e]">Edit Account: {editingUser.name}</h3>
                    <p className="mt-0.5 text-xs text-[#6b6f7e]">Update user profile, status, classes, or credentials.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="text-sm font-bold text-slate-400 hover:text-slate-700"
                  >
                    ✕
                  </button>
                </div>

                {error && (
                  <div role="alert" className="mt-4 rounded-xl bg-[#fff1f1] px-4 py-2.5 text-xs font-semibold text-[#a33a3a]">
                    {error}
                  </div>
                )}

                <form onSubmit={saveUserEdits} className="mt-5 space-y-4">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-[#4f5664]">Full Name</span>
                    <input
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded-xl border border-[#e0e2e8] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#4262ff]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-[#4f5664]">Email Address</span>
                    <input
                      type="email"
                      required
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full rounded-xl border border-[#e0e2e8] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#4262ff]"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-[#4f5664]">Role</span>
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as "TEACHER" | "PARENT" | "STUDENT")}
                        className="w-full rounded-xl border border-[#e0e2e8] bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-[#4262ff]"
                      >
                        <option value="TEACHER">Teacher</option>
                        <option value="PARENT">Parent</option>
                        <option value="STUDENT">Student</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-[#4f5664]">Account Status</span>
                      <select
                        value={editIsActive ? "ACTIVE" : "INACTIVE"}
                        onChange={(e) => setEditIsActive(e.target.value === "ACTIVE")}
                        className="w-full rounded-xl border border-[#e0e2e8] bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-[#4262ff]"
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Deactivated</option>
                      </select>
                    </label>
                  </div>

                  {/* Reset Password Helper */}
                  <div className="rounded-xl border border-[#e0e2e8] bg-[#fbfbfc] p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#4f5664]">Reset Password (Optional)</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={generatePassword}
                          className="rounded-full bg-[#f0f4ff] px-2.5 py-0.5 text-[10px] font-bold text-[#4262ff] hover:bg-[#e0eaff]"
                        >
                          ⚡ Generate
                        </button>
                        {editPassword && (
                          <button
                            type="button"
                            onClick={copyPassword}
                            className="rounded-full border border-[#e0e2e8] bg-white px-2.5 py-0.5 text-[10px] font-semibold text-[#4f5664]"
                          >
                            {copied ? "✓ Copied" : "Copy"}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="relative mt-2">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        placeholder="Leave blank to keep existing password"
                        className="w-full rounded-lg border border-[#c7cad5] bg-white px-3 py-2 pr-14 text-xs font-mono outline-none"
                      />
                      {editPassword && (
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 flex items-center px-2.5 text-[11px] font-semibold text-[#6b6f7e]"
                        >
                          {showPassword ? "Hide" : "Show"}
                        </button>
                      )}
                    </div>
                    <span className="mt-1 block text-[10px] text-[#8e91a0]">
                      If entered, the user will be prompted to change this temporary password upon next sign-in.
                    </span>
                  </div>

                  {/* Assigned Classes (Only for Teachers) */}
                  {editRole === "TEACHER" && (
                    <div>
                      <span className="mb-1.5 block text-xs font-semibold text-[#4f5664]">
                        Assigned Classes ({editClassIds.length} selected)
                      </span>
                      <div className="grid max-h-40 gap-2 overflow-y-auto rounded-xl border border-[#e0e2e8] p-3 sm:grid-cols-2">
                        {classes.map((cls) => (
                          <label
                            key={cls.id}
                            className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-xs transition cursor-pointer ${
                              editClassIds.includes(cls.id)
                                ? "border-[#4262ff] bg-[#f5f7ff] font-semibold text-[#4262ff]"
                                : "border-[#e0e2e8] text-[#555a6a] hover:bg-[#fafbfc]"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={editClassIds.includes(cls.id)}
                              onChange={() => toggleClass(cls.id)}
                              className="h-3.5 w-3.5 rounded accent-[#4262ff]"
                            />
                            <span className="truncate">{cls.name} (Grade {cls.grade})</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-6 flex items-center justify-between border-t border-[#e0e2e8] pt-4">
                    <button
                      type="button"
                      onClick={() => deleteUser(editingUser.id, editingUser.name)}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition"
                    >
                      Delete Account
                    </button>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingUser(null)}
                        className="miro-pill border border-[#e0e2e8] px-4 py-2 text-xs font-semibold text-[#6b6f7e]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="miro-pill bg-[#1c1c1e] px-5 py-2 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        {saving ? "Saving…" : "Save Changes →"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
