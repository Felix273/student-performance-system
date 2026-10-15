import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { requireRole } from "@/lib/authorization"
import { sendEmail, isEmailDeliveryConfigured } from "@/lib/email/emailService"
import { prisma } from "@/lib/prisma"
import { clientIp, recordPlatformEvent } from "@/lib/platform/audit"

const COOLDOWN_MS = 60 * 1000

export async function POST(request: Request) {
  const access = requireRole(await auth(), ["SUPER_ADMIN"])
  if (!access.ok) return access.response

  if (!isEmailDeliveryConfigured()) {
    return NextResponse.json({ error: "Email is not configured. Add EMAIL_PROVIDER, provider credentials, and EMAIL_FROM in Vercel." }, { status: 503 })
  }

  const recent = await prisma.platformAuditEvent.findFirst({
    where: { actorId: access.user.id, action: "email.test_sent", createdAt: { gt: new Date(Date.now() - COOLDOWN_MS) } },
    select: { id: true },
  })
  if (recent) return NextResponse.json({ error: "Wait one minute before sending another test email." }, { status: 429 })

  const user = await prisma.user.findUnique({ where: { id: access.user.id }, select: { id: true, email: true } })
  if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 })

  const result = await sendEmail({
    to: user.email,
    subject: "Fentech StudentOS email delivery test",
    html: "<p>Email delivery is configured for Fentech StudentOS.</p><p>This test message was sent only to your signed-in account.</p>",
  })
  if (!result.success) return NextResponse.json({ error: "The provider could not send the test email. Check its credentials, verified sender, and provider logs." }, { status: 502 })

  await recordPlatformEvent({
    actor: { id: user.id, email: user.email },
    action: "email.test_sent",
    targetType: "User",
    targetId: user.id,
    metadata: { provider: process.env.EMAIL_PROVIDER?.trim().toLowerCase() ?? "ethereal" },
    ip: clientIp(request.headers),
  })

  return NextResponse.json({ ok: true, recipient: user.email, previewUrl: result.previewUrl })
}