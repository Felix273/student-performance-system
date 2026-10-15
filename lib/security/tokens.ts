import { prisma } from "@/lib/prisma"
import { randomUrlToken, sha256Hex } from "@/lib/security/crypto"

export const RESET_TTL_MS = 60 * 60 * 1000
export const INVITE_TTL_MS = 72 * 60 * 60 * 1000

type Purpose = "RESET" | "INVITE"

/** Replaces any outstanding token of the same purpose so only the newest link works. */
export async function issuePasswordToken(input: { userId: string; purpose: Purpose; createdById?: string | null; ttlMs?: number }) {
  const token = randomUrlToken(32)
  const expiresAt = new Date(Date.now() + (input.ttlMs ?? (input.purpose === "INVITE" ? INVITE_TTL_MS : RESET_TTL_MS)))
  await prisma.$transaction([
    prisma.passwordToken.deleteMany({ where: { userId: input.userId, purpose: input.purpose, usedAt: null } }),
    prisma.passwordToken.create({ data: { userId: input.userId, purpose: input.purpose, tokenHash: sha256Hex(token), expiresAt, createdById: input.createdById ?? null } }),
  ])
  return { token, expiresAt }
}

/** Checks a token without spending it, so the reset page can show a clear message before the user types a password. */
export async function peekPasswordToken(token: string) {
  if (!token || token.length > 200) return null
  const record = await prisma.passwordToken.findUnique({ where: { tokenHash: sha256Hex(token) }, select: { id: true, purpose: true, expiresAt: true, usedAt: true, user: { select: { id: true, email: true, name: true, role: true, schoolId: true } } } })
  if (!record || record.usedAt || record.expiresAt <= new Date()) return null
  return record
}

/** Spends a token exactly once; concurrent attempts cannot both succeed. */
export async function consumePasswordToken(token: string) {
  const record = await peekPasswordToken(token)
  if (!record) return null
  const spent = await prisma.passwordToken.updateMany({ where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } })
  return spent.count === 1 ? record : null
}

export function appOrigin(request: Request) {
  const configured = process.env.NEXTAUTH_URL?.replace(/\/$/, "")
  return configured || new URL(request.url).origin
}

export function tokenLink(origin: string, purpose: Purpose, token: string) {
  return `${origin}/reset-password?token=${encodeURIComponent(token)}${purpose === "INVITE" ? "&invite=1" : ""}`
}
