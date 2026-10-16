import { redirect } from "next/navigation"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import BillingManager from "./BillingManager"

export const metadata = { title: "Subscriptions · Fentech StudentOS" }

export default async function PlatformBillingPage() {
  const session = await auth()
  if (session?.user.role !== "SUPER_ADMIN") redirect("/dashboard")

  const [plans, schools, staffRows] = await Promise.all([
    prisma.billingPlan.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }] }),
    prisma.school.findMany({
      select: { id: true, name: true, domain: true, status: true, _count: { select: { students: true } }, subscription: { include: { plan: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.user.groupBy({ by: ["schoolId"], where: { role: { in: ["SCHOOL_ADMIN", "TEACHER"] }, schoolId: { not: null } }, _count: { _all: true } }),
  ])
  const staff = new Map(staffRows.map((row) => [row.schoolId, row._count._all]))

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#4262ff]">Platform operations</p>
        <h1 className="mt-2 text-4xl font-medium tracking-[-.055em] sm:text-5xl">Subscriptions &amp; limits</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b6f7e]">Manage trials, plans, and enrollment limits. This does not collect payments or automatically renew subscriptions.</p>
      </header>
      <BillingManager plans={plans.map((plan) => ({ ...plan }))} schools={schools.map((school) => ({ id: school.id, name: school.name, domain: school.domain, schoolStatus: school.status, students: school._count.students, staff: staff.get(school.id) ?? 0, subscription: school.subscription ? { id: school.subscription.id, planId: school.subscription.planId, planCode: school.subscription.plan.code, planName: school.subscription.plan.name, status: school.subscription.status, trialEndsAt: school.subscription.trialEndsAt?.toISOString() ?? null, currentPeriodEndsAt: school.subscription.currentPeriodEndsAt?.toISOString() ?? null } : null }))} />
    </div>
  )
}
