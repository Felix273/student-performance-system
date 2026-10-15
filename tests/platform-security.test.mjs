import assert from "node:assert/strict"
import test from "node:test"
import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { randomUUID } from "node:crypto"
import "dotenv/config"

const testDatabaseUrl = process.env.TEST_DATABASE_URL
const databaseIdentity = (value) => {
  const url = new URL(value)
  return `${url.hostname.replace("-pooler.", ".")}:${url.port}${url.pathname}`
}
if (testDatabaseUrl && process.env.DATABASE_URL && databaseIdentity(testDatabaseUrl) === databaseIdentity(process.env.DATABASE_URL)) {
  throw new Error("TEST_DATABASE_URL must be a dedicated database, not DATABASE_URL")
}
if (testDatabaseUrl) process.env.DATABASE_URL = testDatabaseUrl
process.env.NEXTAUTH_SECRET ||= "test-secret-for-platform-security"

process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: "CommonJS", moduleResolution: "node" })
const require = createRequire(import.meta.url)
const Module = require("node:module")
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const resolveFilename = Module._resolveFilename
Module._resolveFilename = function (specifier, parent, isMain, options) {
  const mapped = specifier.startsWith("@/") ? path.join(root, specifier.slice(2)) : specifier
  return resolveFilename.call(this, mapped, parent, isMain, options)
}
require("ts-node/register/transpile-only")

// next-auth ships ESM that Node cannot load outside Next's bundler; the verifier only needs the error base class.
const nextAuthPath = require.resolve("next-auth")
require.cache[nextAuthPath] = { id: nextAuthPath, filename: nextAuthPath, loaded: true, exports: { CredentialsSignin: class CredentialsSignin extends Error {} } }

const totp = require("../lib/security/totp.ts")
const crypto = require("../lib/security/crypto.ts")
const password = require("../lib/security/password.ts")
const { scoreReadiness } = require("../lib/platform/readiness.ts")
const { isEmailDeliveryConfigured } = require("../lib/email/emailService.ts")

test("TOTP matches the RFC 6238 SHA-1 test vectors", () => {
  const secret = totp.base32Encode(Buffer.from("12345678901234567890"))
  const vectors = [[59, "287082"], [1111111109, "081804"], [1111111111, "050471"], [1234567890, "005924"], [2000000000, "279037"]]
  for (const [seconds, expected] of vectors) assert.equal(totp.totpCode(secret, seconds * 1000), expected)
})

test("TOTP accepts one step of drift but never replays a used step", () => {
  const secret = totp.generateTotpSecret()
  const now = 1_700_000_000_000
  const step = totp.totpStep(now)
  const code = totp.totpCode(secret, now)
  assert.equal(totp.verifyTotp(secret, code, { timeMs: now }), step)
  assert.equal(totp.verifyTotp(secret, totp.totpCode(secret, now - 30_000), { timeMs: now }), step - 1)
  assert.equal(totp.verifyTotp(secret, code, { timeMs: now, lastStep: step }), null)
  assert.equal(totp.verifyTotp(secret, totp.totpCode(secret, now - 120_000), { timeMs: now }), null)
  assert.equal(totp.verifyTotp(secret, "abc123", { timeMs: now }), null)
})

test("secrets round-trip through encryption and tampering is rejected", () => {
  const sealed = crypto.encryptSecret("JBSWY3DPEHPK3PXP")
  assert.notEqual(sealed, "JBSWY3DPEHPK3PXP")
  assert.equal(crypto.decryptSecret(sealed), "JBSWY3DPEHPK3PXP")
  assert.notEqual(crypto.encryptSecret("JBSWY3DPEHPK3PXP"), sealed, "each encryption uses a fresh IV")
  const parts = sealed.split(".")
  parts[3] = Buffer.from("tampered").toString("base64url")
  assert.throws(() => crypto.decryptSecret(parts.join(".")))
})

test("password policy", () => {
  assert.ok(password.passwordProblem("short"))
  assert.ok(password.passwordProblem("aaaaaaaaaaaaaaaa"))
  assert.ok(password.passwordProblem("password12345"))
  assert.ok(password.passwordProblem("my-felix-secret-1", { email: "felix@example.com" }))
  assert.equal(password.passwordProblem("correct horse battery staple"), null)
})

