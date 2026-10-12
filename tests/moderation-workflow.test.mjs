import test from "node:test"
import assert from "node:assert/strict"
import { createRequire } from "node:module"

process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: "CommonJS" })
const require = createRequire(import.meta.url)
require("ts-node/register")
const { canTransition, isModerator } = require("../lib/moderation.ts")

test("application moderation module allows only explicit evidence transitions", () => {
  assert.equal(canTransition("DRAFT", "SUBMITTED"), true)
  assert.equal(canTransition("SUBMITTED", "VERIFIED"), true)
  assert.equal(canTransition("SUBMITTED", "PUBLISHED"), false)
  assert.equal(canTransition("VERIFIED", "PUBLISHED"), true)
  assert.equal(canTransition("PUBLISHED", "RETURNED"), false)
  assert.equal(canTransition("UNKNOWN", "SUBMITTED"), false)
})

test("application moderation module limits moderation to school administrators", () => {
  assert.equal(isModerator("SCHOOL_ADMIN"), true)
  assert.equal(isModerator("TEACHER"), false)
  assert.equal(isModerator("SUPER_ADMIN"), false)
})
