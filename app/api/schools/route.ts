import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { requireRole } from "@/lib/authorization"

const schoolSelect = { id: true, name: true, domain: true, createdAt: true, updatedAt: true } as const

export async function GET() {
  try {
    const session = await auth()
    const access = requireRole(session, ["SUPER_ADMIN", "SCHOOL_ADMIN"])
    if (!access.ok) return access.response
    const schools = await prisma.school.findMany({
      where: access.role === "SCHOOL_ADMIN" ? { id: access.user.schoolId! } : undefined,
      select: schoolSelect,
      orderBy: { name: "asc" },
    })
    return NextResponse.json(schools)
  } catch (error) {
    console.error("School fetch error:", error)
    return NextResponse.json({ error: "Unable to load schools" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SUPER_ADMIN"])
    if (!access.ok) return access.response
    const { name, domain, adminName, adminEmail, adminPassword } = await request.json()
    if (!name || !domain || !adminName || !adminEmail || !adminPassword) return NextResponse.json({ error: "All school and administrator fields are required" }, { status: 400 })

    const [existingSchool, existingUser] = await Promise.all([
      prisma.school.findUnique({ where: { domain }, select: { id: true } }),
      prisma.user.findUnique({ where: { email: adminEmail }, select: { id: true } }),
    ])
    if (existingSchool) return NextResponse.json({ error: "Domain already exists" }, { status: 409 })
    if (existingUser) return NextResponse.json({ error: "Email already exists" }, { status: 409 })

    const result = await prisma.$transaction(async (tx) => {
      const school = await tx.school.create({ data: { name: String(name).trim(), domain: String(domain).trim().toLowerCase(), }, select: schoolSelect })
      const admin = await tx.user.create({ data: { email: String(adminEmail).trim().toLowerCase(), password: await bcrypt.hash(adminPassword, 10), name: String(adminName).trim(), role: "SCHOOL_ADMIN", schoolId: school.id }, select: { id: true, email: true, name: true, role: true, schoolId: true } })
      return { school, admin }
    })
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error("School creation error:", error)
    return NextResponse.json({ error: "Unable to create school" }, { status: 500 })
  }
}
