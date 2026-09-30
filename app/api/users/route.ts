import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { requireRole } from "@/lib/authorization"

const safeUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  schoolId: true,
  createdAt: true,
  school: { select: { id: true, name: true, domain: true } },
  teacherClasses: { select: { id: true, class: { select: { id: true, name: true } }, subject: { select: { id: true, name: true } } } },
  children: { select: { id: true, student: { select: { id: true, name: true, admissionNo: true, class: { select: { id: true, name: true } } } } } },
} as const

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SCHOOL_ADMIN"])
    if (!access.ok) return access.response
    const schoolId = access.user.schoolId
    if (!schoolId) return NextResponse.json({ error: "School context required" }, { status: 403 })

    const body = await request.json()
    const { email, password, name, role, classIds = [], studentIds = [] } = body
    if (!email || !password || !name || !["TEACHER", "PARENT"].includes(role)) return NextResponse.json({ error: "Email, name, password, and a valid role are required" }, { status: 400 })
    if (!Array.isArray(classIds) || !Array.isArray(studentIds)) return NextResponse.json({ error: "Relationship IDs must be arrays" }, { status: 400 })

    const [classes, students, existingUser] = await Promise.all([
      role === "TEACHER" ? prisma.class.findMany({ where: { id: { in: classIds }, schoolId }, select: { id: true } }) : [],
      role === "PARENT" ? prisma.student.findMany({ where: { id: { in: studentIds }, schoolId }, select: { id: true } }) : [],
      prisma.user.findUnique({ where: { email: String(email).trim().toLowerCase() }, select: { id: true } }),
    ])
    if (existingUser) return NextResponse.json({ error: "Email already exists" }, { status: 409 })
    if (role === "TEACHER" && classes.length !== classIds.length) return NextResponse.json({ error: "One or more classes are outside your school" }, { status: 400 })
    if (role === "PARENT" && students.length !== studentIds.length) return NextResponse.json({ error: "One or more students are outside your school" }, { status: 400 })

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({ data: { email: String(email).trim().toLowerCase(), password: await bcrypt.hash(password, 10), name: String(name).trim(), role, schoolId }, select: { id: true, email: true, name: true, role: true } })
      if (role === "TEACHER" && classIds.length) await tx.teacherClass.createMany({ data: classIds.map((classId: string) => ({ teacherId: created.id, classId })) })
      if (role === "PARENT" && studentIds.length) await tx.parentStudent.createMany({ data: studentIds.map((studentId: string) => ({ parentId: created.id, studentId })) })
      return created
    })
    return NextResponse.json({ message: "User created successfully", user }, { status: 201 })
  } catch (error) {
    console.error("User creation error:", error)
    return NextResponse.json({ error: "Unable to create user" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SCHOOL_ADMIN"])
    if (!access.ok) return access.response
    const schoolId = access.user.schoolId
    if (!schoolId) return NextResponse.json({ error: "School context required" }, { status: 403 })

    const requestedRole = request.nextUrl.searchParams.get("role")
    const users = await prisma.user.findMany({
      where: { role: requestedRole && ["TEACHER", "PARENT"].includes(requestedRole) ? requestedRole as "TEACHER" | "PARENT" : { in: ["TEACHER", "PARENT"] }, schoolId },
      select: safeUserSelect,
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(users)
  } catch (error) {
    console.error("User fetch error:", error)
    return NextResponse.json({ error: "Unable to load users" }, { status: 500 })
  }
}
