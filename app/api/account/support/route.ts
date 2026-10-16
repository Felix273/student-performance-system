import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { clientIp, recordPlatformEvent } from "@/lib/platform/audit"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const access = requireRole(await auth(), ["SCHOOL_ADMIN"])
  if (!access.ok) return access.response
  const requests = await prisma.supportAccessGrant.findMany({ where: { schoolId: access.user.schoolId! }, orderBy: { requestedAt: "desc" }, take: 20, select: { id: true, status: true, purpose: true, requestedAt: true, approvedAt: true, expiresAt: true, revokedAt: true } })
  return NextResponse.json({ requests })
}

export async function POST(request: NextRequest) {
  const access = requireRole(await auth(), ["SCHOOL_ADMIN"])
  if (!access.ok) return access.response
  const body = await request.json().catch(() => null)
  const purpose = typeof body?.purpose === "string" ? body.purpose.trim() : ""
  if (purpose.length < 15 || purpose.length > 1000) return NextResponse.json({ error: "Explain the issue in 15 to 1,000 characters" }, { status: 400 })
  const active = await prisma.supportAccessGrant.findFirst({ where: { schoolId: access.user.schoolId!, OR: [{ status: "PENDING" }, { status: "APPROVED", revokedAt: null, expiresAt: { gt: new Date() } }] }, select: { id: true } })
  if (active) return NextResponse.json({ error: "A pending or approved support request already exists for this school" }, { status: 409 })
  const grant = await prisma.supportAccessGrant.create({ data: { schoolId: access.user.schoolId!, requestedById: access.user.id, scope: "READ_ONLY_DIAGNOSTICS", purpose }, select: { id: true, status: true, requestedAt: true } })
  await recordPlatformEvent({ actor: { id: access.user.id, email: access.user.email }, action: "support.access_requested", targetType: "SupportAccessGrant", targetId: grant.id, schoolId: access.user.schoolId, metadata: { scope: "READ_ONLY_DIAGNOSTICS", purpose }, ip: clientIp(request.headers) })
  return NextResponse.json({ grant }, { status: 201 })
}