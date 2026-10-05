import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { getEvidenceForActor, isModerator, canTransition, recordAudit } from "@/lib/moderation"
import { prisma } from "@/lib/prisma"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth(); const access = requireRole(session, ["SCHOOL_ADMIN"]); if (!access.ok) return access.response
  const { id } = await params; const body = await request.json(); const decision = typeof body.decision === "string" ? body.decision : ""; const actorId = access.user.id; if (!actorId) return NextResponse.json({ error: "Authenticated user required" }, { status: 401 })
  if (!isModerator(access.role) || !["VERIFIED", "REJECTED", "RETURNED"].includes(decision)) return NextResponse.json({ error: "A valid moderation decision is required" }, { status: 400 })
  const reason = typeof body.reason === "string" ? body.reason.trim() : ""
  if ((decision === "REJECTED" || decision === "RETURNED") && !reason) return NextResponse.json({ error: "A reason is required when returning or rejecting evidence" }, { status: 400 })
  const evidence = await getEvidenceForActor(id, access.user.schoolId); if (!evidence) return NextResponse.json({ error: "Evidence not found" }, { status: 404 })
  if (!canTransition(evidence.status, decision)) return NextResponse.json({ error: `Cannot move ${evidence.status.toLowerCase()} evidence to ${decision.toLowerCase()}` }, { status: 409 })
  const updated = await prisma.$transaction(async (tx) => {
    const item = await tx.assessmentEvidence.update({ where: { id }, data: { status: decision as never, reviewerId: actorId, reviewedAt: new Date(), reviewReason: reason || null }, select: { id: true, status: true, reviewerId: true, reviewedAt: true, reviewReason: true } })
    await tx.evidenceModerationDecision.create({ data: { evidenceId: id, reviewerId: actorId, decision: decision as never, reason: reason || undefined, internalNote: typeof body.internalNote === "string" ? body.internalNote.trim() : undefined } })
    await recordAudit(tx, { schoolId: evidence.schoolId, evidenceId: id, planId: evidence.assessmentPlanId || undefined, actorId, action: decision as never, priorStatus: evidence.status, newStatus: decision, reason: reason || undefined })
    return item
  })
  return NextResponse.json({ evidence: updated, message: `Evidence ${decision.toLowerCase()}.` })
}
