import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await auth(); const access = requireRole(session, ["SCHOOL_ADMIN", "TEACHER", "PARENT"]); if (!access.ok) return access.response
    const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") || 20), 50)
    const notifications = await prisma.notification.findMany({ where: { recipientId: access.user.id }, orderBy: { createdAt: "desc" }, take: Number.isFinite(limit) ? limit : 20, select: { id: true, type: true, title: true, message: true, href: true, readAt: true, createdAt: true, student: { select: { id: true, name: true } } } })
    const unreadCount = await prisma.notification.count({ where: { recipientId: access.user.id, readAt: null } })
    return NextResponse.json({ notifications, unreadCount })
  } catch (error) { console.error("Notifications fetch error:", error); return NextResponse.json({ error: "Unable to load notifications" }, { status: 500 }) }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth(); const access = requireRole(session, ["SCHOOL_ADMIN", "TEACHER", "PARENT"]); if (!access.ok) return access.response
    const body = await request.json(); const ids = Array.isArray(body.ids) ? body.ids.filter((id: unknown): id is string => typeof id === "string") : []
    const where = ids.length ? { id: { in: ids }, recipientId: access.user.id } : { recipientId: access.user.id, readAt: null }
    const result = await prisma.notification.updateMany({ where, data: { readAt: new Date() } })
    return NextResponse.json({ updated: result.count })
  } catch (error) { console.error("Notifications update error:", error); return NextResponse.json({ error: "Unable to update notifications" }, { status: 500 }) }
}
