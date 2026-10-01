export type ReportCardStatus = "DRAFT" | "REVIEW" | "PUBLISHED" | "AMENDED" | "ARCHIVED"
export type ReportEntrySource = "CBC_EVIDENCE" | "LEGACY_ASSESSMENT" | "SUMMARY"

const transitions: Record<ReportCardStatus, readonly ReportCardStatus[]> = {
  DRAFT: ["REVIEW", "ARCHIVED"],
  REVIEW: ["DRAFT", "PUBLISHED", "ARCHIVED"],
  PUBLISHED: ["AMENDED", "ARCHIVED"],
  AMENDED: ["ARCHIVED"],
  ARCHIVED: [],
}

export function canTransitionReportCard(from: string, to: string): boolean {
  return (transitions[from as ReportCardStatus] ?? []).includes(to as ReportCardStatus)
}

export function canPublishReportCard(from: string, role: string): boolean {
  return from === "REVIEW" && (role === "SCHOOL_ADMIN" || role === "SUPER_ADMIN")
}

export interface SnapshotEvidence {
  id: string
  status: string
  evidenceType: string
  numericScore?: number | null
  maxScore?: number | null
  masteryLevel?: string | null
  narrative?: string | null
  createdAt: Date | string
  assessmentPlan?: { title?: string | null; date?: Date | string | null } | null
  assessment?: {
    title?: string | null
    subject?: { name?: string | null } | null
    date?: Date | string | null
  } | null
  learningOutcome?: { code?: string | null; statement?: string | null; curriculumVersionId?: string | null } | null
  competency?: { code?: string | null; name?: string | null } | null
  rubricScores?: Array<{
    criterion?: { code?: string | null; name?: string | null } | null
    level?: { code?: string | null; label?: string | null; points?: number | null } | null
    comment?: string | null
  }>
}

export interface SnapshotLegacyAssessment {
  id: string
  score: number
  assessment: {
    title: string
    maxScore: number
    date: Date | string
    subject?: { name?: string | null } | null
  }
}

export interface ReportSnapshotInput {
  generatedAt: Date | string
  school: { id: string; name: string }
  student: { id: string; name: string; admissionNo: string; className: string; grade?: string | null }
  period: { id: string; name: string; code: string; startsOn: Date | string; endsOn: Date | string }
  template: {
    id: string
    code: string
    name: string
    curriculumVersionId?: string | null
    sections?: Array<{ id: string; code: string; title: string; sectionType: string; sequence: number; isEnabled: boolean }>
  }
  evidence: SnapshotEvidence[]
  legacyAssessments?: SnapshotLegacyAssessment[]
}

export interface ReportSnapshotEntry {
  templateSectionId?: string
  sectionCode: string
  sectionTitle: string
  sequence: number
  sourceType: ReportEntrySource
  sourceId: string
  sourceEvidenceId?: string
  subjectName?: string
  label: string
  numericValue?: number
  maxValue?: number
  masteryLevel?: string
  narrative?: string
  snapshot: Record<string, unknown>
}

export interface BuiltReportSnapshot {
  snapshot: Record<string, unknown>
  entries: ReportSnapshotEntry[]
}

const approvedEvidenceStatuses = new Set(["VERIFIED", "PUBLISHED"])

function validNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function toIso(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) throw new Error("Invalid report snapshot date")
  return date.toISOString()
}

function isWithinPeriod(value: Date | string, startsOn: Date | string, endsOn: Date | string): boolean {
  const date = new Date(value).getTime()
  const start = new Date(startsOn).getTime()
  const endDate = new Date(endsOn)
  // Academic periods are stored as date boundaries. Treat the final calendar day as inclusive.
  endDate.setUTCHours(23, 59, 59, 999)
  return Number.isFinite(date) && date >= start && date <= endDate.getTime()
}

