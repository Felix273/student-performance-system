import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/authorization"
import { clientIp, recordPlatformEvent } from "@/lib/platform/audit"
import { unusablePasswordHash } from "@/lib/security/password"
import { sendAccountLink } from "@/lib/security/invites"

const schoolSelect = { id: true, name: true, domain: true, createdAt: true, updatedAt: true } as const
const domainPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
    const body = await request.json()
    const name = typeof body.name === "string" ? body.name.trim() : ""
    const domain = typeof body.domain === "string" ? body.domain.trim().toLowerCase() : ""
    const adminName = typeof body.adminName === "string" ? body.adminName.trim() : ""
    const adminEmail = typeof body.adminEmail === "string" ? body.adminEmail.trim().toLowerCase() : ""
    if (!name || !domain || !adminName || !adminEmail) return NextResponse.json({ error: "All school and administrator fields are required" }, { status: 400 })
    if (name.length < 2 || name.length > 120) return NextResponse.json({ error: "School name must be between 2 and 120 characters" }, { status: 400 })
    if (!domainPattern.test(domain) || domain.length > 80) return NextResponse.json({ error: "Domain may contain lowercase letters, numbers, and single hyphens only" }, { status: 400 })
    if (!emailPattern.test(adminEmail)) return NextResponse.json({ error: "Provide a valid administrator email" }, { status: 400 })

    const [existingSchool, existingUser] = await Promise.all([
      prisma.school.findUnique({ where: { domain }, select: { id: true } }),
      prisma.user.findUnique({ where: { email: adminEmail }, select: { id: true } }),
    ])
    if (existingSchool) return NextResponse.json({ error: "Domain already exists" }, { status: 409 })
    if (existingUser) return NextResponse.json({ error: "Email already exists" }, { status: 409 })

    const result = await prisma.$transaction(async (tx) => {
      const school = await tx.school.create({ data: { name, domain }, select: schoolSelect })
      const admin = await tx.user.create({ data: { email: adminEmail, password: await unusablePasswordHash(), mustChangePassword: true, name: adminName, role: "SCHOOL_ADMIN", schoolId: school.id }, select: { id: true, email: true, name: true, role: true, schoolId: true } })
      return { school, admin }
    })

    const invite = await sendAccountLink({ request, recipient: result.admin, purpose: "INVITE", schoolName: result.school.name, createdById: access.user.id! })
    const actor = { id: access.user.id, email: access.user.email }
    const ip = clientIp(request.headers)
    await recordPlatformEvent({ actor, action: "school.created", targetType: "School", targetId: result.school.id, schoolId: result.school.id, metadata: { name, domain }, ip })
    await recordPlatformEvent({ actor, action: "school_admin.invited", targetType: "User", targetId: result.admin.id, schoolId: result.school.id, metadata: { email: adminEmail, emailed: invite.emailed, linkShownToOperator: !invite.emailed }, ip })

    return NextResponse.json({ ...result, invite: { emailed: invite.emailed, expiresAt: invite.expiresAt, link: invite.link } }, { status: 201 })
  } catch (error) {
    console.error("School creation error:", error)
    return NextResponse.json({ error: "Unable to create school" }, { status: 500 })
  }
}
