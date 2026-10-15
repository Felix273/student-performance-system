import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import { clientIp, recordPlatformEvent } from "@/lib/platform/audit"
import { sendAccountLink } from "@/lib/security/invites"

// Platform operators can recover a school administrator's access, and nobody else's.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
  try {
    const access = requireRole(await auth(), ["SUPER_ADMIN"])
    if (!access.ok) return access.response
    const { id, userId } = await params

    const admin = await prisma.user.findFirst({
      where: { id: userId, schoolId: id, role: "SCHOOL_ADMIN" },
      select: { id: true, name: true, email: true, school: { select: { name: true } } },
    })
    if (!admin) return NextResponse.json({ error: "School administrator not found" }, { status: 404 })

    const link = await sendAccountLink({ request, recipient: admin, purpose: "RESET", schoolName: admin.school?.name, createdById: access.user.id! })
    await recordPlatformEvent({
      actor: { id: access.user.id, email: access.user.email },
      action: "school_admin.reset_link_issued",
      targetType: "User",
      targetId: admin.id,
      schoolId: id,
      metadata: { email: admin.email, emailed: link.emailed, linkShownToOperator: !link.emailed },
      ip: clientIp(request.headers),
    })

    return NextResponse.json({ emailed: link.emailed, expiresAt: link.expiresAt, link: link.link })
  } catch (error) {
    console.error("Reset link error:", error)
    return NextResponse.json({ error: "Unable to create reset link" }, { status: 500 })
  }
}
