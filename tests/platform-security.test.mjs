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
const { buildKenyaCbcReferenceNodes, kenyaCbcReferenceSummary } = require("../lib/curriculum/kenyaCbcReference.ts")

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

test("readiness counts administrator sign-in, academic setup, and assigned teachers", () => {
  const none = scoreReadiness({ admins: 0, adminSignIns: 0, academicYears: 1, classes: 1, subjects: 1, assignedTeachers: 1, curriculum: 1, timetable: 1 })
  assert.equal(none.score, 75)
  assert.equal(none.ready, false)
  assert.equal(none.checks[0].complete, false)
  assert.equal(none.checks[1].complete, false)
  const adminNeverSignedIn = scoreReadiness({ admins: 1, adminSignIns: 0, academicYears: 1, classes: 1, subjects: 1, assignedTeachers: 1, curriculum: 1, timetable: 1 })
  assert.equal(adminNeverSignedIn.score, 88)
  assert.equal(adminNeverSignedIn.checks[1].complete, false)
  assert.equal(scoreReadiness({ admins: 1, adminSignIns: 1, academicYears: 1, classes: 1, subjects: 1, assignedTeachers: 1, curriculum: 1, timetable: 1 }).ready, true)
})

test("Kenya CBC reference is one ordered stage-to-grade-to-learning-area framework", () => {
  const nodes = buildKenyaCbcReferenceNodes()
  const grades = nodes.filter((node) => node.nodeType === "GRADE")
  const pathways = nodes.filter((node) => node.nodeType === "PATHWAY" && node.parentCode === "SENIOR-SCHOOL")
  const tracks = nodes.filter((node) => node.metadata?.structureType === "TRACK")
  const gradeThree = nodes.find((node) => node.title === "Grade 3")
  const gradeTwelve = nodes.find((node) => node.title === "Grade 12")

  assert.equal(kenyaCbcReferenceSummary().version, "2026.10")
  assert.deepEqual(kenyaCbcReferenceSummary().stages.map((stage) => stage.title), ["Pre-Primary", "Lower Primary", "Upper Primary", "Junior School", "Senior School"])
  assert.equal(grades.length, 14)
  assert.deepEqual(pathways.map((node) => node.title), ["STEM", "Social Sciences", "Arts & Sports Science"])
  assert.equal(tracks.length, 7)
  assert.equal(gradeThree?.metadata?.milestones?.[0]?.mainstream, "Kenya Early Years Assessment (KEYA)")
  assert.equal(gradeTwelve?.metadata?.milestones?.[0]?.mainstream, "Kenya Certificate of Basic Education (KCBE)")
  assert.equal(new Set(nodes.map((node) => node.code)).size, nodes.length)
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
  let activeSession = null
  const authConfigPath = require.resolve("../lib/auth-config.ts")
  require.cache[authConfigPath] = { id: authConfigPath, filename: authConfigPath, loaded: true, exports: { auth: async () => activeSession } }
  const { prisma } = require("../lib/prisma.ts")
  const { hash } = require("bcryptjs")
  const credentials = require("../lib/auth/credentials.ts")
  const tokens = require("../lib/security/tokens.ts")
  const { loadReadinessPeopleCounts } = require("../lib/platform/readiness.ts")
  const schoolStatusRoute = require("../app/api/schools/[id]/status/route.ts")
  const cbcStarterRoute = require("../app/api/schools/[id]/cbc-starter/route.ts")
  const operatorRoute = require("../app/api/platform/operators/[id]/route.ts")

  const tag = randomUUID().slice(0, 8)
  const school = await prisma.school.create({ data: { name: `Security ${tag}`, domain: `security-${tag}` } })
  const pw = await hash("correct horse battery staple", 4)
  const teacher = await prisma.user.create({ data: { email: `teacher-${tag}@example.test`, name: "Teacher", role: "TEACHER", password: pw, schoolId: school.id } })
  const admin = await prisma.user.create({ data: { email: `Admin-${tag}@Example.test`.toLowerCase(), name: "Admin", role: "SCHOOL_ADMIN", password: pw, schoolId: school.id } })
  const classroom = await prisma.class.create({ data: { name: `Class ${tag}`, grade: "Grade 1", schoolId: school.id } })
  await prisma.teacherClass.create({ data: { teacherId: teacher.id, classId: classroom.id } })
  const operator = await prisma.user.create({ data: { email: `operator-${tag}@example.test`, name: "Platform Operator", role: "SUPER_ADMIN", password: pw, mfaEnabled: true } })
  let secondOperator = null
  let curriculum = await prisma.curriculum.findUnique({ where: { code: "CBC" } })
  let createdCurriculum = false
  if (!curriculum) {
    curriculum = await prisma.curriculum.create({ data: { code: "CBC", name: "Kenya CBC", country: "Kenya", isSystem: true } })
    createdCurriculum = true
  }
  const curriculumVersion = await prisma.curriculumVersion.create({ data: { curriculumId: curriculum.id, version: `TEST-${tag}`, status: "PUBLISHED", effectiveFrom: new Date("2099-01-01T00:00:00.000Z") } })
  await prisma.curriculumNode.createMany({ data: [
    { curriculumVersionId: curriculumVersion.id, code: `GRADE-1-${tag}`, title: "Grade 1", nodeType: "GRADE", sequence: 1 },
    { curriculumVersionId: curriculumVersion.id, code: `GRADE-2-${tag}`, title: "Grade 2", nodeType: "GRADE", sequence: 2 },
  ] })

  try {
    const peopleBefore = (await loadReadinessPeopleCounts([school.id])).get(school.id)
    assert.equal(peopleBefore.admins, 1)
    assert.equal(peopleBefore.adminSignIns, 0)
    assert.equal(peopleBefore.assignedTeachers, 1)

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
    assert.equal((await loadReadinessPeopleCounts([school.id])).get(school.id).adminSignIns, 1)

    activeSession = { user: { id: operator.id, email: operator.email, role: "SUPER_ADMIN", mfaEnabled: true } }
    const statusResponse = await schoolStatusRoute.POST(new Request("http://local/api/schools/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "SUSPENDED", reason: "Testing planned suspension" }) }), { params: Promise.resolve({ id: school.id }) })
    assert.equal(statusResponse.status, 200)
    const statusAfterSuspend = await prisma.user.findUnique({ where: { id: admin.id }, select: { sessionVersion: true } })
    assert.equal(statusAfterSuspend.sessionVersion, 1, "suspension revokes existing sessions")
    await assert.rejects(credentials.verifyCredentials({ email: admin.email, password: "correct horse battery staple" }), (error) => error.code === "account_unavailable")
    const reactivateResponse = await schoolStatusRoute.POST(new Request("http://local/api/schools/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "ACTIVE" }) }), { params: Promise.resolve({ id: school.id }) })
    assert.equal(reactivateResponse.status, 200)
    assert.equal((await prisma.user.findUnique({ where: { id: admin.id }, select: { sessionVersion: true } })).sessionVersion, 2)

    const year = String(new Date().getUTCFullYear() + 1)
    const latestPublishedVersion = await prisma.curriculumVersion.findFirst({ where: { curriculumId: curriculum.id, status: "PUBLISHED" }, orderBy: [{ effectiveFrom: { sort: "desc", nulls: "last" } }, { version: "desc" }], select: { id: true, version: true } })
    assert.equal(latestPublishedVersion?.id, curriculumVersion.id, JSON.stringify({ latestPublishedVersion, expectedVersion: curriculumVersion.id }))
    assert.equal(await prisma.curriculumNode.count({ where: { curriculumVersionId: curriculumVersion.id, nodeType: "GRADE" } }), 2)
    const starterRequest = () => new Request("http://local/api/schools/cbc-starter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ year }) })
    const starterParams = { params: Promise.resolve({ id: school.id }) }
    const starterResponse = await cbcStarterRoute.POST(starterRequest(), starterParams)
    assert.equal(starterResponse.status, 200)
    const starterData = await starterResponse.json()
    assert.equal(starterData.termsCreated, 3)
    assert.equal(starterData.gradesAdded, 2, JSON.stringify(starterData))
    assert.equal((await cbcStarterRoute.POST(starterRequest(), starterParams)).status, 200, "repeating the starter must be safe")
    const academicYear = await prisma.academicYear.findUnique({ where: { schoolId_name: { schoolId: school.id, name: year } }, include: { periods: true, offerings: { include: { grades: true } } } })
    assert.equal(academicYear.periods.length, 3)
    assert.equal(academicYear.offerings.length, 1)
    assert.equal(academicYear.offerings[0].grades.length, 2, JSON.stringify(academicYear.offerings[0].grades))

    const activeOperatorCount = await prisma.user.count({ where: { role: "SUPER_ADMIN", isActive: true } })
    if (activeOperatorCount === 1) {
      const lastOperatorResponse = await operatorRoute.PATCH(new Request("http://local/api/platform/operators", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: false }) }), { params: Promise.resolve({ id: operator.id }) })
      assert.equal(lastOperatorResponse.status, 409, "the last active operator cannot disable themselves")
    }
    secondOperator = await prisma.user.create({ data: { email: `operator-two-${tag}@example.test`, name: "Second Operator", role: "SUPER_ADMIN", password: pw, mfaEnabled: true } })
    const disableResponse = await operatorRoute.PATCH(new Request("http://local/api/platform/operators", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: false }) }), { params: Promise.resolve({ id: secondOperator.id }) })
    assert.equal(disableResponse.status, 200)
    assert.equal((await prisma.user.findUnique({ where: { id: secondOperator.id }, select: { isActive: true, sessionVersion: true } })).isActive, false)
    await assert.rejects(credentials.verifyCredentials({ email: secondOperator.email, password: "correct horse battery staple" }), (error) => error.code === "account_unavailable")
    const reactivateOperatorResponse = await operatorRoute.PATCH(new Request("http://local/api/platform/operators", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: true }) }), { params: Promise.resolve({ id: secondOperator.id }) })
    assert.equal(reactivateOperatorResponse.status, 200)

    await prisma.user.update({ where: { id: teacher.id }, data: { isActive: false } })
    await assert.rejects(credentials.verifyCredentials({ email: teacher.email, password: "correct horse battery staple" }), (error) => error.code === "account_unavailable")
    await prisma.user.update({ where: { id: teacher.id }, data: { isActive: true } })

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
    await prisma.platformAuditEvent.deleteMany({ where: { actorId: { in: [admin.id, teacher.id, operator.id, ...(secondOperator ? [secondOperator.id] : [])] } } })
    await prisma.user.deleteMany({ where: { schoolId: school.id } })
    await prisma.class.deleteMany({ where: { schoolId: school.id } })
    await prisma.school.delete({ where: { id: school.id } })
    await prisma.curriculumVersion.delete({ where: { id: curriculumVersion.id } })
    if (createdCurriculum) await prisma.curriculum.delete({ where: { id: curriculum.id } })
    if (secondOperator) await prisma.user.delete({ where: { id: secondOperator.id } })
    await prisma.user.delete({ where: { id: operator.id } })
    await prisma.$disconnect()
  }
})
