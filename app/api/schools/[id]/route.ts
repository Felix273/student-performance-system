import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import { clientIp, recordPlatformEvent } from "@/lib/platform/audit"

const schoolSelect = { id: true, name: true, domain: true, createdAt: true, updatedAt: true } as const
const domainPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SUPER_ADMIN"])
    if (!access.ok) return access.response
    const { id } = await params
    const body = await request.json()
    const name = typeof body.name === "string" ? body.name.trim() : ""
    const domain = typeof body.domain === "string" ? body.domain.trim().toLowerCase() : ""
    if (name.length < 2 || name.length > 120) return NextResponse.json({ error: "School name must be between 2 and 120 characters" }, { status: 400 })
    if (!domainPattern.test(domain) || domain.length > 80) return NextResponse.json({ error: "Domain may contain lowercase letters, numbers, and single hyphens only" }, { status: 400 })

    const existing = await prisma.school.findUnique({ where: { id }, select: { id: true, name: true, domain: true } })
    if (!existing) return NextResponse.json({ error: "School not found" }, { status: 404 })
    const duplicate = await prisma.school.findFirst({ where: { domain, NOT: { id } }, select: { id: true } })
    if (duplicate) return NextResponse.json({ error: "Domain already exists" }, { status: 409 })

    const school = await prisma.school.update({ where: { id }, data: { name, domain }, select: schoolSelect })
    await recordPlatformEvent({
      actor: { id: access.user.id, email: access.user.email },
      action: "school.updated",
      targetType: "School",
      targetId: id,
      schoolId: id,
      metadata: { before: { name: existing.name, domain: existing.domain }, after: { name, domain } },
      ip: clientIp(request.headers),
    })
    return NextResponse.json({ school })
  } catch (error) {
    console.error("School update error:", error)
    return NextResponse.json({ error: "Unable to update school" }, { status: 500 })
  }
}
