import { redirect } from "next/navigation"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import AnnouncementManager from "./AnnouncementManager"

export const metadata = { title: "Announcements · Fentech StudentOS" }

export default async function AnnouncementsPage() {
  const session = await auth()
  if (session?.user.role !== "SUPER_ADMIN") redirect("/dashboard")
  const [announcements, schools] = await Promise.all([
    prisma.platformAnnouncement.findMany({ include: { school: { select: { name: true } } }, orderBy: [{ isActive: "desc" }, { startsAt: "desc" }], take: 200 }),
    prisma.school.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ])
  return <div className="space-y-8 animate-fade-in"><header><p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#4262ff]">Platform operations</p><h1 className="mt-2 text-4xl font-medium tracking-[-.055em] sm:text-5xl">Announcements</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b6f7e]">Publish a global or school-specific notice. Maintenance notices are shown as prominent banners in School Admin workspaces.</p></header><AnnouncementManager schools={schools} announcements={announcements.map((item) => ({ id: item.id, title: item.title, body: item.body, kind: item.kind, schoolId: item.schoolId, schoolName: item.school?.name ?? null, startsAt: item.startsAt.toISOString(), endsAt: item.endsAt?.toISOString() ?? null, isActive: item.isActive }))} /></div>
}