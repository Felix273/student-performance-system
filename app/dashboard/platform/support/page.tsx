import { redirect } from "next/navigation"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import SupportManager from "./SupportManager"

export const metadata = { title: "Support access · Fentech StudentOS" }

export default async function PlatformSupportPage() {
  const session = await auth()
  if (session?.user.role !== "SUPER_ADMIN") redirect("/dashboard")
  const grants = await prisma.supportAccessGrant.findMany({
    where: { status: { in: ["PENDING", "APPROVED"] } },
    include: { school: { select: { id: true, name: true, domain: true, status: true } }, requestedBy: { select: { name: true, email: true } } },
    orderBy: { requestedAt: "desc" },
    take: 100,
  })
  const now = Date.now()
  const currentGrants = grants.filter((grant) => grant.status === "PENDING" || Boolean(grant.expiresAt && grant.expiresAt.getTime() > now && !grant.revokedAt))
  return <div className="space-y-8 animate-fade-in"><header><p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#4262ff]">Platform security</p><h1 className="mt-2 text-4xl font-medium tracking-[-.055em] sm:text-5xl">Support access</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b6f7e]">School Admin consent is required. Approved access is read-only diagnostics, expires within 30 minutes, and is audited on every view. There is no impersonation or learner-record access.</p></header><SupportManager grants={currentGrants.map((grant) => ({ id: grant.id, schoolId: grant.schoolId, status: grant.status, purpose: grant.purpose, requestedAt: grant.requestedAt.toISOString(), expiresAt: grant.expiresAt?.toISOString() ?? null, revokedAt: grant.revokedAt?.toISOString() ?? null, school: grant.school, requestedBy: grant.requestedBy, approvedBy: null }))} /></div>
}
