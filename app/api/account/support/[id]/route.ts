import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { clientIp, recordPlatformEvent } from "@/lib/platform/audit"
import { prisma } from "@/lib/prisma"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = requireRole(await auth(), ["SCHOOL_ADMIN"])
  if (!access.ok) return access.response
  const { id } = await params
  const schoolId = access.user.schoolId
  if (!schoolId) return NextResponse.json({ error: "School is not assigned" }, { status: 403 })
  const grant = await prisma.supportAccessGrant.findFirst({ where: { id, schoolId, status: { in: ["PENDING", "APPROVED"] } }, select: { id: true, schoolId: true, status: true } })
  if (!grant) return NextResponse.json({ error: "Open support request not found" }, { status: 404 })
  const updated = await prisma.supportAccessGrant.update({ where: { id }, data: { status: "REVOKED", revokedAt: new Date() } })
  await recordPlatformEvent({ actor: { id: access.user.id, email: access.user.email }, action: "support.access_revoked", targetType: "SupportAccessGrant", targetId: id, schoolId: grant.schoolId, metadata: { previousStatus: grant.status }, ip: clientIp(request.headers) })
  return NextResponse.json({ id: updated.id, status: updated.status, revokedAt: updated.revokedAt })
}