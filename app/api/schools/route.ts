import { NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/authorization"

const schoolSelect = { id: true, name: true, domain: true, createdAt: true, updatedAt: true } as const

export async function GET() {
  try {
    const session = await auth()
    const access = requireRole(session, ["SCHOOL_ADMIN"])
    if (!access.ok) return access.response
    if (!access.user.schoolId) return NextResponse.json({ error: "School context required" }, { status: 403 })
    const school = await prisma.school.findUnique({ where: { id: access.user.schoolId }, select: schoolSelect })
    return NextResponse.json(school ? [school] : [])
  } catch (error) {
    console.error("School fetch error:", error)
    return NextResponse.json({ error: "Unable to load school" }, { status: 500 })
  }
}

export async function POST() {
  const session = await auth()
  const access = requireRole(session, [])
  if (!access.ok) return access.response
  return NextResponse.json({ error: "School onboarding is not available from this portal" }, { status: 403 })
}
