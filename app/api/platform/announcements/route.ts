import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { clientIp, recordPlatformEvent } from "@/lib/platform/audit"
import { notifyMaintenanceAdmins } from "@/lib/email/maintenanceNotice"
import { prisma } from "@/lib/prisma"

const KINDS = new Set(["ANNOUNCEMENT", "MAINTENANCE"])

export async function GET() {
  const access = requireRole(await auth(), ["SUPER_ADMIN"])
  if (!access.ok) return access.response
  const announcements = await prisma.platformAnnouncement.findMany({ include: { school: { select: { name: true } } }, orderBy: [{ isActive: "desc" }, { startsAt: "desc" }], take: 200 })
  return NextResponse.json(announcements)
}

export async function POST(request: NextRequest) {
  const access = requireRole(await auth(), ["SUPER_ADMIN"])
  if (!access.ok) return access.response
  const body = await request.json().catch(() => null)
  const title = typeof body?.title === "string" ? body.title.trim() : ""
  const content = typeof body?.body === "string" ? body.body.trim() : ""
  const kind = typeof body?.kind === "string" ? body.kind : ""
  const schoolId = body?.schoolId === "" || body?.schoolId === undefined ? null : body.schoolId
  const startsAt = body?.startsAt ? new Date(body.startsAt) : new Date()
  const endsAt = body?.endsAt ? new Date(body.endsAt) : null
  if (title.length < 4 || title.length > 120 || content.length < 10 || content.length > 4000) return NextResponse.json({ error: "Title must be 4–120 characters and message 10–4,000 characters" }, { status: 400 })
  if (!KINDS.has(kind)) return NextResponse.json({ error: "Choose announcement or maintenance" }, { status: 400 })
  if (!(startsAt instanceof Date) || !Number.isFinite(startsAt.getTime()) || (endsAt && !Number.isFinite(endsAt.getTime())) || (endsAt && endsAt <= startsAt)) return NextResponse.json({ error: "Choose a valid schedule window" }, { status: 400 })
  if (schoolId !== null && typeof schoolId !== "string") return NextResponse.json({ error: "Invalid school selection" }, { status: 400 })
  if (schoolId && !(await prisma.school.findUnique({ where: { id: schoolId }, select: { id: true } }))) return NextResponse.json({ error: "School not found" }, { status: 404 })

  const announcement = await prisma.platformAnnouncement.create({ data: { title, body: content, kind, schoolId, startsAt, endsAt, createdById: access.user.id }, include: { school: { select: { name: true } } } })
  let emailNotification: { recipients: number; sent: number; failed: number; unavailable?: boolean; skipped?: boolean } | null = null
  if (kind === "MAINTENANCE") {
    if (endsAt && endsAt <= new Date()) {
      emailNotification = { recipients: 0, sent: 0, failed: 0, skipped: true }
    } else {
      try {
        emailNotification = await notifyMaintenanceAdmins({ title, body: content, schoolId, startsAt, endsAt })
      } catch (error) {
        console.error("Maintenance notice was published but email delivery could not be completed", error)
        emailNotification = { recipients: 0, sent: 0, failed: 0, unavailable: true }
      }
    }
  }
  await recordPlatformEvent({ actor: { id: access.user.id, email: access.user.email }, action: "platform.announcement_created", targetType: "PlatformAnnouncement", targetId: announcement.id, schoolId, metadata: { title, kind, startsAt: startsAt.toISOString(), endsAt: endsAt?.toISOString() ?? null, ...(emailNotification ? { emailNotification } : {}) }, ip: clientIp(request.headers) })
  return NextResponse.json({ announcement, emailNotification }, { status: 201 })
}