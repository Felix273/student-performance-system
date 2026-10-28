import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import crypto from "node:crypto"

// Helper to generate a signed bearer token
function generateToken(payload: { userId: string; role: string; schoolId: string | null }): string {
  const secret = process.env.NEXTAUTH_SECRET || "fentech-studentos-mobile-secret-2026"
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")
  const exp = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30-day mobile session
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString("base64url")
  const signature = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url")
  return `${header}.${body}.${signature}`
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const cleanEmail = email.trim().toLowerCase()

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: {
        school: {
          select: { id: true, name: true, logoUrl: true, status: true },
        },
      },
    })

    if (!user || !user.isActive) {
      return NextResponse.json({ error: "Invalid credentials or account deactivated" }, { status: 401 })
    }

    if (user.school && user.school.status !== "ACTIVE" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "School account is suspended or inactive" }, { status: 403 })
    }

    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const token = generateToken({
      userId: user.id,
      role: user.role,
      schoolId: user.schoolId,
    })

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        school: user.school
          ? {
              id: user.school.id,
              name: user.school.name,
              logoUrl: user.school.logoUrl,
            }
          : null,
      },
    })
  } catch (error) {
    console.error("Mobile auth error:", error)
    return NextResponse.json({ error: "Unable to process login request" }, { status: 500 })
  }
}
