import { redirect } from "next/navigation"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import PasswordForm from "./PasswordForm"
import RevokeSessions from "./RevokeSessions"
import EmailDeliveryTest from "./EmailDeliveryTest"
import SupportAccessRequest from "./SupportAccessRequest"
import DataGovernanceControls from "./DataGovernanceControls"

export const metadata = { title: "Account security · Fentech StudentOS" }

export default async function AccountPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true, role: true, lastLoginAt: true, passwordChangedAt: true, mfaEnabled: true, mfaRecoveryHashes: true } })
  if (!user) redirect("/login")

  const subscription = user.role === "SCHOOL_ADMIN" && session.user.schoolId
    ? await prisma.schoolSubscription.findUnique({ where: { schoolId: session.user.schoolId }, include: { plan: true, school: { select: { _count: { select: { students: true } } } } } })
    : null
  const staffCount = user.role === "SCHOOL_ADMIN" && session.user.schoolId
    ? await prisma.user.count({ where: { schoolId: session.user.schoolId, role: { in: ["SCHOOL_ADMIN", "TEACHER"] } } })
    : 0

  const format = (date: Date | null) => (date ? date.toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" }) : "Never")

  return (
    <div className="space-y-10">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#8e91a0]">Account</p>
        <h1 className="mt-2 text-3xl font-medium tracking-[-.04em]">Security</h1>
        <p className="mt-2 text-sm text-[#6b6f7e]">{user.name} · {user.email}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-[#f7f8fa] p-5"><p className="text-xs font-bold uppercase tracking-wider text-[#8e91a0]">Last sign-in</p><p className="mt-2 text-sm font-semibold">{format(user.lastLoginAt)}</p></div>
        <div className="rounded-2xl bg-[#f7f8fa] p-5"><p className="text-xs font-bold uppercase tracking-wider text-[#8e91a0]">Password changed</p><p className="mt-2 text-sm font-semibold">{format(user.passwordChangedAt)}</p></div>
        {user.role === "SUPER_ADMIN" && <div className="rounded-2xl bg-[#f7f8fa] p-5"><p className="text-xs font-bold uppercase tracking-wider text-[#8e91a0]">Two-factor</p><p className="mt-2 text-sm font-semibold">{user.mfaEnabled ? `On · ${user.mfaRecoveryHashes.length} recovery codes left` : "Off"}</p></div>}
      </section>

      {user.role === "SCHOOL_ADMIN" && <section className="space-y-3 border-t border-[#eef0f3] pt-8">
        <h2 className="text-lg font-medium tracking-[-.02em]">School plan</h2>
        {subscription ? <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-[#f7f8fa] p-4"><p className="text-[11px] font-bold uppercase tracking-wider text-[#8e91a0]">Plan</p><p className="mt-2 text-sm font-semibold">{subscription.plan.name} · {subscription.status.replaceAll("_", " ")}</p>{subscription.status === "TRIAL" && subscription.trialEndsAt && <p className="mt-1 text-xs text-[#6b6f7e]">Trial ends {subscription.trialEndsAt.toLocaleDateString()}</p>}</div><div className="rounded-xl bg-[#f7f8fa] p-4"><p className="text-[11px] font-bold uppercase tracking-wider text-[#8e91a0]">Students</p><p className="mt-2 text-sm font-semibold">{subscription.school._count.students}{subscription.plan.maxStudents === null ? " · Unlimited" : ` / ${subscription.plan.maxStudents}`}</p></div><div className="rounded-xl bg-[#f7f8fa] p-4"><p className="text-[11px] font-bold uppercase tracking-wider text-[#8e91a0]">Staff accounts</p><p className="mt-2 text-sm font-semibold">{staffCount}{subscription.plan.maxStaff === null ? " · Unlimited" : ` / ${subscription.plan.maxStaff}`}</p></div></div> : <p className="rounded-xl bg-[#fff4c4] px-4 py-3 text-sm text-[#746019]">Subscription details are not configured. Contact your platform administrator.</p>}
      </section>}

      {user.role === "SCHOOL_ADMIN" && <section className="space-y-4 border-t border-[#eef0f3] pt-8"><h2 className="text-lg font-medium tracking-[-.02em]">Support access</h2><SupportAccessRequest /></section>}
      {user.role === "SCHOOL_ADMIN" && <section className="space-y-4 border-t border-[#eef0f3] pt-8"><h2 className="text-lg font-medium tracking-[-.02em]">Data governance</h2><DataGovernanceControls /></section>}

      <section className="space-y-4">
        <h2 className="text-lg font-medium tracking-[-.02em]">Change password</h2>
        <PasswordForm />
      </section>

      <section className="space-y-3 border-t border-[#eef0f3] pt-8">
        <h2 className="text-lg font-medium tracking-[-.02em]">Sessions</h2>
        <p className="max-w-lg text-sm leading-6 text-[#6b6f7e]">If you used a shared computer or suspect someone else has access, end every active session. You’ll need to sign in again.</p>
        <RevokeSessions />
      </section>

      {user.role === "SUPER_ADMIN" && <section className="space-y-3 border-t border-[#eef0f3] pt-8">
        <h2 className="text-lg font-medium tracking-[-.02em]">Email delivery</h2>
        <EmailDeliveryTest />
      </section>}
    </div>
  )
}
