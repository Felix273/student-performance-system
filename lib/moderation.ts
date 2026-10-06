import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

export const evidenceTransitions: Record<string, string[]> = {
  DRAFT: ["SUBMITTED", "VOIDED"],
  RETURNED: ["SUBMITTED", "VOIDED"],
  SUBMITTED: ["VERIFIED", "REJECTED", "RETURNED"],
  REJECTED: ["RETURNED", "VOIDED"],
  VERIFIED: ["PUBLISHED", "RETURNED"],
  PUBLISHED: [],
  VOIDED: [],
}

export function isModerator(role: string | undefined) {
  return role === "SCHOOL_ADMIN"
}

export function canTransition(from: string, to: string) {
  return evidenceTransitions[from]?.includes(to) ?? false
}

export async function getEvidenceForActor(id: string, schoolId?: string | null) {
  return prisma.assessmentEvidence.findFirst({
    where: { id, ...(schoolId ? { schoolId } : {}) },
    include: {
      student: { select: { id: true, name: true, classId: true, schoolId: true } },
      assessmentPlan: { select: { id: true, title: true, status: true, schoolId: true, publicationMode: true } },
      component: { select: { id: true, name: true } },
      learningOutcome: { select: { id: true, code: true, statement: true } },
      competency: { select: { id: true, code: true, name: true } },
      rubricScores: { include: { criterion: { select: { code: true, name: true } }, level: { select: { code: true, label: true, points: true } } } },
    },
  })
}

export async function recordAudit(tx: Prisma.TransactionClient, data: {
  schoolId: string; evidenceId?: string; planId?: string; actorId: string; action: Prisma.EvidenceAuditEventCreateInput["action"];
  priorStatus?: string; newStatus?: string; reason?: string; metadata?: Prisma.InputJsonValue
}) {
  return tx.evidenceAuditEvent.create({ data })
}

export async function publishEvidence(evidenceId: string, actorId: string, schoolId: string, reason?: string) {
  return prisma.$transaction(async (tx) => {
    const evidence = await tx.assessmentEvidence.findFirst({
      where: { id: evidenceId, schoolId },
      include: {
        student: { select: { id: true, name: true, schoolId: true } },
        assessmentPlan: { select: { id: true, title: true, schoolId: true, status: true } },
        learningOutcome: { select: { code: true, statement: true } },
        competency: { select: { code: true, name: true } },
      },
    })
    if (!evidence) throw new Error("NOT_FOUND")
    if (evidence.status !== "VERIFIED") throw new Error("ONLY_VERIFIED")
    const version = evidence.publishedVersion + 1
    const corrected = evidence.publishedVersion > 0
    const snapshot = {
      version, studentId: evidence.studentId, planTitle: evidence.assessmentPlan?.title ?? null,
      evidenceType: evidence.evidenceType, numericScore: evidence.numericScore, maxScore: evidence.maxScore,
      masteryLevel: evidence.masteryLevel, narrative: evidence.narrative,
      learningOutcome: evidence.learningOutcome, competency: evidence.competency,
      publishedAt: new Date().toISOString(),
    } satisfies Prisma.InputJsonObject
    const updated = await tx.assessmentEvidence.update({
      where: { id: evidenceId },
      data: { status: "PUBLISHED", reviewerId: actorId, reviewedAt: new Date(), publishedAt: new Date(), publishedById: actorId, publishedVersion: version, publishedSnapshot: snapshot },
      select: { id: true, status: true, publishedAt: true, publishedVersion: true, publishedSnapshot: true },
    })
    await recordAudit(tx, { schoolId, evidenceId, planId: evidence.assessmentPlanId ?? undefined, actorId, action: "PUBLISHED", priorStatus: "VERIFIED", newStatus: "PUBLISHED", reason })
    const prefs = await tx.schoolNotificationPreference.findUnique({ where: { schoolId } })
    const parents = await tx.parentStudent.findMany({ where: { studentId: evidence.studentId, student: { schoolId } }, select: { parentId: true } })
    if (prefs?.publishedInApp !== false) {
      await tx.notification.createMany({
        data: parents.map(({ parentId }) => ({
          schoolId, recipientId: parentId, studentId: evidence.studentId, evidenceId,
          type: corrected ? "CORRECTED_RESULT_PUBLISHED" as const : "REPORT_PUBLISHED" as const,
          title: corrected ? "A published result was corrected" : "A learning result is now published",
          message: corrected ? `A published learning result for ${evidence.student.name} has been corrected. Open the parent portal for the updated record.` : `A learning result for ${evidence.student.name} is now available in the parent portal.`,
          href: `/dashboard/parent/learning-updates?studentId=${evidence.studentId}`,
          eventKey: `${corrected ? "corrected" : "published"}:${evidenceId}:${version}:${parentId}`,
        })), skipDuplicates: true,
      })
    }
    return updated
  })
}
