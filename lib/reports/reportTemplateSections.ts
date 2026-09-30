export type ReportTemplateSectionType =
  | "SUMMARY"
  | "ASSESSMENT"
  | "OUTCOME"
  | "COMPETENCY"
  | "ATTENDANCE"
  | "COMMENT"
  | "CUSTOM"

export type ReportTemplateSectionDraft = {
  code: string
  title: string
  sectionType: ReportTemplateSectionType
  sequence: number
  isEnabled: boolean
  isRequired: boolean
  description?: string
}

export const DEFAULT_REPORT_TEMPLATE_SECTIONS: ReportTemplateSectionDraft[] = [
  { code: "SUMMARY", title: "Learning summary", sectionType: "SUMMARY", sequence: 0, isEnabled: true, isRequired: false },
  { code: "CBC_EVIDENCE", title: "CBC learning evidence", sectionType: "OUTCOME", sequence: 1, isEnabled: true, isRequired: true },
  { code: "LEGACY_ASSESSMENTS", title: "Assessment history", sectionType: "ASSESSMENT", sequence: 2, isEnabled: true, isRequired: false },
  { code: "TEACHER_COMMENT", title: "Teacher comments", sectionType: "COMMENT", sequence: 3, isEnabled: true, isRequired: false },
]

const allowedSectionTypes = new Set<ReportTemplateSectionType>([
  "SUMMARY",
  "ASSESSMENT",
  "OUTCOME",
  "COMPETENCY",
  "ATTENDANCE",
  "COMMENT",
  "CUSTOM",
])

export type NormalizeSectionsResult =
  | { ok: true; sections: ReportTemplateSectionDraft[] }
  | { ok: false; error: string }

export function normalizeReportTemplateSections(raw: unknown): NormalizeSectionsResult {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 30) {
    return { ok: false, error: "A template must have between 1 and 30 sections" }
  }

  const sections: ReportTemplateSectionDraft[] = []
  for (const [index, item] of raw.entries()) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      return { ok: false, error: "Each section needs a valid code, title, type, and non-negative order" }
    }
    const value = item as Record<string, unknown>
    const code = typeof value.code === "string" ? value.code.trim().toUpperCase() : ""
    const title = typeof value.title === "string" ? value.title.trim() : ""
    const rawSectionType = typeof value.sectionType === "string" ? value.sectionType : ""
    const sectionType = rawSectionType as ReportTemplateSectionType
    const sequence = value.sequence === undefined ? index : Number(value.sequence)
    const description = typeof value.description === "string" ? value.description.trim() : ""
    if (!/^[A-Z0-9_-]{2,40}$/.test(code) || !title || title.length > 120 || !allowedSectionTypes.has(sectionType) || !Number.isInteger(sequence) || sequence < 0 || description.length > 2000) {
      return { ok: false, error: "Each section needs a valid code, title, type, and non-negative order" }
    }
    sections.push({
      code,
      title,
      sectionType,
      sequence,
      isEnabled: value.isEnabled !== false,
      isRequired: value.isRequired === true,
      ...(description ? { description } : {}),
    })
  }

  if (new Set(sections.map((section) => section.code)).size !== sections.length) {
    return { ok: false, error: "Section codes must be unique within a template" }
  }
  if (!sections.some((section) => section.code === "CBC_EVIDENCE" && section.isEnabled)) {
    return { ok: false, error: "CBC report templates must include an enabled CBC_EVIDENCE section" }
  }
  return { ok: true, sections }
}
