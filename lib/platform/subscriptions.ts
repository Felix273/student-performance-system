import type { Prisma, PrismaClient } from "@prisma/client"
import { prisma } from "@/lib/prisma"

type DbClient = PrismaClient | Prisma.TransactionClient
export type CapacityResource = "students" | "staff"

export async function checkSchoolCapacity(schoolId: string, resource: CapacityResource, additional = 1, db: DbClient = prisma) {
  const subscription = await db.schoolSubscription.findUnique({ where: { schoolId }, include: { plan: true } })
  if (!subscription) return { ok: false as const, error: "This school has no subscription record. Contact platform support." }
  if (!(["TRIAL", "ACTIVE"] as string[]).includes(subscription.status)) {
    return { ok: false as const, error: "This subscription is not active. Contact the platform administrator." }
  }
  if (subscription.status === "TRIAL" && subscription.trialEndsAt && subscription.trialEndsAt <= new Date()) {
    return { ok: false as const, error: "This school's trial has ended. Contact the platform administrator." }
  }

  const maximum = resource === "students" ? subscription.plan.maxStudents : subscription.plan.maxStaff
  if (maximum === null) return { ok: true as const, used: null, maximum: null }
  const used = resource === "students"
    ? await db.student.count({ where: { schoolId } })
    : await db.user.count({ where: { schoolId, role: { in: ["SCHOOL_ADMIN", "TEACHER"] } } })
  if (used + additional > maximum) {
    const label = resource === "students" ? "students" : "staff accounts"
    return { ok: false as const, error: `This plan allows ${maximum} ${label}; the school currently has ${used}. Upgrade the plan or adjust its limit.` }
  }
  return { ok: true as const, used, maximum }
}

export async function createTrialSubscription(schoolId: string, createdById?: string | null, db: DbClient = prisma) {
  const plan = await db.billingPlan.findUnique({ where: { code: "TRIAL" } })
  if (!plan || !plan.isActive) throw new Error("TRIAL_PLAN_NOT_CONFIGURED")
  const now = new Date()
  const trialEndsAt = new Date(now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000)
  return db.schoolSubscription.create({
    data: { schoolId, planId: plan.id, status: "TRIAL", startsAt: now, trialEndsAt, createdById: createdById ?? null },
  })
}
