import { compare, hash } from "bcryptjs"
import { CredentialsSignin } from "next-auth"
import { prisma } from "@/lib/prisma"
import { isUserRole } from "@/lib/authorization"
import { recordPlatformEvent } from "@/lib/platform/audit"
import { decryptSecret, sha256Hex } from "@/lib/security/crypto"
import { verifyTotp } from "@/lib/security/totp"

export const MAX_FAILED_LOGINS = 5
export const LOCKOUT_MS = 15 * 60 * 1000

export class MfaRequired extends CredentialsSignin { code = "mfa_required" }
export class InvalidCode extends CredentialsSignin { code = "invalid_code" }
export class AccountLocked extends CredentialsSignin { code = "account_locked" }

// Burns the same CPU as a real check so unknown emails are not distinguishable by timing.
let dummyHash: Promise<string> | null = null
async function burnPasswordCheck(password: string) {
  dummyHash ??= hash("not-a-real-password", 12)
  await compare(password, await dummyHash)
}

const PRIVILEGED = new Set(["SUPER_ADMIN", "SCHOOL_ADMIN"])

type Attempt = { email: string; password: string; code?: string; ip?: string | null }

export async function verifyCredentials({ email, password, code, ip }: Attempt) {
  const normalized = email.trim().toLowerCase()
  const user = await prisma.user.findUnique({ where: { email: normalized }, include: { school: true } })

  if (!user || !isUserRole(user.role)) {
    await burnPasswordCheck(password)
    return null
  }

  const privileged = PRIVILEGED.has(user.role)
  const actor = { id: user.id, email: user.email }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new AccountLocked()
  }

  const passwordOk = await compare(password, user.password)
  if (!passwordOk) {
    await registerFailure(user.id, user.failedLoginCount, user.lockedUntil, privileged, actor, ip, "password")
    return null
  }

  if (user.mfaEnabled && user.mfaSecret) {
    if (!code?.trim()) throw new MfaRequired()

    const mfa = await checkSecondFactor(user, code)
    if (!mfa.ok) {
      await registerFailure(user.id, user.failedLoginCount, user.lockedUntil, privileged, actor, ip, "mfa")
      throw new InvalidCode()
    }
  }

  await prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() } })
  if (privileged) await recordPlatformEvent({ actor, action: "login.succeeded", targetType: "User", targetId: user.id, schoolId: user.schoolId, ip })

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    schoolId: user.schoolId,
    schoolName: user.school?.name,
  }
}

async function checkSecondFactor(user: { id: string; mfaSecret: string | null; mfaLastStep: number | null; mfaRecoveryHashes: string[] }, code: string) {
  const trimmed = code.trim()

  if (/^\d{3}\s?\d{3}$/.test(trimmed)) {
    const step = verifyTotp(decryptSecret(user.mfaSecret as string), trimmed, { lastStep: user.mfaLastStep })
    if (step === null) return { ok: false as const }
    // Conditional write: a replayed code loses the race and fails.
    const claimed = await prisma.user.updateMany({
      where: { id: user.id, OR: [{ mfaLastStep: null }, { mfaLastStep: { lt: step } }] },
      data: { mfaLastStep: step },
    })
    return { ok: claimed.count === 1 }
  }

  const hashed = sha256Hex(trimmed.toLowerCase().replace(/\s|-/g, ""))
  if (!user.mfaRecoveryHashes.includes(hashed)) return { ok: false as const }
  const claimed = await prisma.user.updateMany({
    where: { id: user.id, mfaRecoveryHashes: { has: hashed } },
    data: { mfaRecoveryHashes: user.mfaRecoveryHashes.filter((entry) => entry !== hashed) },
  })
  return { ok: claimed.count === 1 }
}

async function registerFailure(
  userId: string,
  previousCount: number,
  previousLock: Date | null,
  privileged: boolean,
  actor: { id: string; email: string },
  ip: string | null | undefined,
  stage: "password" | "mfa",
) {
  // A lock that already expired starts a fresh count.
  const base = previousLock && previousLock <= new Date() ? 0 : previousCount
  const count = base + 1
  const lock = count >= MAX_FAILED_LOGINS
  await prisma.user.update({
    where: { id: userId },
    data: { failedLoginCount: lock ? 0 : count, lockedUntil: lock ? new Date(Date.now() + LOCKOUT_MS) : null },
  })
  if (privileged) {
    await recordPlatformEvent({
      actor,
      action: lock ? "login.locked" : stage === "mfa" ? "login.mfa_failed" : "login.failed",
      targetType: "User",
      targetId: userId,
      metadata: { attempts: count },
      ip,
    })
  }
}
