import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const schools = await prisma.school.findMany({
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(schools)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, domain, adminName, adminEmail, adminPassword } = await request.json()

    const existingSchool = await prisma.school.findUnique({
      where: { domain }
    })

    if (existingSchool) {
      return NextResponse.json({ error: "Domain already exists" }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail }
    })

    if (existingUser) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10)

    const result = await prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: { name, domain }
      })

      const admin = await tx.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: adminName,
          role: "SCHOOL_ADMIN",
          schoolId: school.id
        }
      })

      return { school, admin }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
