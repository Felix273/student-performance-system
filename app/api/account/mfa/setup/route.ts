import { NextResponse } from "next/server"
import QRCode from "qrcode"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireSignedIn } from "@/lib/authorization"
import { encryptSecret } from "@/lib/security/crypto"
import { generateTotpSecret, otpauthUri } from "@/lib/security/totp"

// Starts enrolment: stores a pending secret (MFA stays off until a code is verified).
export async function POST() {
  const access = requireSignedIn(await auth())
  if (!access.ok) return access.response
  if (access.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Two-factor authentication is only required for platform operators" }, { status: 403 })

  const user = await prisma.user.findUnique({ where: { id: access.user.id }, select: { email: true, mfaEnabled: true } })
  if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 })
  if (user.mfaEnabled) return NextResponse.json({ error: "Two-factor authentication is already on" }, { status: 409 })

  const secret = generateTotpSecret()
  await prisma.user.update({ where: { id: access.user.id }, data: { mfaSecret: encryptSecret(secret), mfaLastStep: null } })

  const qr = await QRCode.toDataURL(otpauthUri(secret, user.email), { margin: 1, width: 220 })
  return NextResponse.json({ secret, qr })
}