export function buildReportSnapshot(input: ReportSnapshotInput): BuiltReportSnapshot {
  const generatedAt = toIso(input.generatedAt)
  const startsOn = toIso(input.period.startsOn)
  const endsOn = toIso(input.period.endsOn)
  const entries: ReportSnapshotEntry[] = []
  const enabledSections = (input.template.sections ?? []).filter((section) => section.isEnabled)
  const sectionsConfigured = (input.template.sections ?? []).length > 0
  const evidenceSection = enabledSections.find((section) => section.code === "CBC_EVIDENCE")
  const legacySection = enabledSections.find((section) => section.code === "LEGACY_ASSESSMENTS")

  const evidence = input.evidence
    .filter((item) => approvedEvidenceStatuses.has(item.status))
    .slice()
    .sort((a, b) => toIso(a.createdAt).localeCompare(toIso(b.createdAt)) || a.id.localeCompare(b.id))
  const includedEvidence = sectionsConfigured && !evidenceSection ? [] : evidence

  for (const item of includedEvidence) {
    const numericValue = validNumber(item.numericScore)
    const maxValue = validNumber(item.maxScore)
    const rubricScores = (item.rubricScores ?? []).map((score) => ({
      criterionCode: score.criterion?.code ?? null,
      criterionName: score.criterion?.name ?? null,
      levelCode: score.level?.code ?? null,
      levelLabel: score.level?.label ?? null,
      points: validNumber(score.level?.points) ?? null,
      comment: score.comment ?? null,
    }))

    entries.push({
      ...(evidenceSection ? { templateSectionId: evidenceSection.id } : {}),
      sectionCode: evidenceSection?.code ?? "CBC_EVIDENCE",
      sectionTitle: evidenceSection?.title ?? "CBC learning evidence",
      sequence: entries.length,
      sourceType: "CBC_EVIDENCE",
      sourceId: item.id,
      sourceEvidenceId: item.id,
      subjectName: item.assessment?.subject?.name ?? undefined,
      label: item.assessmentPlan?.title ?? item.assessment?.title ?? item.evidenceType,
      ...(numericValue === undefined ? {} : { numericValue }),
      ...(maxValue === undefined ? {} : { maxValue }),
      ...(item.masteryLevel ? { masteryLevel: item.masteryLevel } : {}),
      ...(item.narrative ? { narrative: item.narrative } : {}),
      snapshot: {
        evidenceType: item.evidenceType,
        status: item.status,
        createdAt: toIso(item.createdAt),
        assessmentDate: item.assessmentPlan?.date ? toIso(item.assessmentPlan.date) : item.assessment?.date ? toIso(item.assessment.date) : null,
        learningOutcome: item.learningOutcome ? { code: item.learningOutcome.code ?? null, statement: item.learningOutcome.statement ?? null, curriculumVersionId: item.learningOutcome.curriculumVersionId ?? null } : null,
        competency: item.competency ? { code: item.competency.code ?? null, name: item.competency.name ?? null } : null,
        rubricScores,
      },
    })
  }

  const legacyAssessments = (input.legacyAssessments ?? [])
    .filter((item) => isWithinPeriod(item.assessment.date, input.period.startsOn, input.period.endsOn))
    .slice()
    .sort((a, b) => toIso(a.assessment.date).localeCompare(toIso(b.assessment.date)) || a.id.localeCompare(b.id))
  const includedLegacyAssessments = sectionsConfigured && !legacySection ? [] : legacyAssessments

  for (const item of includedLegacyAssessments) {
    entries.push({
      ...(legacySection ? { templateSectionId: legacySection.id } : {}),
      sectionCode: legacySection?.code ?? "LEGACY_ASSESSMENTS",
      sectionTitle: legacySection?.title ?? "Legacy assessment results",
      sequence: entries.length,
      sourceType: "LEGACY_ASSESSMENT",
      sourceId: item.id,
      subjectName: item.assessment.subject?.name ?? undefined,
      label: item.assessment.title,
      numericValue: item.score,
      maxValue: item.assessment.maxScore,
      snapshot: { assessmentDate: toIso(item.assessment.date) },
    })
  }

  const percentageSummary = (sourceType: ReportEntrySource) => {
    const percentages = entries
      .filter((entry) => entry.sourceType === sourceType && typeof entry.numericValue === "number" && typeof entry.maxValue === "number" && entry.maxValue > 0)
      .map((entry) => (entry.numericValue! / entry.maxValue!) * 100)
    return {
      count: percentages.length,
      average: percentages.length
        ? Math.round((percentages.reduce((sum, value) => sum + value, 0) / percentages.length) * 10) / 10
        : null,
    }
  }
  const cbcScores = percentageSummary("CBC_EVIDENCE")
  const legacyScores = percentageSummary("LEGACY_ASSESSMENT")

  return {
    snapshot: {
      schemaVersion: 1,
      generatedAt,
      school: { id: input.school.id, name: input.school.name },
      student: {
        id: input.student.id,
        name: input.student.name,
        admissionNo: input.student.admissionNo,
        className: input.student.className,
        grade: input.student.grade ?? null,
      },
      period: {
        id: input.period.id,
        name: input.period.name,
        code: input.period.code,
        startsOn,
        endsOn,
      },
      template: {
        id: input.template.id,
        code: input.template.code,
        name: input.template.name,
        curriculumVersionId: input.template.curriculumVersionId ?? null,
        sections: (input.template.sections ?? []).slice().sort((a, b) => a.sequence - b.sequence).map((section) => ({
          id: section.id,
          code: section.code,
          title: section.title,
          sectionType: section.sectionType,
          sequence: section.sequence,
          isEnabled: section.isEnabled,
        })),
      },
      summary: {
        cbcEvidenceCount: includedEvidence.length,
        legacyAssessmentCount: includedLegacyAssessments.length,
        totalEntries: entries.length,
        cbcScoredEntries: cbcScores.count,
        cbcAveragePercentage: cbcScores.average,
        legacyScoredEntries: legacyScores.count,
        legacyAveragePercentage: legacyScores.average,
      },
    },
    entries,
  }
}
