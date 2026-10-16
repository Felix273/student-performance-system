import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { clientIp, recordPlatformEvent } from "@/lib/platform/audit"
import { prisma } from "@/lib/prisma"

const ACTIONS = new Set(["APPROVE", "DENY", "REVOKE"])

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = requireRole(await auth(), ["SUPER_ADMIN"])
  if (!access.ok) return access.response
  const { id } = await params
  const body = await request.json().catch(() => null)
  const action = typeof body?.action === "string" ? body.action : ""
  const minutes = body?.minutes ?? 20
  if (!ACTIONS.has(action)) return NextResponse.json({ error: "Choose approve, deny, or revoke" }, { status: 400 })
  if (action === "APPROVE" && (!Number.isInteger(minutes) || minutes < 1 || minutes > 30)) return NextResponse.json({ error: "Support access is limited to 1–30 minutes" }, { status: 400 })

  const grant = await prisma.supportAccessGrant.findUnique({ where: { id }, select: { id: true, schoolId: true, status: true, purpose: true, expiresAt: true, revokedAt: true } })
  if (!grant) return NextResponse.json({ error: "Support request not found" }, { status: 404 })
  if (action === "APPROVE" && grant.status !== "PENDING") return NextResponse.json({ error: "Only pending requests can be approved" }, { status: 409 })
  if (action === "DENY" && grant.status !== "PENDING") return NextResponse.json({ error: "Only pending requests can be denied" }, { status: 409 })
  if (action === "REVOKE" && grant.status !== "APPROVED") return NextResponse.json({ error: "Only active approvals can be revoked" }, { status: 409 })

  if (action === "APPROVE") {
    const active = await prisma.supportAccessGrant.findFirst({ where: { schoolId: grant.schoolId, id: { not: id }, status: "APPROVED", revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true } })
    if (active) return NextResponse.json({ error: "Another support grant is active for this school" }, { status: 409 })
  }

  const now = new Date()
  const status = action === "APPROVE" ? "APPROVED" : action === "DENY" ? "DENIED" : "REVOKED"
  const updated = await prisma.supportAccessGrant.update({ where: { id }, data: { status, approvedById: action === "APPROVE" ? access.user.id : undefined, approvedAt: action === "APPROVE" ? now : undefined, expiresAt: action === "APPROVE" ? new Date(now.getTime() + minutes * 60_000) : grant.expiresAt, revokedAt: action === "REVOKE" ? now : grant.revokedAt } })
  const auditAction = action === "APPROVE" ? "support.access_approved" : action === "DENY" ? "support.access_denied" : "support.access_revoked"
  await recordPlatformEvent({ actor: { id: access.user.id, email: access.user.email }, action: auditAction, targetType: "SupportAccessGrant", targetId: id, schoolId: grant.schoolId, metadata: { scope: "READ_ONLY_DIAGNOSTICS", purpose: grant.purpose, expiresAt: updated.expiresAt?.toISOString() ?? null }, ip: clientIp(request.headers) })
  return NextResponse.json({ id, status: updated.status, expiresAt: updated.expiresAt })
}