import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { clientIp, recordPlatformEvent } from "@/lib/platform/audit"
import { hashPassword, passwordProblem } from "@/lib/security/password"
import { consumePasswordToken, peekPasswordToken } from "@/lib/security/tokens"

// GET lets the page show a clear message about an expired link before anyone types a password.
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? ""
  const record = await peekPasswordToken(token)
  if (!record) return NextResponse.json({ valid: false }, { status: 404 })
  return NextResponse.json({ valid: true, purpose: record.purpose, email: record.user.email, name: record.user.name })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const token = typeof body?.token === "string" ? body.token : ""
  const password = body?.password

  const preview = await peekPasswordToken(token)
  if (!preview) return NextResponse.json({ error: "This link is invalid or has expired. Request a new one." }, { status: 400 })

  const problem = passwordProblem(password, { email: preview.user.email, name: preview.user.name })
  if (problem) return NextResponse.json({ error: problem }, { status: 400 })

  const record = await consumePasswordToken(token)
  if (!record) return NextResponse.json({ error: "This link is invalid or has expired. Request a new one." }, { status: 400 })

  await prisma.user.update({
    where: { id: record.user.id },
    data: {
      password: await hashPassword(password),
      passwordChangedAt: new Date(),
      mustChangePassword: false,
      failedLoginCount: 0,
      lockedUntil: null,
      sessionVersion: { increment: 1 },
    },
  })
  // Any other outstanding links for this user are now stale.
  await prisma.passwordToken.deleteMany({ where: { userId: record.user.id, usedAt: null } })

  await recordPlatformEvent({
    actor: { id: record.user.id, email: record.user.email },
    action: record.purpose === "INVITE" ? "invite.accepted" : "password.reset_completed",
    targetType: "User",
    targetId: record.user.id,
    schoolId: record.user.schoolId,
    ip: clientIp(request.headers),
  })

  return NextResponse.json({ ok: true })
}
