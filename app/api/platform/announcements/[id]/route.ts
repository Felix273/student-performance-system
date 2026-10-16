import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { clientIp, recordPlatformEvent } from "@/lib/platform/audit"
import { prisma } from "@/lib/prisma"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = requireRole(await auth(), ["SUPER_ADMIN"])
  if (!access.ok) return access.response
  const { id } = await params
  const body = await request.json().catch(() => null)
  if (typeof body?.isActive !== "boolean") return NextResponse.json({ error: "Provide the announcement active state" }, { status: 400 })
  const current = await prisma.platformAnnouncement.findUnique({ where: { id }, select: { id: true, schoolId: true, isActive: true, title: true } })
  if (!current) return NextResponse.json({ error: "Announcement not found" }, { status: 404 })
  const announcement = await prisma.platformAnnouncement.update({ where: { id }, data: { isActive: body.isActive } })
  await recordPlatformEvent({ actor: { id: access.user.id, email: access.user.email }, action: "platform.announcement_updated", targetType: "PlatformAnnouncement", targetId: id, schoolId: current.schoolId, metadata: { title: current.title, before: current.isActive, after: announcement.isActive }, ip: clientIp(request.headers) })
  return NextResponse.json({ announcement })
}