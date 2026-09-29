import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth(); const access = requireRole(session, ["SUPER_ADMIN", "SCHOOL_ADMIN"]); if (!access.ok) return access.response
  const { id } = await params
  const plan = await prisma.assessmentPlan.findFirst({ where: { id, ...(access.role === "SCHOOL_ADMIN" ? { schoolId: access.user.schoolId || "" } : {}) }, select: { id: true } }); if (!plan) return NextResponse.json({ error: "Assessment plan not found" }, { status: 404 })
  const events = await prisma.evidenceAuditEvent.findMany({ where: { planId: id }, orderBy: { createdAt: "desc" }, take: 200, select: { id: true, action: true, priorStatus: true, newStatus: true, reason: true, createdAt: true, actor: { select: { id: true, name: true, role: true } }, evidence: { select: { id: true, student: { select: { name: true } } } } } })
  return NextResponse.json(events)
}
