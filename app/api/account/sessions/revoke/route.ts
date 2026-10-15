import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireSignedIn } from "@/lib/authorization"
import { clientIp, recordPlatformEvent } from "@/lib/platform/audit"

export async function POST(request: Request) {
  const access = requireSignedIn(await auth())
  if (!access.ok) return access.response

  await prisma.user.update({ where: { id: access.user.id }, data: { sessionVersion: { increment: 1 } } })

  if (access.role === "SUPER_ADMIN" || access.role === "SCHOOL_ADMIN") {
    await recordPlatformEvent({ actor: { id: access.user.id, email: access.user.email }, action: "sessions.revoked", targetType: "User", targetId: access.user.id, schoolId: access.user.schoolId, ip: clientIp(request.headers) })
  }
  return NextResponse.json({ ok: true })
}
