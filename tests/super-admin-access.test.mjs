import test from "node:test"
import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { readFileSync, readdirSync } from "node:fs"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"

process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
  module: "CommonJS",
  moduleResolution: "node",
  esModuleInterop: true,
  allowImportingTsExtensions: true,
})
process.env.TS_NODE_TRANSPILE_ONLY = "true"
const require = createRequire(import.meta.url)
require("ts-node/register")
const { requireRole, schoolScope, canAccessClass, canAccessStudent } = require("../lib/authorization.ts")
const projectRoot = fileURLToPath(new URL("..", import.meta.url))

const superAdminSession = {
  user: {
    id: "super-admin-id",
    role: "SUPER_ADMIN",
    schoolId: undefined,
  },
}

const readProjectFile = (path) => readFileSync(new URL(path, import.meta.url), "utf8")
const walk = (root) => readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
  const path = join(root, entry.name)
  return entry.isDirectory() ? walk(path) : [path]
})

test("Super Administrators cannot be granted school-scoped roles", () => {
  for (const role of ["SCHOOL_ADMIN", "TEACHER", "PARENT", "STUDENT"]) {
    const result = requireRole(superAdminSession, [role])
    assert.equal(result.ok, false, `${role} access should be denied`)
    assert.equal(result.response.status, 403)
  }
})

test("Super Administrators cannot scope requests to one school or all schools", () => {
  for (const requestedSchoolId of [undefined, "school-123"]) {
    const result = schoolScope(superAdminSession, requestedSchoolId)
    assert.equal(result.ok, false)
    assert.equal(result.response.status, 403)
  }
})

test("Super Administrators are denied before class or student lookups", async () => {
  const classResult = await canAccessClass(superAdminSession, "guessed-class-id")
  const studentResult = await canAccessStudent(superAdminSession, "guessed-student-id")

  assert.equal(classResult.ok, false)
  assert.equal(classResult.response.status, 403)
  assert.equal(studentResult.ok, false)
  assert.equal(studentResult.response.status, 403)
})

test("tenant staff without a school context cannot reach unfiltered queries", () => {
  for (const role of ["SCHOOL_ADMIN", "TEACHER"]) {
    const result = requireRole({ user: { id: `${role.toLowerCase()}-id`, role, schoolId: undefined } }, [role])
    assert.equal(result.ok, false, `${role} without a school should be denied`)
    assert.equal(result.response.status, 403)
  }
})

test("Super Administrator navigation is limited to platform overview and global curriculum", () => {
  const nav = readProjectFile("../app/dashboard/DashboardNav.tsx")
  const links = [...nav.matchAll(/href: "([^"]+)"[^\n]*roles: \[([^\]]*SUPER_ADMIN[^\]]*)\]/g)].map((match) => match[1])
  assert.deepEqual(links, ["/dashboard", "/dashboard/curriculum"])
})

test("school directory and onboarding routes expose no school records", () => {
  const directoryPage = readProjectFile("../app/dashboard/schools/page.tsx")
  const onboardingPage = readProjectFile("../app/dashboard/schools/new/page.tsx")
  const schoolApi = readProjectFile("../app/api/schools/route.ts")

  assert.match(directoryPage, /redirect\("\/dashboard"\)/)
  assert.match(onboardingPage, /redirect\("\/dashboard"\)/)
  assert.doesNotMatch(directoryPage, /prisma\.school/)
  assert.match(schoolApi, /requireRole\(session, \["SCHOOL_ADMIN"\]\)/)
  assert.match(schoolApi, /requireRole\(session, \[\]\)/)
  assert.doesNotMatch(schoolApi, /findMany/)
})

test("only global curriculum APIs retain Super Administrator access", () => {
  const apiRoot = join(projectRoot, "app", "api")
  const roleReferences = walk(apiRoot)
    .filter((path) => path.endsWith("route.ts"))
    .filter((path) => readFileSync(path, "utf8").includes("SUPER_ADMIN"))
    .map((path) => relative(projectRoot, path).replaceAll("\\", "/"))
    .sort()

  assert.deepEqual(roleReferences, ["app/api/curriculum/route.ts", "app/api/curriculum/tree/route.ts"])
})
