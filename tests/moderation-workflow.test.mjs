import test from "node:test"
import assert from "node:assert/strict"

const transitions = {
  DRAFT: ["SUBMITTED", "VOIDED"],
  RETURNED: ["SUBMITTED", "VOIDED"],
  SUBMITTED: ["VERIFIED", "REJECTED", "RETURNED"],
  REJECTED: ["RETURNED", "VOIDED"],
  VERIFIED: ["PUBLISHED", "RETURNED"],
  PUBLISHED: [],
  VOIDED: [],
}
const canTransition = (from, to) => transitions[from]?.includes(to) ?? false

test("teacher evidence can only progress through explicit moderation states", () => {
  assert.equal(canTransition("DRAFT", "SUBMITTED"), true)
  assert.equal(canTransition("SUBMITTED", "VERIFIED"), true)
  assert.equal(canTransition("SUBMITTED", "PUBLISHED"), false)
  assert.equal(canTransition("VERIFIED", "PUBLISHED"), true)
  assert.equal(canTransition("PUBLISHED", "RETURNED"), false)
})

test("publication notification event keys are stable per recipient and version", () => {
  const key = (kind, evidenceId, version, parentId) => `${kind}:${evidenceId}:${version}:${parentId}`
  assert.equal(key("published", "ev-1", 1, "parent-1"), key("published", "ev-1", 1, "parent-1"))
  assert.notEqual(key("published", "ev-1", 1, "parent-1"), key("published", "ev-1", 2, "parent-1"))
  assert.notEqual(key("published", "ev-1", 1, "parent-1"), key("published", "ev-1", 1, "parent-2"))
})
