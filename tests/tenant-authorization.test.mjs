import test from "node:test"
import assert from "node:assert/strict"

// Pure simulation logic corresponding to lib/authorization.ts rules
function requireRole(session, allowedRoles) {
  if (!session?.user?.id || !allowedRoles.includes(session.user.role)) {
    return { ok: false, error: "Unauthorized or role not allowed" }
  }
  if (session.user.role !== "SUPER_ADMIN" && !session.user.schoolId) {
    return { ok: false, error: "Your account is not assigned to a school" }
  }
  return { ok: true, user: session.user, role: session.user.role }
}

function checkClassAccess(session, classData) {
  const req = requireRole(session, ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "PARENT", "STUDENT"])
  if (!req.ok) return req

  if (!classData) return { ok: false, error: "Class not found" }
  if (req.role === "SUPER_ADMIN") return { ok: true }
  if (req.role === "SCHOOL_ADMIN" && classData.schoolId === req.user.schoolId) return { ok: true }
  if (req.role === "TEACHER" && classData.schoolId === req.user.schoolId && classData.teacherIds.includes(req.user.id)) {
    return { ok: true }
  }
  return { ok: false, error: "Forbidden" }
}

function checkStudentAccess(session, studentData) {
  const req = requireRole(session, ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "PARENT", "STUDENT"])
  if (!req.ok) return req

  if (!studentData) return { ok: false, error: "Student not found" }
  if (req.role === "SUPER_ADMIN") return { ok: true }
  if (req.role === "SCHOOL_ADMIN" && studentData.schoolId === req.user.schoolId) return { ok: true }
  if (req.role === "PARENT" && studentData.schoolId === req.user.schoolId && studentData.parentIds.includes(req.user.id)) {
    return { ok: true }
  }
  if (req.role === "TEACHER" && studentData.schoolId === req.user.schoolId && studentData.classTeacherIds.includes(req.user.id)) {
    return { ok: true }
  }
  return { ok: false, error: "Forbidden" }
}

test("teacher cannot access class outside assigned school", () => {
  const session = { user: { id: "teacher-1", role: "TEACHER", schoolId: "school-A" } }
  const classData = { id: "class-1", schoolId: "school-B", teacherIds: ["teacher-1"] }
  const res = checkClassAccess(session, classData)
  assert.equal(res.ok, false)
  assert.equal(res.error, "Forbidden")
})

test("teacher cannot access unassigned class within same school", () => {
  const session = { user: { id: "teacher-1", role: "TEACHER", schoolId: "school-A" } }
  const classData = { id: "class-2", schoolId: "school-A", teacherIds: ["teacher-2"] }
  const res = checkClassAccess(session, classData)
  assert.equal(res.ok, false)
  assert.equal(res.error, "Forbidden")
})

test("teacher can access assigned class in same school", () => {
  const session = { user: { id: "teacher-1", role: "TEACHER", schoolId: "school-A" } }
  const classData = { id: "class-1", schoolId: "school-A", teacherIds: ["teacher-1"] }
  const res = checkClassAccess(session, classData)
  assert.equal(res.ok, true)
})

test("teacher cannot access student in unassigned class or cross school", () => {
  const session = { user: { id: "teacher-1", role: "TEACHER", schoolId: "school-A" } }
  const studentDiffSchool = { id: "student-1", schoolId: "school-B", parentIds: [], classTeacherIds: ["teacher-1"] }
  const studentUnassignedClass = { id: "student-2", schoolId: "school-A", parentIds: [], classTeacherIds: ["teacher-2"] }
  const studentAssigned = { id: "student-3", schoolId: "school-A", parentIds: [], classTeacherIds: ["teacher-1"] }

  assert.equal(checkStudentAccess(session, studentDiffSchool).ok, false)
  assert.equal(checkStudentAccess(session, studentUnassignedClass).ok, false)
  assert.equal(checkStudentAccess(session, studentAssigned).ok, true)
})
