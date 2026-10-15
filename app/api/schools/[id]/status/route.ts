import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { clientIp, recordPlatformEvent } from "@/lib/platform/audit"
import { prisma } from "@/lib/prisma"

const STATUSES = new Set(["ACTIVE", "SUSPENDED", "ARCHIVED"])

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = requireRole(await auth(), ["SUPER_ADMIN"])
  if (!access.ok) return access.response

  const { id } = await params
  const body = await request.json().catch(() => null)
  const status = typeof body?.status === "string" ? body.status : ""
  const reason = typeof body?.reason === "string" ? body.reason.trim() : ""
  if (!STATUSES.has(status)) return NextResponse.json({ error: "Choose a valid school status" }, { status: 400 })
  if (status !== "ACTIVE" && (reason.length < 5 || reason.length > 500)) return NextResponse.json({ error: "Enter a reason of 5 to 500 characters" }, { status: 400 })

  try {
    const existing = await prisma.school.findUnique({ where: { id }, select: { id: true, name: true, status: true, statusReason: true } })
    if (!existing) return NextResponse.json({ error: "School not found" }, { status: 404 })
    if (existing.status === status) return NextResponse.json({ school: existing, unchanged: true })

    const school = await prisma.$transaction(async (tx) => {
      const updated = await tx.school.update({ where: { id }, data: { status, statusReason: status === "ACTIVE" ? null : reason, statusChangedAt: new Date() } })
      await tx.user.updateMany({ where: { schoolId: id }, data: { sessionVersion: { increment: 1 } } })
      return updated
    })

    await recordPlatformEvent({
      actor: { id: access.user.id, email: access.user.email },
      action: "school.status_changed",
      targetType: "School",
      targetId: id,
      schoolId: id,
      metadata: { before: { status: existing.status, reason: existing.statusReason }, after: { status: school.status, reason: school.statusReason } },
      ip: clientIp(request.headers),
    })
    return NextResponse.json({ school: { id: school.id, name: school.name, status: school.status, statusReason: school.statusReason, statusChangedAt: school.statusChangedAt } })
  } catch (error) {
    console.error("School lifecycle update error:", error)
    return NextResponse.json({ error: "Unable to update school status" }, { status: 500 })
  }
}