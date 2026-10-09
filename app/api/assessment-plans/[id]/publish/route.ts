import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import { publishEvidence } from "@/lib/moderation"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth(); const access = requireRole(session, ["SCHOOL_ADMIN"]); if (!access.ok) return access.response
  const actorId = access.user.id; if (!actorId) return NextResponse.json({ error: "Authenticated user required" }, { status: 401 })
  const { id } = await params; const body = await request.json().catch(() => ({})); const plan = await prisma.assessmentPlan.findFirst({ where: { id, ...(access.role === "SCHOOL_ADMIN" ? { schoolId: access.user.schoolId || "" } : {}) }, select: { id: true, schoolId: true, status: true, publicationMode: true } })
  if (!plan) return NextResponse.json({ error: "Assessment plan not found" }, { status: 404 })
  if (plan.status === "LOCKED" || plan.status === "ARCHIVED") return NextResponse.json({ error: "Locked or archived plans cannot be published" }, { status: 409 })
  const evidence = await prisma.assessmentEvidence.findMany({ where: { assessmentPlanId: id, schoolId: plan.schoolId, status: "VERIFIED" }, select: { id: true } })
  if (evidence.length === 0) return NextResponse.json({ error: "No verified evidence is ready for publication" }, { status: 409 })
  const published = []
  for (const item of evidence) published.push(await publishEvidence(item.id, actorId, plan.schoolId, typeof body.reason === "string" ? body.reason.trim() : undefined))
  const updated = await prisma.$transaction(async tx => { await tx.evidenceAuditEvent.create({ data: { schoolId: plan.schoolId, planId: id, actorId, action: "PUBLISHED", priorStatus: plan.status, newStatus: "PUBLISHED", reason: typeof body.reason === "string" ? body.reason.trim() : undefined, metadata: { evidenceCount: published.length, mode: "PLAN_BATCH" } } }); return tx.assessmentPlan.update({ where: { id }, data: { status: "PUBLISHED", publishedAt: new Date(), publishedById: actorId, moderationCompletedAt: new Date(), moderationCompletedById: actorId, publicationMode: "PLAN_BATCH" }, select: { id: true, status: true, publishedAt: true, publishedById: true, publicationMode: true } }) })
  return NextResponse.json({ plan: updated, publishedCount: published.length, message: "Verified evidence for the plan has been published." })
}
