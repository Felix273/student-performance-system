import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"

const mapInclude = {
  academicYear: { select: { id: true, name: true } },
  class: { select: { id: true, name: true, grade: true } },
  subject: { select: { id: true, name: true, code: true } },
  bands: { orderBy: { sequence: "asc" as const } },
}

export async function GET() {
  const session = await auth()
  const access = requireRole(session, ["SCHOOL_ADMIN", "TEACHER"])
  if (!access.ok) return access.response
  const schoolId = access.user.schoolId
  if (!schoolId) return NextResponse.json({ error: "School context required" }, { status: 403 })
  const isAdmin = access.role === "SCHOOL_ADMIN"

  const [academicYears, classes, subjects, teacherAssignments] = await Promise.all([
    prisma.academicYear.findMany({ where: { schoolId }, select: { id: true, name: true }, orderBy: { name: "desc" } }),
    prisma.class.findMany({ where: isAdmin ? { schoolId } : { schoolId, teachers: { some: { teacherId: access.user.id } } }, select: { id: true, name: true, grade: true }, orderBy: { name: "asc" } }),
    prisma.subject.findMany({ where: isAdmin ? { schoolId } : { schoolId, teachers: { some: { teacherId: access.user.id } } }, select: { id: true, name: true, code: true }, orderBy: { name: "asc" } }),
    prisma.teacherClass.findMany({ where: { teacherId: access.user.id, class: { schoolId } }, select: { classId: true, subjectId: true, class: { select: { id: true, name: true, grade: true } }, subject: { select: { id: true, name: true, code: true } } }, orderBy: [{ class: { name: "asc" } }, { subject: { name: "asc" } }] }),
  ])
  const assignedPairs = isAdmin ? [] : teacherAssignments.map((item) => ({ scopeCode: item.classId, subjectCode: item.subjectId || "" }))
  const mapWhere = isAdmin
    ? { schoolId }
    : { schoolId, scope: "CLASS" as const, OR: assignedPairs.length ? assignedPairs : [{ scopeCode: "", subjectCode: "__no_assignment__" }] }
  const maps = await prisma.cbcPerformanceBandMap.findMany({ where: mapWhere, include: mapInclude, orderBy: [{ academicYear: { name: "desc" } }, { scope: "asc" }, { scopeCode: "asc" }, { subjectCode: "asc" }] })
  const teacherClassOptions = isAdmin ? [] : [...new Map(teacherAssignments.map((item) => [item.class.id, item.class])).values()]
  const teacherSubjectAssignments = isAdmin ? [] : teacherAssignments.map((item) => ({ classId: item.classId, subject: item.subject }))
  return NextResponse.json({ academicYears, classes, subjects, teacherClassOptions, teacherSubjectAssignments, maps, canManageSchoolScopes: isAdmin })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  const access = requireRole(session, ["SCHOOL_ADMIN", "TEACHER"])
  if (!access.ok) return access.response
  const schoolId = access.user.schoolId
  if (!schoolId) return NextResponse.json({ error: "School context required" }, { status: 403 })
  const isAdmin = access.role === "SCHOOL_ADMIN"

  const body: unknown = await request.json()
  if (typeof body !== "object" || body === null) return NextResponse.json({ error: "Invalid map configuration" }, { status: 400 })
  const input = body as { academicYearId?: unknown; scope?: unknown; scopeCode?: unknown; classId?: unknown; subjectId?: unknown }
  if (typeof input.academicYearId !== "string" || !["SCHOOL", "STAGE", "GRADE", "CLASS"].includes(String(input.scope))) {
    return NextResponse.json({ error: "Academic year and map scope are required" }, { status: 400 })
  }

  const scope = input.scope as "SCHOOL" | "STAGE" | "GRADE" | "CLASS"
  if (!isAdmin && scope !== "CLASS") return NextResponse.json({ error: "Teachers can configure maps only for their assigned classes" }, { status: 403 })
  const requestedClassId = typeof input.classId === "string" ? input.classId : ""
  const subjectId = typeof input.subjectId === "string" && input.subjectId ? input.subjectId : null
  let scopeCode = typeof input.scopeCode === "string" ? input.scopeCode.trim() : ""
  if (scope === "SCHOOL" && (scopeCode || requestedClassId)) return NextResponse.json({ error: "School-wide maps do not use a class or scope code" }, { status: 400 })
  if ((scope === "STAGE" || scope === "GRADE") && (!scopeCode || requestedClassId)) return NextResponse.json({ error: "Stage and grade maps require a scope code and cannot target a class" }, { status: 400 })
  if (scope === "CLASS" && !requestedClassId) return NextResponse.json({ error: "Choose an assigned class" }, { status: 400 })

  let classId: string | null = null
  if (scope === "CLASS") {
    const classData = await prisma.class.findFirst({ where: { id: requestedClassId, schoolId }, select: { id: true } })
    if (!classData) return NextResponse.json({ error: "Class not found" }, { status: 404 })
    classId = classData.id
    scopeCode = classData.id
    if (!isAdmin) {
      const assignment = await prisma.teacherClass.findFirst({ where: { teacherId: access.user.id, classId, subjectId }, select: { id: true } })
      if (!assignment) return NextResponse.json({ error: "You are not assigned to this class and subject" }, { status: 403 })
    }
  }

  const [academicYear, subject] = await Promise.all([
    prisma.academicYear.findFirst({ where: { id: input.academicYearId, schoolId }, select: { id: true } }),
    subjectId ? prisma.subject.findFirst({ where: { id: subjectId, schoolId }, select: { id: true } }) : null,
  ])
  if (!academicYear) return NextResponse.json({ error: "Academic year not found" }, { status: 404 })
  if (subjectId && !subject) return NextResponse.json({ error: "Subject not found" }, { status: 404 })

  try {
    const map = await prisma.cbcPerformanceBandMap.create({ data: { schoolId, academicYearId: academicYear.id, classId, subjectId, subjectCode: subjectId || "", scope, scopeCode }, include: mapInclude })
    return NextResponse.json(map, { status: 201 })
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "A map already exists for this year, scope, and subject" }, { status: 409 })
    }
    throw error
  }
}