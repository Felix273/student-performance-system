import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { clientIp, recordPlatformEvent } from "@/lib/platform/audit"
import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"

export const metadata = { title: "Read-only support diagnostics · Fentech StudentOS" }

export default async function SupportDiagnosticsPage({ params }: { params: Promise<{ id: string }> }) {
  const access = requireRole(await auth(), ["SUPER_ADMIN"])
  if (!access.ok) redirect("/dashboard")
  const { id } = await params
  const now = new Date()
  const grant = await prisma.supportAccessGrant.findFirst({
    where: { id, scope: "READ_ONLY_DIAGNOSTICS", status: "APPROVED", revokedAt: null, expiresAt: { gt: now } },
    select: { id: true, schoolId: true, purpose: true, expiresAt: true, school: { select: { id: true, name: true, domain: true, status: true, schoolLevel: true, county: true, timezone: true, createdAt: true, _count: { select: { students: true, classes: true, subjects: true, academicYears: true, curriculumOfferings: true, timetableEntries: true } }, subscription: { include: { plan: true } } } } },
  })
  if (!grant) notFound()
  const [staffCount, assignedTeachers] = await Promise.all([
    prisma.user.count({ where: { schoolId: grant.schoolId, role: { in: ["SCHOOL_ADMIN", "TEACHER"] } } }),
    prisma.teacherClass.findMany({ where: { teacher: { role: "TEACHER" }, class: { schoolId: grant.schoolId } }, select: { teacherId: true }, distinct: ["teacherId", "classId"] }),
  ])
  await recordPlatformEvent({ actor: { id: access.user.id, email: access.user.email }, action: "support.accessed", targetType: "SupportAccessGrant", targetId: grant.id, schoolId: grant.schoolId, metadata: { scope: "READ_ONLY_DIAGNOSTICS", expiresAt: grant.expiresAt?.toISOString() }, ip: clientIp(await headers()) })
  const school = grant.school
  const cards: [string, string | number][] = [
    ["Students", school._count.students], ["Classes", school._count.classes], ["Subjects", school._count.subjects],
    ["Staff accounts", staffCount], ["Teachers assigned", assignedTeachers.length], ["Academic years", school._count.academicYears],
    ["Curriculum offerings", school._count.curriculumOfferings], ["Timetable entries", school._count.timetableEntries],
    ["School status", school.status], ["Subscription", school.subscription ? `${school.subscription.plan.name} · ${school.subscription.status}` : "Not configured"],
  ]

  return <div className="space-y-8 animate-fade-in"><header className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e0e2e8] pb-6"><div><p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#4262ff]">Consent-based support · read-only</p><h1 className="mt-2 text-3xl font-medium tracking-[-.04em]">{school.name}</h1><p className="mt-2 text-sm text-[#6b6f7e]">{school.domain} · {school.schoolLevel ?? "Level not set"} · {school.county ?? "County not set"} · {school.timezone}</p><p className="mt-3 max-w-2xl text-sm leading-6 text-[#555a6a]">Requested support: {grant.purpose}</p></div><div className="rounded-xl bg-[#fff4c4] px-4 py-3 text-xs font-semibold text-[#746019]">Expires {grant.expiresAt?.toLocaleString()}</div></header><section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value]) => <div key={label} className="rounded-xl bg-[#f7f8fa] p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#8e91a0]">{label}</p><p className="mt-2 text-lg font-semibold text-[#1c1c1e]">{value}</p></div>)}</section><p className="rounded-xl border border-[#e8ebef] px-4 py-3 text-xs leading-5 text-[#6b6f7e]">This page contains aggregate configuration only. It cannot reveal learner/staff records, change tenant data, or impersonate users. Access is audited.</p></div>
}
