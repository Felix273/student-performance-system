import { NextResponse } from "next/server"
import type { Session } from "next-auth"
import { prisma } from "./prisma"

export const ROLES = ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "PARENT", "STUDENT"] as const
export type UserRole = (typeof ROLES)[number]

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value)
}

export function unauthorized(message = "Authentication required") {
  return NextResponse.json({ error: message }, { status: 401 })
}

export function forbidden(message = "You do not have permission to perform this action") {
  return NextResponse.json({ error: message }, { status: 403 })
}

export function requireRole(session: Session | null, roles: readonly UserRole[]) {
  if (!session?.user?.id || !isUserRole(session.user.role)) {
    return { ok: false as const, response: unauthorized() }
  }
  if (!roles.includes(session.user.role)) {
    return { ok: false as const, response: forbidden() }
  }
  if (session.user.role !== "SUPER_ADMIN" && !session.user.schoolId) {
    return { ok: false as const, response: forbidden("Your account is not assigned to a school") }
  }
  return { ok: true as const, user: session.user, role: session.user.role }
}

export function schoolScope(session: Session | null, requestedSchoolId?: string | null) {
  const result = requireRole(session, ROLES)
  if (!result.ok) return result

  if (result.role === "SUPER_ADMIN") {
    return { ok: true as const, schoolId: requestedSchoolId || undefined, user: result.user, role: result.role }
  }

  if (!result.user.schoolId) {
    return { ok: false as const, response: forbidden("Your account is not assigned to a school") }
  }

  return { ok: true as const, schoolId: result.user.schoolId, user: result.user, role: result.role }
}

export async function canAccessClass(session: Session | null, classId: string) {
  const result = requireRole(session, ROLES)
  if (!result.ok) return result

  const classData = await prisma.class.findUnique({
    where: { id: classId },
    select: {
      id: true,
      schoolId: true,
      teachers: { where: { teacherId: result.user.id }, select: { id: true } },
    },
  })
  if (!classData) return { ok: false as const, response: NextResponse.json({ error: "Class not found" }, { status: 404 }) }

  if (result.role === "SUPER_ADMIN") return { ok: true as const, user: result.user, role: result.role, classData }
  if (result.role === "SCHOOL_ADMIN" && classData.schoolId === result.user.schoolId) {
    return { ok: true as const, user: result.user, role: result.role, classData }
  }
  if (result.role === "TEACHER" && classData.schoolId === result.user.schoolId && classData.teachers.length > 0) {
    return { ok: true as const, user: result.user, role: result.role, classData }
  }
  return { ok: false as const, response: forbidden() }
}

export async function canAccessStudent(session: Session | null, studentId: string) {
  const result = requireRole(session, ROLES)
  if (!result.ok) return result

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      schoolId: true,
      classId: true,
      parents: { where: { parentId: result.user.id }, select: { id: true } },
      class: { select: { teachers: { where: { teacherId: result.user.id }, select: { id: true } } } },
    },
  })
  if (!student) return { ok: false as const, response: NextResponse.json({ error: "Student not found" }, { status: 404 }) }

  if (result.role === "SUPER_ADMIN") return { ok: true as const, user: result.user, role: result.role, student }
  if (result.role === "SCHOOL_ADMIN" && student.schoolId === result.user.schoolId) {
    return { ok: true as const, user: result.user, role: result.role, student }
  }
  if (result.role === "PARENT" && student.schoolId === result.user.schoolId && student.parents.length > 0) {
    return { ok: true as const, user: result.user, role: result.role, student }
  }
  if (result.role === "TEACHER" && student.schoolId === result.user.schoolId && student.class.teachers.length > 0) {
    return { ok: true as const, user: result.user, role: result.role, student }
  }
  return { ok: false as const, response: forbidden() }
}