test("API access is refused until a temporary password is replaced and operators enrol MFA", () => {
  const { requireRole, requireSignedIn } = require("../lib/authorization.ts")
  const session = (user) => ({ user: { id: "u1", email: "u@example.test", ...user } })

  assert.equal(requireRole(session({ role: "SUPER_ADMIN", mfaEnabled: false }), ["SUPER_ADMIN"]).ok, false)
  assert.equal(requireRole(session({ role: "SUPER_ADMIN", mfaEnabled: true }), ["SUPER_ADMIN"]).ok, true)
  assert.equal(requireRole(session({ role: "TEACHER", schoolId: "s1", mustChangePassword: true }), ["TEACHER"]).ok, false)
  assert.equal(requireRole(session({ role: "TEACHER", schoolId: "s1" }), ["TEACHER"]).ok, true)
  // The account endpoints themselves must stay reachable while those steps are pending.
  assert.equal(requireSignedIn(session({ role: "SUPER_ADMIN", mfaEnabled: false })).ok, true)
  assert.equal(requireSignedIn(session({ role: "TEACHER", mustChangePassword: true })).ok, true)
  assert.equal(requireSignedIn(null).ok, false)
})

test("readiness counts a school administrator, not just any user", () => {
  const none = scoreReadiness({ admins: 0, classes: 1, curriculum: 1, timetable: 1 })
  assert.equal(none.score, 75)
  assert.equal(none.ready, false)
  assert.equal(none.checks[0].complete, false)
  assert.equal(scoreReadiness({ admins: 1, classes: 1, curriculum: 1, timetable: 1 }).ready, true)
})

test("production email requires a supported provider, credentials, and sender", () => {
  const keys = ["NODE_ENV", "EMAIL_PROVIDER", "RESEND_API_KEY", "EMAIL_FROM", "GMAIL_USER", "GMAIL_APP_PASSWORD"]
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]))
  try {
    process.env.NODE_ENV = "production"
    process.env.EMAIL_PROVIDER = "resend"
    process.env.RESEND_API_KEY = "re_test"
    process.env.EMAIL_FROM = "Fentech StudentOS <accounts@example.com>"
    assert.equal(isEmailDeliveryConfigured(), true)

    delete process.env.EMAIL_FROM
    assert.equal(isEmailDeliveryConfigured(), false)
    process.env.EMAIL_PROVIDER = "unknown"
    assert.equal(isEmailDeliveryConfigured(), false)

    process.env.EMAIL_PROVIDER = "gmail"
    process.env.GMAIL_USER = "accounts@example.com"
    process.env.GMAIL_APP_PASSWORD = "test-app-password"
    assert.equal(isEmailDeliveryConfigured(), false, "Gmail also requires EMAIL_FROM")
    process.env.EMAIL_FROM = "accounts@example.com"
    assert.equal(isEmailDeliveryConfigured(), true)

    process.env.NODE_ENV = "development"
    delete process.env.EMAIL_PROVIDER
    delete process.env.RESEND_API_KEY
    delete process.env.GMAIL_USER
    delete process.env.GMAIL_APP_PASSWORD
    delete process.env.EMAIL_FROM
    assert.equal(isEmailDeliveryConfigured(), true, "development can use Ethereal")
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key]
      else process.env[key] = previous[key]
    }
  }
})

