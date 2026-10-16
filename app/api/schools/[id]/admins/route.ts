import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import { clientIp, recordPlatformEvent } from "@/lib/platform/audit"
import { unusablePasswordHash } from "@/lib/security/password"
import { sendAccountLink } from "@/lib/security/invites"
import { checkSchoolCapacity } from "@/lib/platform/subscriptions"

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = requireRole(await auth(), ["SUPER_ADMIN"])
    if (!access.ok) return access.response
    const { id } = await params

    const body = await request.json().catch(() => null)
    const name = typeof body?.name === "string" ? body.name.trim() : ""
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
    if (name.length < 2 || name.length > 120) return NextResponse.json({ error: "Enter the administrator's name" }, { status: 400 })
    if (!emailPattern.test(email) || email.length > 254) return NextResponse.json({ error: "Provide a valid email" }, { status: 400 })

    const school = await prisma.school.findUnique({ where: { id }, select: { id: true, name: true } })
    if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 })
    const capacity = await checkSchoolCapacity(id, "staff")
    if (!capacity.ok) return NextResponse.json({ error: capacity.error }, { status: 402 })
    if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) return NextResponse.json({ error: "Email already exists" }, { status: 409 })

    const admin = await prisma.user.create({
      data: { email, name, role: "SCHOOL_ADMIN", schoolId: school.id, password: await unusablePasswordHash(), mustChangePassword: true },
      select: { id: true, name: true, email: true },
    })
    const invite = await sendAccountLink({ request, recipient: admin, purpose: "INVITE", schoolName: school.name, createdById: access.user.id! })
    await recordPlatformEvent({
      actor: { id: access.user.id, email: access.user.email },
      action: "school_admin.invited",
      targetType: "User",
      targetId: admin.id,
      schoolId: school.id,
      metadata: { email, emailed: invite.emailed, linkShownToOperator: !invite.emailed },
      ip: clientIp(request.headers),
    })

    return NextResponse.json({ admin, invite: { emailed: invite.emailed, expiresAt: invite.expiresAt, link: invite.link } }, { status: 201 })
  } catch (error) {
    console.error("Add school administrator error:", error)
    return NextResponse.json({ error: "Unable to add administrator" }, { status: 500 })
  }
}
