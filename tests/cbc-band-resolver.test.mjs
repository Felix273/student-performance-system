import assert from "node:assert/strict"
import test from "node:test"
import { createRequire } from "node:module"

process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: "CommonJS", moduleResolution: "node" })
const require = createRequire(import.meta.url)
require("ts-node/register/transpile-only")
const { resolveCbcBand } = require("../lib/reports/cbcBandResolver.ts")

const context = (overrides = {}) => ({
  schoolId: "school-a",
  academicYearId: "year-2026",
  classId: "class-1",
  gradeCode: "Grade 1",
  stageCode: "Junior",
  subjectId: "math",
  score: 5,
  maxScore: 10,
  ...overrides,
})

const testMap = ({ id, scope = "CLASS", scopeCode = "class-1", classId = "class-1", subjectId = "math", bands }) => ({
  id,
  schoolId: "school-a",
  academicYearId: "year-2026",
  scope,
  scopeCode,
  classId,
  subjectId,
  bands,
})

const mathTestBands = [
  { id: "math-low", code: "TEST_MATH_LOW", label: "TEST ONLY - lower interval", parentLevelCode: null, minPercent: 0, maxPercent: 49.99, sequence: 0 },
  { id: "math-high", code: "TEST_MATH_HIGH", label: "TEST ONLY - upper interval", parentLevelCode: null, minPercent: 50, maxPercent: 100, sequence: 1 },
]

test("normalizes raw marks against their own maximum and resolves test-only math bands", () => {
  const result = resolveCbcBand([testMap({ id: "class-math", bands: mathTestBands })], context({ score: 8, maxScore: 16 }))
  assert.equal(result.status, "matched")
  assert.equal(result.normalizedPercent, 50)
  assert.equal(result.band.code, "TEST_MATH_HIGH")
})

test("uses inclusive endpoints and reports overlapping bands as ambiguous", () => {
  const result = resolveCbcBand([testMap({ id: "overlap", bands: [
    { ...mathTestBands[0], maxPercent: 50 },
    { ...mathTestBands[1] },
  ] })], context({ score: 5, maxScore: 10 }))
  assert.equal(result.status, "ambiguous")
  assert.deepEqual(result.bands.map((band) => band.code), ["TEST_MATH_LOW", "TEST_MATH_HIGH"])
})

test("returns unmatched for a gap rather than inferring a band", () => {
  const result = resolveCbcBand([testMap({ id: "gap", bands: [
    { ...mathTestBands[0], maxPercent: 49 },
    { ...mathTestBands[1], minPercent: 51 },
  ] })], context({ score: 50, maxScore: 100 }))
  assert.equal(result.status, "unmatched")
  assert.equal(result.normalizedPercent, 50)
})

test("does not round a score across a configured cutoff", () => {
  const result = resolveCbcBand([testMap({ id: "precision", bands: [
    { ...mathTestBands[0], maxPercent: 49.99 },
    { ...mathTestBands[1], minPercent: 50 },
  ] })], context({ score: 9999, maxScore: 20000 }))
  assert.equal(result.status, "unmatched")
  assert.equal(result.normalizedPercent, 49.995)
})

test("prefers class scope over grade and school, then subject-specific maps within that scope", () => {
  const school = testMap({ id: "school", scope: "SCHOOL", scopeCode: "", classId: null, subjectId: null, bands: mathTestBands })
  const grade = testMap({ id: "grade", scope: "GRADE", scopeCode: "Grade 1", classId: null, subjectId: null, bands: mathTestBands })
  const classAllSubjects = testMap({ id: "class-all", scope: "CLASS", classId: "class-1", subjectId: null, bands: mathTestBands })
  const classMath = testMap({ id: "class-math-specific", scope: "CLASS", classId: "class-1", subjectId: "math", bands: mathTestBands })
  const result = resolveCbcBand([school, grade, classAllSubjects, classMath], context())
  assert.equal(result.status, "matched")
  assert.equal(result.map.id, "class-math-specific")
})

test("does not fall back to another subject-specific map", () => {
  const literacy = testMap({ id: "class-literacy", scope: "CLASS", classId: "class-1", subjectId: "literacy", bands: mathTestBands })
  assert.equal(resolveCbcBand([literacy], context()).status, "no-map")
})

test("reports equally specific matching maps as ambiguous instead of guessing", () => {
  const first = testMap({ id: "class-math-a", bands: mathTestBands })
  const second = testMap({ id: "class-math-b", bands: mathTestBands })
  const result = resolveCbcBand([first, second], context())
  assert.equal(result.status, "ambiguous-map")
  assert.equal(result.maps.length, 2)
})

test("returns no-map and rejects invalid scores", () => {
  assert.equal(resolveCbcBand([], context()).status, "no-map")
  assert.equal(resolveCbcBand([], context({ score: 12, maxScore: 10 })).status, "invalid-input")
  assert.equal(resolveCbcBand([], context({ maxScore: 0 })).status, "invalid-input")
})