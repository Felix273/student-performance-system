import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { clientIp, recordPlatformEvent } from "@/lib/platform/audit"
import { prisma } from "@/lib/prisma"

const STATUSES = new Set(["IN_REVIEW", "APPROVED", "REJECTED", "COMPLETED"])

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = requireRole(await auth(), ["SUPER_ADMIN"])
  if (!access.ok) return access.response
  const { id } = await params
  const body = await request.json().catch(() => null)
  const status = typeof body?.status === "string" ? body.status : ""
  const reviewNotes = typeof body?.reviewNotes === "string" ? body.reviewNotes.trim() : ""
  const legalReviewed = body?.legalReviewed === true
  if (!STATUSES.has(status)) return NextResponse.json({ error: "Choose a review status" }, { status: 400 })
  if (["REJECTED", "COMPLETED"].includes(status) && reviewNotes.length < 12) return NextResponse.json({ error: "Add review notes of at least 12 characters" }, { status: 400 })
  if (status === "COMPLETED" && !legalReviewed) return NextResponse.json({ error: "Confirm the applicable retention/legal review before completing this request" }, { status: 400 })

  const existing = await prisma.schoolDataRequest.findUnique({ where: { id }, select: { id: true, schoolId: true, requestType: true, status: true } })
  if (!existing) return NextResponse.json({ error: "Data request not found" }, { status: 404 })
  if (existing.status === "COMPLETED" || existing.status === "REJECTED") return NextResponse.json({ error: "This request is already closed" }, { status: 409 })
  if (status === "COMPLETED" && existing.status !== "APPROVED") return NextResponse.json({ error: "Approve the request before marking the workflow complete" }, { status: 409 })
  if (status === "APPROVED" && !["OPEN", "IN_REVIEW"].includes(existing.status)) return NextResponse.json({ error: "Only open requests can be approved" }, { status: 409 })
  if (status === "IN_REVIEW" && existing.status !== "OPEN" && existing.status !== "IN_REVIEW") return NextResponse.json({ error: "Only open requests can enter review" }, { status: 409 })

  const updated = await prisma.schoolDataRequest.update({ where: { id }, data: { status, reviewNotes: reviewNotes || undefined, reviewedById: access.user.id, reviewedAt: new Date(), completedAt: status === "COMPLETED" ? new Date() : undefined } })
  await recordPlatformEvent({ actor: { id: access.user.id, email: access.user.email }, action: "school.data_request_reviewed", targetType: "SchoolDataRequest", targetId: id, schoolId: existing.schoolId, metadata: { requestType: existing.requestType, before: existing.status, after: status, legalReviewed, reviewNotes }, ip: clientIp(request.headers) })
  return NextResponse.json({ request: updated, deletionPerformed: false })
}