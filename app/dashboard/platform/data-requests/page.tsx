import { redirect } from "next/navigation"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import DataRequestManager from "./DataRequestManager"

export const metadata = { title: "Data governance requests · Fentech StudentOS" }

export default async function PlatformDataRequestsPage() {
  const session = await auth()
  if (session?.user.role !== "SUPER_ADMIN") redirect("/dashboard")
  const requests = await prisma.schoolDataRequest.findMany({ include: { school: { select: { id: true, name: true, domain: true } }, requestedBy: { select: { name: true, email: true } } }, orderBy: [{ status: "asc" }, { createdAt: "asc" }], take: 200 })
  return <div className="space-y-8 animate-fade-in"><header><p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#4262ff]">Platform governance</p><h1 className="mt-2 text-4xl font-medium tracking-[-.055em] sm:text-5xl">School data requests</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b6f7e]">Review school export/deletion requests, document decisions, and retain an audit trail.</p></header><DataRequestManager requests={requests.map((item) => ({ id: item.id, schoolId: item.schoolId, requestType: item.requestType, status: item.status, reason: item.reason, reviewNotes: item.reviewNotes, createdAt: item.createdAt.toISOString(), school: item.school, requestedBy: item.requestedBy }))} /></div>
}
