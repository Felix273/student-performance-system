import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/authorization"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SCHOOL_ADMIN"])
    if (!access.ok) return access.response

    const { id } = await params
    const schoolId = access.user.schoolId
    if (!schoolId) return NextResponse.json({ error: "School not assigned" }, { status: 400 })

    const subject = await prisma.subject.findFirst({
      where: { id, schoolId },
    })
    if (!subject) return NextResponse.json({ error: "Subject not found" }, { status: 404 })

    const body = await request.json()
    const name = typeof body.name === "string" ? body.name.trim() : undefined
    const code = typeof body.code === "string" ? body.code.trim().toUpperCase().replace(/\s+/g, "_") : undefined

    if (name && (name.length < 2 || name.length > 100)) {
      return NextResponse.json({ error: "Subject name must be between 2 and 100 characters" }, { status: 400 })
    }

    if (code && (code.length < 2 || code.length > 20)) {
      return NextResponse.json({ error: "Subject code must be between 2 and 20 characters" }, { status: 400 })
    }

    if (code && code !== subject.code) {
      const duplicate = await prisma.subject.findUnique({
        where: { schoolId_code: { schoolId, code } },
      })
      if (duplicate) {
        return NextResponse.json({ error: `Subject code ${code} is already in use` }, { status: 409 })
      }
    }

    const updated = await prisma.subject.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(code ? { code } : {}),
      },
      select: {
        id: true,
        name: true,
        code: true,
        schoolId: true,
        _count: { select: { teachers: true, assessments: true } },
      },
    })

    return NextResponse.json({ subject: updated, message: "Subject updated successfully" })
  } catch (error) {
    console.error("Subject update error:", error)
    return NextResponse.json({ error: "Unable to update subject" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SCHOOL_ADMIN"])
    if (!access.ok) return access.response

    const { id } = await params
    const schoolId = access.user.schoolId
    if (!schoolId) return NextResponse.json({ error: "School not assigned" }, { status: 400 })

    const subject = await prisma.subject.findFirst({
      where: { id, schoolId },
      include: {
        _count: { select: { assessments: true, teachers: true } },
      },
    })
    if (!subject) return NextResponse.json({ error: "Subject not found" }, { status: 404 })

    if (subject._count.assessments > 0) {
      return NextResponse.json({
        error: `Cannot delete ${subject.name} because it is linked to ${subject._count.assessments} recorded assessment(s).`,
      }, { status: 400 })
    }

    // Clean up teacher assignments if any
    await prisma.teacherClass.deleteMany({
      where: { subjectId: id },
    })

    await prisma.subject.delete({
      where: { id },
    })

    return NextResponse.json({ ok: true, message: `Subject ${subject.name} removed.` })
  } catch (error) {
    console.error("Subject deletion error:", error)
    return NextResponse.json({ error: "Unable to delete subject" }, { status: 500 })
  }
}
