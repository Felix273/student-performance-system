import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { clientIp, recordPlatformEvent } from "@/lib/platform/audit"
import { prisma } from "@/lib/prisma"

function validLimit(value: unknown) {
  return value === null || value === undefined || (typeof value === "number" && Number.isInteger(value) && value >= 0)
}

export async function GET() {
  const access = requireRole(await auth(), ["SUPER_ADMIN"])
  if (!access.ok) return access.response
  const [plans, schools, staffCounts] = await Promise.all([
    prisma.billingPlan.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }] }),
    prisma.school.findMany({
      select: {
        id: true, name: true, domain: true, status: true,
        _count: { select: { students: true } },
        subscription: { include: { plan: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.user.groupBy({ by: ["schoolId"], where: { role: { in: ["SCHOOL_ADMIN", "TEACHER"] }, schoolId: { not: null } }, _count: { _all: true } }),
  ])
  const staffBySchool = new Map(staffCounts.map((item) => [item.schoolId, item._count._all]))
  return NextResponse.json({ plans, schools: schools.map((school) => ({
    id: school.id,
    name: school.name,
    domain: school.domain,
    schoolStatus: school.status,
    students: school._count.students,
    staff: staffBySchool.get(school.id) ?? 0,
    subscription: school.subscription,
  })) })
}

export async function POST(request: NextRequest) {
  const access = requireRole(await auth(), ["SUPER_ADMIN"])
  if (!access.ok) return access.response
  const body = await request.json().catch(() => null)
  const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : ""
  const name = typeof body?.name === "string" ? body.name.trim() : ""
  const trialDays = body?.trialDays ?? 14
  const maxStudents = body?.maxStudents ?? null
  const maxStaff = body?.maxStaff ?? null
  if (!/^[A-Z0-9_-]{2,40}$/.test(code) || name.length < 2 || name.length > 80) return NextResponse.json({ error: "Provide a plan code and name" }, { status: 400 })
  if (!validLimit(maxStudents) || !validLimit(maxStaff) || !Number.isInteger(trialDays) || trialDays < 0 || trialDays > 365) return NextResponse.json({ error: "Limits must be non-negative integers or unlimited; trial days must be 0 to 365" }, { status: 400 })
  try {
    const plan = await prisma.billingPlan.create({ data: { code, name, trialDays, maxStudents, maxStaff } })
    await recordPlatformEvent({ actor: { id: access.user.id, email: access.user.email }, action: "billing.plan_created", targetType: "BillingPlan", targetId: plan.id, metadata: { code, name, trialDays, maxStudents, maxStaff }, ip: clientIp(request.headers) })
    return NextResponse.json({ plan }, { status: 201 })
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return NextResponse.json({ error: "A plan with this code already exists" }, { status: 409 })
    console.error("Billing plan create error:", error)
    return NextResponse.json({ error: "Unable to create plan" }, { status: 500 })
  }
}