import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { clientIp, recordPlatformEvent } from "@/lib/platform/audit"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const access = requireRole(await auth(), ["SCHOOL_ADMIN"])
  if (!access.ok) return access.response
  const requests = await prisma.schoolDataRequest.findMany({ where: { schoolId: access.user.schoolId! }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, requestType: true, status: true, reason: true, reviewNotes: true, reviewedAt: true, createdAt: true } })
  return NextResponse.json({ requests })
}

export async function POST(request: NextRequest) {
  const access = requireRole(await auth(), ["SCHOOL_ADMIN"])
  if (!access.ok) return access.response
  const body = await request.json().catch(() => null)
  const requestType = typeof body?.requestType === "string" ? body.requestType : ""
  const reason = typeof body?.reason === "string" ? body.reason.trim() : ""
  if (requestType !== "DELETION") return NextResponse.json({ error: "Only deletion requests use this workflow. Data export is available as an immediate authenticated download." }, { status: 400 })
  if (reason.length < 15 || reason.length > 1000) return NextResponse.json({ error: "Provide a reason of 15 to 1,000 characters" }, { status: 400 })
  const existing = await prisma.schoolDataRequest.findFirst({ where: { schoolId: access.user.schoolId!, requestType: "DELETION", status: { in: ["OPEN", "IN_REVIEW", "APPROVED"] } }, select: { id: true } })
  if (existing) return NextResponse.json({ error: "A deletion request is already open for this school" }, { status: 409 })
  const record = await prisma.schoolDataRequest.create({ data: { schoolId: access.user.schoolId!, requestedById: access.user.id, requestType: "DELETION", reason }, select: { id: true, requestType: true, status: true, createdAt: true } })
  await recordPlatformEvent({ actor: { id: access.user.id, email: access.user.email }, action: "school.data_request_created", targetType: "SchoolDataRequest", targetId: record.id, schoolId: access.user.schoolId, metadata: { requestType, reason }, ip: clientIp(request.headers) })
  return NextResponse.json({ request: record }, { status: 201 })
}
