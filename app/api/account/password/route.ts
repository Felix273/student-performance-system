import { NextResponse } from "next/server"
import { compare } from "bcryptjs"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireSignedIn } from "@/lib/authorization"
import { clientIp, recordPlatformEvent } from "@/lib/platform/audit"
import { hashPassword, passwordProblem } from "@/lib/security/password"

export async function POST(request: Request) {
  const access = requireSignedIn(await auth())
  if (!access.ok) return access.response

  const body = await request.json().catch(() => null)
  const current = typeof body?.currentPassword === "string" ? body.currentPassword : ""
  const next = body?.newPassword

  const user = await prisma.user.findUnique({ where: { id: access.user.id }, select: { id: true, email: true, name: true, password: true, schoolId: true, role: true } })
  if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 })

  if (!(await compare(current, user.password))) return NextResponse.json({ error: "Your current password is incorrect" }, { status: 400 })
  if (typeof next === "string" && next === current) return NextResponse.json({ error: "Choose a password different from the current one" }, { status: 400 })

  const problem = passwordProblem(next, { email: user.email, name: user.name })
  if (problem) return NextResponse.json({ error: problem }, { status: 400 })

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await hashPassword(next), passwordChangedAt: new Date(), mustChangePassword: false, sessionVersion: { increment: 1 } },
  })

  if (user.role === "SUPER_ADMIN" || user.role === "SCHOOL_ADMIN") {
    await recordPlatformEvent({ actor: { id: user.id, email: user.email }, action: "password.changed", targetType: "User", targetId: user.id, schoolId: user.schoolId, ip: clientIp(request.headers) })
  }

  // The caller signs out and back in: the session version just changed.
  return NextResponse.json({ ok: true })
}