test("account recovery, lockout and MFA against a dedicated database", { skip: !testDatabaseUrl && "Set TEST_DATABASE_URL to a dedicated pre-migrated database" }, async () => {
  const { prisma } = require("../lib/prisma.ts")
  const { hash } = require("bcryptjs")
  const credentials = require("../lib/auth/credentials.ts")
  const tokens = require("../lib/security/tokens.ts")
  const { loadAdminCounts } = require("../lib/platform/readiness.ts")

  const tag = randomUUID().slice(0, 8)
  const school = await prisma.school.create({ data: { name: `Security ${tag}`, domain: `security-${tag}` } })
  const pw = await hash("correct horse battery staple", 4)
  const teacher = await prisma.user.create({ data: { email: `teacher-${tag}@example.test`, name: "Teacher", role: "TEACHER", password: pw, schoolId: school.id } })
  const admin = await prisma.user.create({ data: { email: `Admin-${tag}@Example.test`.toLowerCase(), name: "Admin", role: "SCHOOL_ADMIN", password: pw, schoolId: school.id } })

  try {
    // Readiness: a teacher alone is not an administrator.
    const adminsBefore = await loadAdminCounts([school.id])
    assert.equal(adminsBefore.get(school.id), 1)

    // Wrong passwords lock the account after five attempts, even when the right one follows.
    for (let attempt = 0; attempt < 5; attempt++) {
      assert.equal(await credentials.verifyCredentials({ email: admin.email, password: "wrong-password" }), null)
    }
    await assert.rejects(credentials.verifyCredentials({ email: admin.email, password: "correct horse battery staple" }), (error) => error.code === "account_locked")
    const audited = await prisma.platformAuditEvent.findMany({ where: { actorId: admin.id } })
    assert.ok(audited.some((event) => event.action === "login.locked"))

    // An expired lock lets the owner back in and clears the counters.
    await prisma.user.update({ where: { id: admin.id }, data: { lockedUntil: new Date(Date.now() - 1000) } })
    const signedIn = await credentials.verifyCredentials({ email: admin.email, password: "correct horse battery staple" })
    assert.equal(signedIn?.id, admin.id)
    assert.equal((await prisma.user.findUnique({ where: { id: admin.id } })).failedLoginCount, 0)

    // Unknown emails and non-lockable lookups behave identically to a bad password.
    assert.equal(await credentials.verifyCredentials({ email: `nobody-${tag}@example.test`, password: "whatever-whatever" }), null)

    // Reset tokens work once, expire, and the newest link replaces older ones.
    const first = await tokens.issuePasswordToken({ userId: teacher.id, purpose: "RESET" })
    const second = await tokens.issuePasswordToken({ userId: teacher.id, purpose: "RESET" })
    assert.equal(await tokens.consumePasswordToken(first.token), null, "an older link is revoked by a newer one")
    assert.ok(await tokens.consumePasswordToken(second.token))
    assert.equal(await tokens.consumePasswordToken(second.token), null, "a link cannot be reused")
    const expired = await tokens.issuePasswordToken({ userId: teacher.id, purpose: "RESET", ttlMs: -1000 })
    assert.equal(await tokens.consumePasswordToken(expired.token), null)
    assert.equal(await tokens.peekPasswordToken("not-a-real-token"), null)

    // MFA: required once enabled, a code works once, recovery codes are single use.
    const { encryptSecret, sha256Hex } = require("../lib/security/crypto.ts")
    const secret = totp.generateTotpSecret()
    await prisma.user.update({ where: { id: admin.id }, data: { mfaEnabled: true, mfaSecret: encryptSecret(secret), mfaRecoveryHashes: [sha256Hex("abcde12345")] } })
    await assert.rejects(credentials.verifyCredentials({ email: admin.email, password: "correct horse battery staple" }), (error) => error.code === "mfa_required")
    await assert.rejects(credentials.verifyCredentials({ email: admin.email, password: "correct horse battery staple", code: "000000" }), (error) => error.code === "invalid_code")
    const code = totp.totpCode(secret)
    assert.equal((await credentials.verifyCredentials({ email: admin.email, password: "correct horse battery staple", code }))?.id, admin.id)
    await assert.rejects(credentials.verifyCredentials({ email: admin.email, password: "correct horse battery staple", code }), (error) => error.code === "invalid_code", "the same code cannot be replayed")
    assert.equal((await credentials.verifyCredentials({ email: admin.email, password: "correct horse battery staple", code: "abcde-12345" }))?.id, admin.id)
    await assert.rejects(credentials.verifyCredentials({ email: admin.email, password: "correct horse battery staple", code: "abcde-12345" }), (error) => error.code === "invalid_code", "a recovery code works once")
  } finally {
    await prisma.platformAuditEvent.deleteMany({ where: { actorId: { in: [admin.id, teacher.id] } } })
    await prisma.user.deleteMany({ where: { schoolId: school.id } })
    await prisma.school.delete({ where: { id: school.id } })
    await prisma.$disconnect()
  }
})
