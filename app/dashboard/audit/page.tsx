import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"

export const metadata = { title: "Audit log · Fentech StudentOS" }

const LABELS: Record<string, string> = {
  "school.created": "School created",
  "school.updated": "School updated",
  "school_admin.invited": "Administrator invited",
  "school_admin.reset_link_issued": "Reset link issued",
  "password.reset_completed": "Password reset",
  "password.changed": "Password changed",
  "invite.accepted": "Invite accepted",
  "sessions.revoked": "Sessions revoked",
  "mfa.enabled": "Two-factor enabled",
  "login.succeeded": "Sign-in",
  "login.failed": "Failed sign-in",
  "login.locked": "Account locked",
  "login.mfa_failed": "Failed verification code",
  "email.test_sent": "Email delivery tested",
  "platform_operator.reactivated": "Platform operator reactivated",
  "platform_operator.disabled": "Platform operator disabled",
  "platform_operator.invited": "Platform operator invited",
  "school.status_changed": "School access status changed",
  "school.cbc_starter_created": "CBC starter created",
  "billing.plan_created": "Billing plan created",
  "billing.plan_updated": "Billing plan updated",
  "billing.subscription_updated": "School subscription updated",
  "platform.announcement_created": "Announcement created",
  "platform.announcement_updated": "Announcement updated",
  "support.access_requested": "Support access requested",
  "support.access_approved": "Support access approved",
  "support.access_denied": "Support access denied",
  "support.access_revoked": "Support access revoked",
  "support.accessed": "Support diagnostics viewed",
  "school.data_request_created": "School data request created",
  "school.data_request_reviewed": "School data request reviewed",
  "school.data_exported": "School data exported",
}
const GROUPS: Record<string, string[]> = {
  all: [],
  schools: ["school.created", "school.updated", "school_admin.invited", "school_admin.reset_link_issued"],
  security: ["password.reset_completed", "password.changed", "invite.accepted", "sessions.revoked", "mfa.enabled"],
  signins: ["login.succeeded", "login.failed", "login.locked", "login.mfa_failed"],
  operations: ["billing.plan_created", "billing.plan_updated", "billing.subscription_updated", "platform.announcement_created", "platform.announcement_updated", "support.access_requested", "support.access_approved", "support.access_denied", "support.access_revoked", "support.accessed", "school.data_request_created", "school.data_request_reviewed", "school.data_exported"],
}
const TONE: Record<string, string> = { "login.failed": "bg-[#fff4c4] text-[#746019]", "login.locked": "bg-[#ffe1e1] text-[#9b3030]", "login.mfa_failed": "bg-[#fff4c4] text-[#746019]" }

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  const session = await auth()
  if (session?.user.role !== "SUPER_ADMIN") redirect("/dashboard")

  const { group = "all" } = await searchParams
  const actions = GROUPS[group] ?? []
  const events = await prisma.platformAuditEvent.findMany({ where: actions.length ? { action: { in: actions } } : undefined, orderBy: { createdAt: "desc" }, take: 200 })
  const schools = await prisma.school.findMany({ where: { id: { in: events.map((event) => event.schoolId).filter((id): id is string => !!id) } }, select: { id: true, name: true } })
  const schoolName = new Map(schools.map((school) => [school.id, school.name]))

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#4262ff]">Platform</p>
        <h1 className="mt-2 text-4xl font-medium tracking-[-.055em] sm:text-5xl">Audit log</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b6f7e]">Who did what, and when. The most recent 200 events. Reset links and passwords are never stored here.</p>
      </header>

      <nav aria-label="Filter events" className="flex flex-wrap gap-2">
        {Object.keys(GROUPS).map((key) => <Link key={key} href={key === "all" ? "/dashboard/audit" : `/dashboard/audit?group=${key}`} aria-current={group === key ? "page" : undefined} className={`rounded-full px-4 py-2 text-xs font-semibold capitalize transition ${group === key ? "bg-[#1c1c1e] text-white" : "bg-[#f7f8fa] text-[#555a6a] hover:bg-[#eef0f3]"}`}>{key === "signins" ? "Sign-ins" : key}</Link>)}
      </nav>

      <section className="miro-surface overflow-hidden">
        {events.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-[#eef0f3] bg-[#fafbfc] text-[10px] font-semibold uppercase tracking-[.16em] text-[#8e91a0]"><tr><th className="px-6 py-3">When</th><th className="px-6 py-3">Event</th><th className="px-6 py-3">Actor</th><th className="px-6 py-3">School</th><th className="px-6 py-3">IP</th></tr></thead>
              <tbody className="divide-y divide-[#eef0f3]">
                {events.map((event) => (
                  <tr key={event.id} className="align-top">
                    <td className="whitespace-nowrap px-6 py-4 text-xs text-[#6b6f7e]">{event.createdAt.toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}</td>
                    <td className="px-6 py-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${TONE[event.action] ?? "bg-[#e7edff] text-[#3550d6]"}`}>{LABELS[event.action] ?? event.action}</span>{event.metadata ? <p className="mt-2 max-w-md break-words font-mono text-[11px] text-[#8e91a0]">{JSON.stringify(event.metadata)}</p> : null}</td>
                    <td className="px-6 py-4 text-xs text-[#1c1c1e]">{event.actorEmail ?? "—"}</td>
                    <td className="px-6 py-4 text-xs text-[#1c1c1e]">{event.schoolId ? <Link href={`/dashboard/schools/${event.schoolId}`} className="text-[#4262ff] hover:underline">{schoolName.get(event.schoolId) ?? "Deleted school"}</Link> : "—"}</td>
                    <td className="px-6 py-4 font-mono text-[11px] text-[#8e91a0]">{event.ip ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="px-6 py-16 text-center text-sm text-[#8e91a0]">No events recorded yet.</p>}
      </section>
    </div>
  )
}
