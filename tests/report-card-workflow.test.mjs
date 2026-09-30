import test from "node:test"
import assert from "node:assert/strict"
import { createRequire } from "node:module"

process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: "CommonJS", moduleResolution: "Node" })
const require = createRequire(import.meta.url)
require("ts-node/register/transpile-only")
const { buildReportSnapshot, canPublishReportCard, canTransitionReportCard } = require("../lib/reports/reportCardLifecycle.ts")
const { normalizeReportTemplateSections } = require("../lib/reports/reportTemplateSections.ts")
const { generateSnapshotReportCard } = require("../lib/reports/snapshotReportCardPdf.ts")

const baseInput = () => ({
  generatedAt: "2026-09-30T09:00:00.000Z",
  school: { id: "school-1", name: "North School" },
  student: { id: "student-1", name: "Amina Learner", admissionNo: "A-01", className: "Grade 4", grade: "4" },
  period: { id: "period-1", name: "Term 1", code: "T1", startsOn: "2026-01-01T00:00:00.000Z", endsOn: "2026-03-31T00:00:00.000Z" },
  template: { id: "template-1", code: "CBC_STANDARD", name: "CBC Progress Report" },
  evidence: [
    { id: "evidence-draft", status: "SUBMITTED", evidenceType: "OBSERVATION", numericScore: 2, maxScore: 4, createdAt: "2026-02-01T10:00:00.000Z" },
    { id: "evidence-verified", status: "VERIFIED", evidenceType: "TASK", numericScore: 3, maxScore: 4, masteryLevel: "MEETING", narrative: "Applies the skill independently.", createdAt: "2026-02-02T10:00:00.000Z", learningOutcome: { code: "LO-1", statement: "Communicates clearly." }, competency: { code: "COMM", name: "Communication" } },
    { id: "evidence-published", status: "PUBLISHED", evidenceType: "PROJECT", numericScore: 4, maxScore: 4, createdAt: "2026-02-03T10:00:00.000Z" },
  ],
  legacyAssessments: [
    { id: "legacy-in-period", score: 8, assessment: { title: "Reading", maxScore: 10, date: "2026-03-31T18:00:00.000Z", subject: { name: "English" } } },
    { id: "legacy-outside-period", score: 10, assessment: { title: "Later test", maxScore: 10, date: "2026-04-01T00:00:00.000Z" } },
  ],
})

test("report-card lifecycle only permits explicit forward transitions", () => {
  assert.equal(canTransitionReportCard("DRAFT", "REVIEW"), true)
  assert.equal(canTransitionReportCard("REVIEW", "DRAFT"), true)
  assert.equal(canTransitionReportCard("REVIEW", "PUBLISHED"), true)
  assert.equal(canTransitionReportCard("PUBLISHED", "AMENDED"), true)
  assert.equal(canTransitionReportCard("AMENDED", "ARCHIVED"), true)
  assert.equal(canTransitionReportCard("PUBLISHED", "DRAFT"), false)
  assert.equal(canTransitionReportCard("ARCHIVED", "PUBLISHED"), false)
  assert.equal(canTransitionReportCard("UNKNOWN", "PUBLISHED"), false)
})

test("publishing is restricted to administrators and requires review state", () => {
  assert.equal(canPublishReportCard("REVIEW", "SCHOOL_ADMIN"), true)
  assert.equal(canPublishReportCard("REVIEW", "SUPER_ADMIN"), true)
  assert.equal(canPublishReportCard("REVIEW", "TEACHER"), false)
  assert.equal(canPublishReportCard("DRAFT", "SCHOOL_ADMIN"), false)
})

test("snapshots include only verified or published evidence and period-bounded legacy results", () => {
  const result = buildReportSnapshot(baseInput())
  assert.deepEqual(result.entries.map((entry) => entry.sourceId), ["evidence-verified", "evidence-published", "legacy-in-period"])
  assert.equal(result.snapshot.summary.cbcEvidenceCount, 2)
  assert.equal(result.snapshot.summary.legacyAssessmentCount, 1)
  assert.equal(result.snapshot.summary.totalEntries, 3)
  assert.equal(result.snapshot.summary.cbcAveragePercentage, 87.5)
  assert.equal(result.snapshot.summary.legacyAveragePercentage, 80)
})

test("snapshot copies mutable labels and narrative instead of retaining live object references", () => {
  const input = baseInput()
  input.template.curriculumVersionId = "cbc-version-2026"
  input.evidence[1].learningOutcome.curriculumVersionId = "cbc-version-2026"
  const result = buildReportSnapshot(input)
  input.student.name = "Changed Later"
  input.evidence[1].narrative = "Edited after publication"
  assert.equal(result.snapshot.student.name, "Amina Learner")
  assert.equal(result.snapshot.template.curriculumVersionId, "cbc-version-2026")
  assert.equal(result.entries[0].narrative, "Applies the skill independently.")
  assert.deepEqual(result.entries[0].snapshot.learningOutcome, { code: "LO-1", statement: "Communicates clearly.", curriculumVersionId: "cbc-version-2026" })
})

