import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { isEmailDeliveryConfigured, sendEmail } from "@/lib/email/emailService"
import { accountEmails } from "@/lib/email/accountEmails"
import { appOrigin, issuePasswordToken, RESET_TTL_MS, tokenLink } from "@/lib/security/tokens"

const RESEND_COOLDOWN_MS = 2 * 60 * 1000

// Always answers the same way so the form cannot be used to discover which emails have accounts.
const GENERIC = { message: "If an account exists for that email, a reset link has been sent." }

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
  if (!email || email.length > 254) return NextResponse.json(GENERIC)
  if (!isEmailDeliveryConfigured()) {
    return NextResponse.json({ error: "Password reset by email is not available yet. Ask your school administrator to reset your password." }, { status: 503 })
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true } })
  if (!user) return NextResponse.json(GENERIC)

  const recent = await prisma.passwordToken.findFirst({
    where: { userId: user.id, purpose: "RESET", createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_MS) } },
    select: { id: true },
  })
  if (recent) return NextResponse.json(GENERIC)

  const { token } = await issuePasswordToken({ userId: user.id, purpose: "RESET", createdById: user.id })
  const link = tokenLink(appOrigin(request), "RESET", token)
  const mail = accountEmails.reset(user.name, link, RESET_TTL_MS / 60000)
  await sendEmail({ to: user.email, subject: mail.subject, html: mail.html })

  return NextResponse.json(GENERIC)
}
