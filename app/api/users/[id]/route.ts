import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { requireRole } from "@/lib/authorization"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SCHOOL_ADMIN"])
    if (!access.ok) return access.response

    const { id } = await params
    const schoolId = access.user.schoolId
    if (!schoolId) return NextResponse.json({ error: "School not assigned" }, { status: 400 })

    const targetUser = await prisma.user.findFirst({
      where: { id, schoolId },
      include: { teacherClasses: true },
    })

    if (!targetUser) {
      return NextResponse.json({ error: "User not found in your school" }, { status: 404 })
    }

    const body = await request.json()
    const { name, email, role, isActive, password, classIds } = body

    const updateData: {
      name?: string
      email?: string
      role?: "TEACHER" | "PARENT" | "STUDENT"
      isActive?: boolean
      password?: string
      mustChangePassword?: boolean
    } = {}

    if (name && typeof name === "string") {
      const trimmed = name.trim()
      if (trimmed.length < 2) return NextResponse.json({ error: "Name is too short" }, { status: 400 })
      updateData.name = trimmed
    }

    if (email && typeof email === "string") {
      const trimmedEmail = email.trim().toLowerCase()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
      }
      if (trimmedEmail !== targetUser.email) {
        const existing = await prisma.user.findUnique({ where: { email: trimmedEmail } })
        if (existing) {
          return NextResponse.json({ error: "This email address is already in use" }, { status: 409 })
        }
        updateData.email = trimmedEmail
      }
    }

    if (role && ["TEACHER", "PARENT", "STUDENT"].includes(role)) {
      updateData.role = role
    }

    if (typeof isActive === "boolean") {
      if (id === access.user.id && !isActive) {
        return NextResponse.json({ error: "You cannot deactivate your own account" }, { status: 400 })
      }
      updateData.isActive = isActive
    }

    if (password && typeof password === "string" && password.trim().length >= 6) {
      updateData.password = await bcrypt.hash(password.trim(), 10)
      updateData.mustChangePassword = true
    }

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      })

      if (Array.isArray(classIds) && targetUser.role === "TEACHER") {
        await tx.teacherClass.deleteMany({
          where: { teacherId: id, subjectId: null },
        })

        if (classIds.length > 0) {
          await tx.teacherClass.createMany({
            data: classIds.map((cId: string) => ({
              teacherId: id,
              classId: cId,
              subjectId: null,
            })),
            skipDuplicates: true,
          })
        }
      }

      return user
    })

    return NextResponse.json({ user: updated, message: "User updated successfully" })
  } catch (error) {
    console.error("User update error:", error)
    return NextResponse.json({ error: "Unable to update user" }, { status: 500 })
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

    if (id === access.user.id) {
      return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 })
    }

    const targetUser = await prisma.user.findFirst({
      where: { id, schoolId },
    })

    if (!targetUser) {
      return NextResponse.json({ error: "User not found in your school" }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.teacherClass.deleteMany({ where: { teacherId: id } })
      await tx.parentStudent.deleteMany({ where: { parentId: id } })
      await tx.user.delete({ where: { id } })
    })

    return NextResponse.json({ ok: true, message: "User account removed." })
  } catch (error) {
    console.error("User deletion error:", error)
    return NextResponse.json({ error: "Unable to remove user account" }, { status: 500 })
  }
}
