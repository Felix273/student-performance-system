import type { EvidenceType, Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

const timelineSelect = {
  id: true,
  evidenceType: true,
  numericScore: true,
  maxScore: true,
  masteryLevel: true,
  narrative: true,
  status: true,
  capturedAt: true,
  publishedAt: true,
  publishedVersion: true,
  publishedSnapshot: true,
  assessmentPlan: { select: { id: true, title: true, date: true } },
  learningOutcome: { select: { code: true, statement: true } },
  competency: { select: { code: true, name: true } },
} satisfies Prisma.AssessmentEvidenceSelect

type StaffTimelineRecord = Prisma.AssessmentEvidenceGetPayload<{ select: typeof timelineSelect }>
type ParentTimelineRecord = {
  id: string
  evidenceType: EvidenceType
  status: "PUBLISHED"
  publishedAt: Date | null
  publishedVersion: number
  snapshot: Prisma.JsonValue
}

export function getLearnerEvidenceTimeline(studentId: string, schoolId: string): Promise<StaffTimelineRecord[]>
export function getLearnerEvidenceTimeline(studentId: string, schoolId: string, publishedOnly: false): Promise<StaffTimelineRecord[]>
export function getLearnerEvidenceTimeline(studentId: string, schoolId: string, publishedOnly: true): Promise<ParentTimelineRecord[]>
export function getLearnerEvidenceTimeline(studentId: string, schoolId: string, publishedOnly: boolean): Promise<StaffTimelineRecord[] | ParentTimelineRecord[]>

export async function getLearnerEvidenceTimeline(studentId: string, schoolId: string, publishedOnly = false): Promise<StaffTimelineRecord[] | ParentTimelineRecord[]> {
  const records = await prisma.assessmentEvidence.findMany({
    where: {
      studentId,
      schoolId,
      status: publishedOnly ? "PUBLISHED" : { not: "VOIDED" },
    },
    orderBy: [{ capturedAt: "desc" }, { id: "desc" }],
    take: 50,
    select: timelineSelect,
  })

  if (!publishedOnly) return records

  return records.map((record): ParentTimelineRecord => ({
    id: record.id,
    evidenceType: record.evidenceType,
    status: "PUBLISHED",
    publishedAt: record.publishedAt,
    publishedVersion: record.publishedVersion,
    snapshot: record.publishedSnapshot,
  })) as ParentTimelineRecord[]
}