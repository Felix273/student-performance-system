import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/authorization"

export async function GET() {
  const session = await auth()
  const access = requireRole(session, ["SCHOOL_ADMIN"])
  if (!access.ok) return access.response
  const schoolId = access.role === "SCHOOL_ADMIN" ? access.user.schoolId : undefined

  const [teachers, classes, subjects, assignments] = await Promise.all([
    prisma.user.findMany({
      where: { role: "TEACHER", ...(schoolId ? { schoolId } : {}) },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.class.findMany({
      where: schoolId ? { schoolId } : undefined,
      select: { id: true, name: true, grade: true },
      orderBy: { name: "asc" },
    }),
    prisma.subject.findMany({
      where: schoolId ? { schoolId } : undefined,
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    prisma.teacherClass.findMany({
      where: schoolId ? { class: { schoolId } } : undefined,
      select: {
        id: true,
        teacherId: true,
        classId: true,
        subjectId: true,
        teacher: { select: { id: true, name: true, email: true } },
        class: { select: { id: true, name: true, grade: true } },
        subject: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ])
  return NextResponse.json({ teachers, classes, subjects, assignments })
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SCHOOL_ADMIN"])
    if (!access.ok) return access.response

    const body = await request.json()
    const teacherId = typeof body.teacherId === "string" ? body.teacherId : ""
    const classId = typeof body.classId === "string" ? body.classId : ""
    const subjectId = typeof body.subjectId === "string" && body.subjectId.trim() ? body.subjectId.trim() : null

    if (!teacherId || !classId) {
      return NextResponse.json({ error: "Teacher and class are required" }, { status: 400 })
    }

    const [teacher, classData, subject] = await Promise.all([
      prisma.user.findUnique({ where: { id: teacherId }, select: { id: true, role: true, schoolId: true } }),
      prisma.class.findUnique({ where: { id: classId }, select: { id: true, schoolId: true } }),
      subjectId ? prisma.subject.findUnique({ where: { id: subjectId }, select: { id: true, schoolId: true } }) : null,
    ])

    if (!teacher || teacher.role !== "TEACHER" || !classData) {
      return NextResponse.json({ error: "Teacher or class not found" }, { status: 404 })
    }
    if (teacher.schoolId !== access.user.schoolId || classData.schoolId !== access.user.schoolId) {
      return NextResponse.json({ error: "Teacher and class must belong to your school" }, { status: 403 })
    }
    if (subject && subject.schoolId !== access.user.schoolId) {
      return NextResponse.json({ error: "Subject must belong to your school" }, { status: 400 })
    }

    // Check if duplicate assignment exists
    const duplicate = await prisma.teacherClass.findFirst({
      where: { teacherId, classId, subjectId },
    })
    if (duplicate) {
      return NextResponse.json(
        { error: subjectId ? "This teacher is already assigned to this subject in this class." : "This teacher is already the Class Teacher for this class." },
        { status: 409 }
      )
    }

    // If assigning as Class Teacher (subjectId === null), transfer homeroom leadership cleanly
    if (subjectId === null) {
      await prisma.teacherClass.deleteMany({
        where: { classId, subjectId: null },
      })
    }

    const assignment = await prisma.teacherClass.create({
      data: { teacherId, classId, subjectId },
      include: {
        teacher: { select: { id: true, name: true, email: true } },
        class: { select: { id: true, name: true, grade: true } },
        subject: { select: { id: true, name: true, code: true } },
      },
    })

    return NextResponse.json(assignment, { status: 201 })
  } catch (error: unknown) {
    console.error("Teacher assignment creation error:", error)
    return NextResponse.json({ error: "Unable to save teacher assignment" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SCHOOL_ADMIN"])
    if (!access.ok) return access.response

    const body = await request.json()
    const { id, teacherId, classId, subjectId: rawSubjectId } = body

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Assignment ID is required" }, { status: 400 })
    }

    const currentAssignment = await prisma.teacherClass.findUnique({
      where: { id },
      include: { class: { select: { schoolId: true } } },
    })

    if (!currentAssignment || currentAssignment.class.schoolId !== access.user.schoolId) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    }

    const targetTeacherId = typeof teacherId === "string" ? teacherId : currentAssignment.teacherId
    const targetClassId = typeof classId === "string" ? classId : currentAssignment.classId
    const targetSubjectId =
      rawSubjectId === "" || rawSubjectId === null
        ? null
        : typeof rawSubjectId === "string"
        ? rawSubjectId.trim()
        : currentAssignment.subjectId

    // Validate relationships
    const [teacher, classData, subject] = await Promise.all([
      prisma.user.findUnique({ where: { id: targetTeacherId }, select: { id: true, role: true, schoolId: true } }),
      prisma.class.findUnique({ where: { id: targetClassId }, select: { id: true, schoolId: true } }),
      targetSubjectId ? prisma.subject.findUnique({ where: { id: targetSubjectId }, select: { id: true, schoolId: true } }) : null,
    ])

    if (!teacher || teacher.role !== "TEACHER" || !classData) {
      return NextResponse.json({ error: "Teacher or class not found" }, { status: 404 })
    }
    if (teacher.schoolId !== access.user.schoolId || classData.schoolId !== access.user.schoolId) {
      return NextResponse.json({ error: "Teacher and class must belong to your school" }, { status: 403 })
    }
    if (subject && subject.schoolId !== access.user.schoolId) {
      return NextResponse.json({ error: "Subject must belong to your school" }, { status: 400 })
    }

    // Check duplicate if values changed
    const duplicate = await prisma.teacherClass.findFirst({
      where: {
        teacherId: targetTeacherId,
        classId: targetClassId,
        subjectId: targetSubjectId,
        NOT: { id },
      },
    })
    if (duplicate) {
      return NextResponse.json(
        { error: targetSubjectId ? "This teacher is already assigned to this subject in that class." : "This teacher is already the Class Teacher for that class." },
        { status: 409 }
      )
    }

    // If changing to Class Teacher, ensure previous homeroom record for that class is updated
    if (targetSubjectId === null) {
      await prisma.teacherClass.deleteMany({
        where: { classId: targetClassId, subjectId: null, NOT: { id } },
      })
    }

    const updated = await prisma.teacherClass.update({
      where: { id },
      data: {
        teacherId: targetTeacherId,
        classId: targetClassId,
        subjectId: targetSubjectId,
      },
      include: {
        teacher: { select: { id: true, name: true, email: true } },
        class: { select: { id: true, name: true, grade: true } },
        subject: { select: { id: true, name: true, code: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Teacher assignment update error:", error)
    return NextResponse.json({ error: "Unable to update teacher assignment" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SCHOOL_ADMIN"])
    if (!access.ok) return access.response

    const id = request.nextUrl.searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Assignment ID is required" }, { status: 400 })

    const assignment = await prisma.teacherClass.findUnique({
      where: { id },
      select: { id: true, class: { select: { schoolId: true } } },
    })

    if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    if (assignment.class.schoolId !== access.user.schoolId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    await prisma.teacherClass.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Teacher assignment deletion error:", error)
    return NextResponse.json({ error: "Unable to remove teacher assignment" }, { status: 500 })
  }
}
