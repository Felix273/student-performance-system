import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { clientIp, recordPlatformEvent } from "@/lib/platform/audit"
import { prisma } from "@/lib/prisma"

function validLimit(value: unknown) {
  return value === null || value === undefined || (typeof value === "number" && Number.isInteger(value) && value >= 0)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = requireRole(await auth(), ["SUPER_ADMIN"])
  if (!access.ok) return access.response
  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!validLimit(body?.maxStudents) || !validLimit(body?.maxStaff) || !Number.isInteger(body?.trialDays) || body.trialDays < 0 || body.trialDays > 365 || typeof body?.isActive !== "boolean") {
    return NextResponse.json({ error: "Provide non-negative limits, trial days from 0 to 365, and active status" }, { status: 400 })
  }
  const before = await prisma.billingPlan.findUnique({ where: { id } })
  if (!before) return NextResponse.json({ error: "Plan not found" }, { status: 404 })
  const plan = await prisma.billingPlan.update({ where: { id }, data: { maxStudents: body.maxStudents ?? null, maxStaff: body.maxStaff ?? null, trialDays: body.trialDays, isActive: body.isActive } })
  await recordPlatformEvent({ actor: { id: access.user.id, email: access.user.email }, action: "billing.plan_updated", targetType: "BillingPlan", targetId: id, metadata: { before: { maxStudents: before.maxStudents, maxStaff: before.maxStaff, trialDays: before.trialDays, isActive: before.isActive }, after: { maxStudents: plan.maxStudents, maxStaff: plan.maxStaff, trialDays: plan.trialDays, isActive: plan.isActive } }, ip: clientIp(request.headers) })
  return NextResponse.json({ plan })
}