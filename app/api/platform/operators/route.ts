import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { sendAccountLink } from "@/lib/security/invites"
import { unusablePasswordHash } from "@/lib/security/password"
import { clientIp, recordPlatformEvent } from "@/lib/platform/audit"
import { prisma } from "@/lib/prisma"

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  const access = requireRole(await auth(), ["SUPER_ADMIN"])
  if (!access.ok) return access.response
  const body = await request.json().catch(() => null)
  const name = typeof body?.name === "string" ? body.name.trim() : ""
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
  if (name.length < 2 || name.length > 120) return NextResponse.json({ error: "Enter the operator's name" }, { status: 400 })
  if (!emailPattern.test(email) || email.length > 254) return NextResponse.json({ error: "Provide a valid email" }, { status: 400 })
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) return NextResponse.json({ error: "That email already has an account" }, { status: 409 })

  try {
    const operator = await prisma.user.create({
      data: { name, email, role: "SUPER_ADMIN", password: await unusablePasswordHash(), mustChangePassword: true },
      select: { id: true, name: true, email: true, isActive: true },
    })
    const invite = await sendAccountLink({ request, recipient: operator, purpose: "INVITE", createdById: access.user.id! })
    await recordPlatformEvent({
      actor: { id: access.user.id, email: access.user.email },
      action: "platform_operator.invited",
      targetType: "User",
      targetId: operator.id,
      metadata: { email, emailed: invite.emailed, linkShownToOperator: !invite.emailed },
      ip: clientIp(request.headers),
    })
    return NextResponse.json({ operator, invite: { emailed: invite.emailed, expiresAt: invite.expiresAt, link: invite.link } }, { status: 201 })
  } catch (error) {
    console.error("Platform operator invite error:", error)
    return NextResponse.json({ error: "Unable to invite platform operator" }, { status: 500 })
  }
}