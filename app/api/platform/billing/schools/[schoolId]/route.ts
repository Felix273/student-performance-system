import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { clientIp, recordPlatformEvent } from "@/lib/platform/audit"
import { prisma } from "@/lib/prisma"

const STATUSES = new Set(["TRIAL", "ACTIVE", "PAST_DUE", "CANCELED", "EXPIRED"])

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ schoolId: string }> }) {
  const access = requireRole(await auth(), ["SUPER_ADMIN"])
  if (!access.ok) return access.response
  const { schoolId } = await params
  const body = await request.json().catch(() => null)
  const planId = typeof body?.planId === "string" ? body.planId : ""
  const status = typeof body?.status === "string" ? body.status : ""
  const trialEndsAt = body?.trialEndsAt === null ? null : typeof body?.trialEndsAt === "string" ? new Date(body.trialEndsAt) : undefined
  if (!planId || !STATUSES.has(status) || (trialEndsAt instanceof Date && !Number.isFinite(trialEndsAt.getTime()))) return NextResponse.json({ error: "Choose a plan, subscription status, and valid trial end date" }, { status: 400 })
  if (status === "TRIAL" && (!(trialEndsAt instanceof Date) || trialEndsAt <= new Date())) return NextResponse.json({ error: "A trial subscription must have a future end date" }, { status: 400 })
  const [school, plan, before] = await Promise.all([
    prisma.school.findUnique({ where: { id: schoolId }, select: { id: true } }),
    prisma.billingPlan.findUnique({ where: { id: planId, isActive: true }, select: { id: true } }),
    prisma.schoolSubscription.findUnique({ where: { schoolId }, include: { plan: { select: { code: true } } } }),
  ])
  if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 })
  if (!plan) return NextResponse.json({ error: "Active plan not found" }, { status: 404 })
  const subscription = await prisma.schoolSubscription.upsert({
    where: { schoolId },
    update: { planId, status, ...(trialEndsAt !== undefined ? { trialEndsAt } : {}) },
    create: { schoolId, planId, status, trialEndsAt: trialEndsAt ?? null, createdById: access.user.id },
    include: { plan: true },
  })
  await recordPlatformEvent({ actor: { id: access.user.id, email: access.user.email }, action: "billing.subscription_updated", targetType: "School", targetId: schoolId, schoolId, metadata: { before: before ? { plan: before.plan.code, status: before.status, trialEndsAt: before.trialEndsAt?.toISOString() ?? null } : null, after: { plan: subscription.plan.code, status: subscription.status, trialEndsAt: subscription.trialEndsAt?.toISOString() ?? null } }, ip: clientIp(request.headers) })
  return NextResponse.json({ subscription })
}