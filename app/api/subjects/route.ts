import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import { canAccessClass, schoolScope, requireRole } from "@/lib/authorization"
import { autoPopulateSchoolSubjects } from "@/lib/curriculum/cbcSubjectTemplates"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const access = schoolScope(session, new URL(request.url).searchParams.get("schoolId"))
    if (!access.ok) return access.response

    const schoolId = access.schoolId
    let where = schoolId ? { schoolId } : undefined

    if (access.role === "TEACHER") {
      const classId = request.nextUrl.searchParams.get("classId")
      if (!classId) return NextResponse.json([])
      const classAccess = await canAccessClass(session, classId)
      if (!classAccess.ok) return classAccess.response
      const assignments = await prisma.teacherClass.findMany({
        where: { teacherId: access.user.id, classId },
        select: { subjectId: true },
      })
      const subjectIds = assignments.flatMap((assignment) =>
        assignment.subjectId ? [assignment.subjectId] : []
      )
      const hasClassWideAssignment = assignments.some((assignment) => assignment.subjectId === null)
      where = { schoolId, ...(hasClassWideAssignment ? {} : { id: { in: subjectIds } }) }
    }

    let subjects = await prisma.subject.findMany({
      where,
      select: {
        id: true,
        name: true,
        code: true,
        schoolId: true,
        _count: { select: { teachers: true, assessments: true } },
      },
      orderBy: { name: "asc" },
    })

    // If school has zero subjects, automatically populate Kenya CBC learning areas!
    if (subjects.length === 0 && schoolId && access.role === "SCHOOL_ADMIN") {
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { schoolLevel: true },
      })
      await autoPopulateSchoolSubjects(schoolId, school?.schoolLevel)
      subjects = await prisma.subject.findMany({
        where,
        select: {
          id: true,
          name: true,
          code: true,
          schoolId: true,
          _count: { select: { teachers: true, assessments: true } },
        },
        orderBy: { name: "asc" },
      })
    }

    return NextResponse.json(subjects)
  } catch (error) {
    console.error("Subject fetch error:", error)
    return NextResponse.json({ error: "Unable to load subjects" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SCHOOL_ADMIN"])
    if (!access.ok) return access.response

    const body = await request.json()
    const schoolId = access.user.schoolId
    if (!schoolId) return NextResponse.json({ error: "School not assigned" }, { status: 400 })

    // If requested to auto-populate
    if (body.autoPopulate) {
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { schoolLevel: true },
      })
      const populated = await autoPopulateSchoolSubjects(schoolId, school?.schoolLevel)
      return NextResponse.json({
        message: `Successfully populated ${populated.length} CBC learning areas.`,
        subjects: populated,
      })
    }

    const { name, code } = body
    if (!name || !code) {
      return NextResponse.json({ error: "Subject name and code are required" }, { status: 400 })
    }

    const trimmedName = String(name).trim()
    const trimmedCode = String(code).trim().toUpperCase().replace(/\s+/g, "_")

    const existing = await prisma.subject.findUnique({
      where: { schoolId_code: { schoolId, code: trimmedCode } },
    })
    if (existing) {
      return NextResponse.json({ error: `Subject code ${trimmedCode} already exists` }, { status: 409 })
    }

    const subject = await prisma.subject.create({
      data: {
        name: trimmedName,
        code: trimmedCode,
        schoolId,
      },
      select: {
        id: true,
        name: true,
        code: true,
        schoolId: true,
        _count: { select: { teachers: true, assessments: true } },
      },
    })

    return NextResponse.json(subject, { status: 201 })
  } catch (error) {
    console.error("Subject creation error:", error)
    return NextResponse.json({ error: "Unable to create subject" }, { status: 500 })
  }
}
