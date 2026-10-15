import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireSignedIn } from "@/lib/authorization"
import { clientIp, recordPlatformEvent } from "@/lib/platform/audit"
import { decryptSecret, randomUrlToken, sha256Hex } from "@/lib/security/crypto"
import { verifyTotp } from "@/lib/security/totp"

const RECOVERY_CODE_COUNT = 8

function newRecoveryCode() {
  // 10 characters from a URL-safe token, shown as xxxxx-xxxxx for readability.
  const raw = randomUrlToken(9).replace(/[^a-z0-9]/gi, "").toLowerCase().padEnd(10, "x").slice(0, 10)
  return `${raw.slice(0, 5)}-${raw.slice(5)}`
}

export async function POST(request: Request) {
  const access = requireSignedIn(await auth())
  if (!access.ok) return access.response
  if (access.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Not available for this account" }, { status: 403 })

  const body = await request.json().catch(() => null)
  const code = typeof body?.code === "string" ? body.code : ""

  const user = await prisma.user.findUnique({ where: { id: access.user.id }, select: { email: true, mfaEnabled: true, mfaSecret: true, schoolId: true } })
  if (!user?.mfaSecret) return NextResponse.json({ error: "Start setup again to get a new QR code" }, { status: 400 })
  if (user.mfaEnabled) return NextResponse.json({ error: "Two-factor authentication is already on" }, { status: 409 })

  const step = verifyTotp(decryptSecret(user.mfaSecret), code)
  if (step === null) return NextResponse.json({ error: "That code is not correct. Check the time on your phone and try again." }, { status: 400 })

  const recoveryCodes = Array.from({ length: RECOVERY_CODE_COUNT }, newRecoveryCode)
  await prisma.user.update({
    where: { id: access.user.id },
    data: {
      mfaEnabled: true,
      mfaLastStep: step,
      mfaRecoveryHashes: recoveryCodes.map((entry) => sha256Hex(entry.replace("-", ""))),
      sessionVersion: { increment: 1 },
    },
  })
  await recordPlatformEvent({ actor: { id: access.user.id, email: user.email }, action: "mfa.enabled", targetType: "User", targetId: access.user.id, ip: clientIp(request.headers) })

  // Shown once. Enabling bumps the session version, so the client signs in again with a code.
  return NextResponse.json({ recoveryCodes })
}
