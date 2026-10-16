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
  const overview = {
    coveredSchools: schools.filter((school) => school.subscription).length,
    totalSchools: schools.length,
    activePlans: plans.filter((plan) => plan.isActive).length,
    trialSchools: schools.filter((school) => school.subscription?.status === "TRIAL").length,
    limitedPlans: plans.filter((plan) => plan.maxStudents !== null || plan.maxStaff !== null).length,
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="relative overflow-hidden rounded-[28px] bg-[#1c1c1e] px-6 py-8 text-white sm:px-10 sm:py-10">
        <div aria-hidden="true" className="absolute -right-10 -top-16 hidden h-52 w-52 rotate-12 border-[28px] border-[#ffd02f]/20 sm:block" />
        <div className="relative flex flex-col justify-between gap-8 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <p className="mb-4 text-[11px] font-bold uppercase tracking-[.2em] text-[#ffd02f]">Platform operations / Plan control</p>
            <h1 className="text-4xl font-medium leading-[1.05] tracking-[-.055em] sm:text-6xl">Every school, on the right plan.</h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-[#c7cad5]">Set trial terms and enrollment limits across your school portfolio. Billing and automatic renewals are not enabled here.</p>
          </div>
          <div className="flex items-end gap-4 border-l-4 border-[#ffd02f] pl-5 sm:min-w-48">
            <p className="font-mono text-5xl font-medium leading-none text-[#ffd02f] sm:text-6xl">{overview.coveredSchools}<span className="text-2xl text-white/50">/{overview.totalSchools}</span></p>
            <p className="max-w-24 pb-1 text-xs font-semibold leading-5 text-white/80">schools with a plan</p>
          </div>
        </div>
      </header>
      <section aria-label="Subscription overview" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[20px] bg-[#e7edff] p-5"><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#4262ff]">Covered schools</p><p className="mt-4 font-mono text-4xl font-medium text-[#4262ff]">{overview.coveredSchools}<span className="text-xl text-[#4262ff]/50">/{overview.totalSchools}</span></p><p className="mt-2 text-xs text-[#555a6a]">Have a subscription record</p></div>
        <div className="rounded-[20px] bg-[#c3faf5] p-5"><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#187574]">Active plans</p><p className="mt-4 font-mono text-4xl font-medium text-[#187574]">{overview.activePlans}</p><p className="mt-2 text-xs text-[#555a6a]">Available for assignment</p></div>
        <div className="rounded-[20px] bg-[#fff4c4] p-5"><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#746019]">Schools on trial</p><p className="mt-4 font-mono text-4xl font-medium text-[#746019]">{overview.trialSchools}</p><p className="mt-2 text-xs text-[#555a6a]">Currently in a trial period</p></div>
        <div className="rounded-[20px] bg-[#f7f8fa] p-5"><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#6b6f7e]">Limited plans</p><p className="mt-4 font-mono text-4xl font-medium text-[#1c1c1e]">{overview.limitedPlans}</p><p className="mt-2 text-xs text-[#555a6a]">Plans with enrollment caps</p></div>
      </section>
      <BillingManager plans={plans.map((plan) => ({ ...plan }))} schools={schools.map((school) => ({ id: school.id, name: school.name, domain: school.domain, schoolStatus: school.status, students: school._count.students, staff: staff.get(school.id) ?? 0, subscription: school.subscription ? { id: school.subscription.id, planId: school.subscription.planId, planCode: school.subscription.plan.code, planName: school.subscription.plan.name, maxStudents: school.subscription.plan.maxStudents, maxStaff: school.subscription.plan.maxStaff, status: school.subscription.status, trialEndsAt: school.subscription.trialEndsAt?.toISOString() ?? null, currentPeriodEndsAt: school.subscription.currentPeriodEndsAt?.toISOString() ?? null } : null }))} />
    </div>
  )
}