test("template sections are frozen and disabled sections are excluded from the snapshot", () => {
  const input = baseInput()
  input.template.sections = [
    { id: "section-evidence", code: "CBC_EVIDENCE", title: "Learning outcomes", sectionType: "OUTCOME", sequence: 1, isEnabled: true },
    { id: "section-legacy", code: "LEGACY_ASSESSMENTS", title: "Legacy scores", sectionType: "ASSESSMENT", sequence: 2, isEnabled: false },
  ]
  const result = buildReportSnapshot(input)
  assert.equal(result.entries.length, 2)
  assert.ok(result.entries.every((entry) => entry.sectionTitle === "Learning outcomes"))
  assert.equal(result.snapshot.template.sections[0].title, "Learning outcomes")
  input.template.sections[0].title = "Renamed later"
  assert.equal(result.snapshot.template.sections[0].title, "Learning outcomes")
  assert.equal(result.snapshot.summary.legacyAssessmentCount, 0)
})

test("template section validation requires unique codes and enabled CBC evidence", () => {
  const valid = normalizeReportTemplateSections([
    { code: "CBC_EVIDENCE", title: "CBC outcomes", sectionType: "OUTCOME", sequence: 0, isEnabled: true, isRequired: true },
    { code: "COMMENTS", title: "Comments", sectionType: "COMMENT", sequence: 1, isEnabled: true },
  ])
  assert.equal(valid.ok, true)
  assert.deepEqual(valid.sections.map((section) => section.code), ["CBC_EVIDENCE", "COMMENTS"])

  const duplicate = normalizeReportTemplateSections([
    { code: "CBC_EVIDENCE", title: "CBC outcomes", sectionType: "OUTCOME", sequence: 0, isEnabled: true },
    { code: "cbc_evidence", title: "Duplicate", sectionType: "CUSTOM", sequence: 1, isEnabled: true },
  ])
  assert.equal(duplicate.ok, false)
  assert.match(duplicate.error, /unique/)

  const disabledEvidence = normalizeReportTemplateSections([
    { code: "CBC_EVIDENCE", title: "CBC outcomes", sectionType: "OUTCOME", sequence: 0, isEnabled: false },
  ])
  assert.equal(disabledEvidence.ok, false)
  assert.match(disabledEvidence.error, /enabled CBC_EVIDENCE/)
})

test("snapshot PDF honors frozen section visibility and emits a valid paginated PDF", () => {
  const snapshot = {
    generatedAt: "2026-09-30T09:00:00.000Z",
    school: { name: "North School" },
    student: { name: "Amina Learner", admissionNo: "A-01", className: "Grade 4", grade: "4" },
    period: { name: "Term 1", code: "T1", startsOn: "2026-01-01T00:00:00.000Z", endsOn: "2026-03-31T00:00:00.000Z" },
    template: { name: "CBC Progress Report", sections: [
      { code: "SUMMARY", title: "Learning summary", sectionType: "SUMMARY", sequence: 0, isEnabled: true },
      { code: "CBC_EVIDENCE", title: "Learning outcomes", sectionType: "OUTCOME", sequence: 1, isEnabled: true },
      { code: "HIDDEN", title: "Disabled section", sectionType: "CUSTOM", sequence: 2, isEnabled: false },
    ] },
    summary: { cbcEvidenceCount: 70, legacyAssessmentCount: 0, totalEntries: 70, cbcAveragePercentage: 84.5, legacyAveragePercentage: null },
  }
  const entries = Array.from({ length: 70 }, (_, index) => ({
    sequence: index,
    sectionCode: "CBC_EVIDENCE",
    sectionTitle: "Learning outcomes",
    subjectName: "Communication",
    label: `Outcome ${index + 1}`,
    numericValue: 3,
    maxValue: 4,
    masteryLevel: "MEETING",
    narrative: "Applies the skill independently.",
    snapshot: {},
  }))
  const pdf = generateSnapshotReportCard({ snapshot, entries, comments: [{ sectionCode: null, body: "Keep practising reading aloud.", audience: "FAMILY" }] })
  const pdfBytes = pdf.output("arraybuffer")
  assert.equal(Buffer.from(pdfBytes).subarray(0, 5).toString(), "%PDF-")
  assert.ok(pdf.getNumberOfPages() > 1, "long report should paginate")
  const pageText = pdf.internal.pages.slice(1).flat().join(" ")
  assert.match(pageText, /Learning summary/)
  assert.match(pageText, /Learning outcomes/)
  assert.doesNotMatch(pageText, /Disabled section/)
})
