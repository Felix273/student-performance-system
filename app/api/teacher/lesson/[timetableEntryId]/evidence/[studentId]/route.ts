import { NextRequest, NextResponse } from "next/server"
import { EvidenceType } from "@prisma/client"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import { authorizeTeacherLesson, lessonError } from "@/lib/teacherLessonWorkspace"

type RouteContext = { params: Promise<{ timetableEntryId: string; studentId: string }> }
const evidenceTypes = new Set<string>(Object.values(EvidenceType))

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth()
    const { timetableEntryId, studentId } = await params
    const lesson = await authorizeTeacherLesson(session, timetableEntryId)
    if (!lesson.ok) return lessonError(lesson)
    if (lesson.access.role !== "TEACHER") return NextResponse.json({ error: "Only the assigned teacher can capture evidence" }, { status: 403 })
    const teacherId = lesson.access.user.id
    if (!teacherId) return NextResponse.json({ error: "Teacher account is invalid" }, { status: 403 })
    if (!lesson.curriculumAssignment || lesson.curriculumAssignment.status !== "ACTIVE") {
      return NextResponse.json({ error: "An active, unambiguous curriculum assignment is required to capture evidence" }, { status: 409 })
    }

    const body = await request.json()
    const assessmentPlanId = typeof body.assessmentPlanId === "string" ? body.assessmentPlanId : ""
    const evidenceId = typeof body.evidenceId === "string" ? body.evidenceId : null
    const evidenceType = typeof body.evidenceType === "string" ? body.evidenceType : ""
    if (!assessmentPlanId || !evidenceTypes.has(evidenceType)) {
      return NextResponse.json({ error: "An open assessment plan and valid evidence type are required" }, { status: 400 })
    }

    const [student, plan] = await Promise.all([
      prisma.student.findFirst({ where: { id: studentId, schoolId: lesson.entry.schoolId, classId: lesson.entry.classId }, select: { id: true } }),
      prisma.assessmentPlan.findFirst({
        where: {
          id: assessmentPlanId,
          schoolId: lesson.entry.schoolId,
          classAssignmentId: lesson.curriculumAssignment.id,
          status: "OPEN",
          ...(lesson.entry.periodId ? { periodId: lesson.entry.periodId } : {}),
        },
        include: {
          components: { orderBy: { sequence: "asc" }, select: { id: true, maxScore: true } },
          nodes: { select: { learningOutcomeId: true } },
          rubric: { include: { criteria: { include: { levels: { select: { id: true } } } } } },
        },
      }),
    ])
    if (!student) return NextResponse.json({ error: "Learner is not in this lesson's class" }, { status: 404 })
    if (!plan) return NextResponse.json({ error: "Assessment plan is not open for this lesson" }, { status: 409 })

    const componentId = typeof body.componentId === "string" && body.componentId ? body.componentId : null
    const component = componentId ? plan.components.find((item) => item.id === componentId) : null
    if (componentId && !component) return NextResponse.json({ error: "Assessment component does not belong to this plan" }, { status: 400 })
    const maxScore = component?.maxScore ?? plan.components[0]?.maxScore ?? null

    const learningOutcomeId = typeof body.learningOutcomeId === "string" && body.learningOutcomeId ? body.learningOutcomeId : null
    if (learningOutcomeId) {
      const outcome = await prisma.learningOutcome.findFirst({
        where: {
          id: learningOutcomeId,
          curriculumNode: { curriculumVersionId: lesson.curriculumAssignment.offering.curriculumVersionId },
        },
        select: { id: true },
      })
      if (!outcome) return NextResponse.json({ error: "Learning outcome is outside this class curriculum" }, { status: 400 })
      if (plan.nodes.length > 0 && !plan.nodes.some((node) => node.learningOutcomeId === learningOutcomeId)) {
        return NextResponse.json({ error: "Learning outcome is not linked to this assessment plan" }, { status: 400 })
      }
    }

    const competencyId = typeof body.competencyId === "string" && body.competencyId ? body.competencyId : null
    if (competencyId) {
      const competency = await prisma.competency.findFirst({
        where: { id: competencyId, nodes: { some: { curriculumNode: { curriculumVersionId: lesson.curriculumAssignment.offering.curriculumVersionId } } } },
        select: { id: true },
      })
      if (!competency) return NextResponse.json({ error: "Competency is outside this class curriculum" }, { status: 400 })
    }

    const rubricId = typeof body.rubricId === "string" && body.rubricId ? body.rubricId : plan.rubricId
    if (evidenceType === "RUBRIC" && !rubricId) return NextResponse.json({ error: "This plan has no rubric configured" }, { status: 400 })
    if (rubricId && (!plan.rubric || plan.rubric.id !== rubricId || plan.rubric.curriculumVersionId !== lesson.curriculumAssignment.offering.curriculumVersionId)) {
      return NextResponse.json({ error: "Rubric must belong to this plan and curriculum" }, { status: 400 })
    }
    const rubricScores: Array<{ criterionId: string; levelId: string; comment: string | null }> = Array.isArray(body.rubricScores)
      ? body.rubricScores.flatMap((item: unknown) => typeof item === "object" && item !== null && "criterionId" in item && "levelId" in item && typeof item.criterionId === "string" && typeof item.levelId === "string" ? [{ criterionId: item.criterionId, levelId: item.levelId, comment: "comment" in item && typeof item.comment === "string" ? item.comment.trim().slice(0, 1000) : null }] : [])
      : []
    const allowedRubricPairs = new Set(plan.rubric?.criteria.flatMap((criterion) => criterion.levels.map((level) => `${criterion.id}:${level.id}`)) ?? [])
    if (rubricScores.some((item) => !allowedRubricPairs.has(`${item.criterionId}:${item.levelId}`)) || new Set(rubricScores.map((item) => item.criterionId)).size !== rubricScores.length) {
      return NextResponse.json({ error: "Rubric criterion selections must use one valid level per criterion" }, { status: 400 })
    }
    if (evidenceType === "RUBRIC" && rubricScores.length === 0) return NextResponse.json({ error: "Select at least one rubric criterion level" }, { status: 400 })

    const numericScore = body.numericScore === null || body.numericScore === undefined || body.numericScore === "" ? null : Number(body.numericScore)
    if (numericScore !== null && (!Number.isFinite(numericScore) || numericScore < 0 || (maxScore !== null && numericScore > maxScore))) {
      return NextResponse.json({ error: `Score must be between 0 and ${maxScore ?? "the maximum"}` }, { status: 400 })
    }
    const narrative = typeof body.narrative === "string" ? body.narrative.trim().slice(0, 5000) || null : null
    const internalNote = typeof body.internalNote === "string" ? body.internalNote.trim().slice(0, 5000) || null : null
    const masteryLevel = typeof body.masteryLevel === "string" ? body.masteryLevel.trim().slice(0, 100) || null : null
    const expectedUpdatedAt = typeof body.expectedUpdatedAt === "string" ? new Date(body.expectedUpdatedAt) : null
    if (body.expectedUpdatedAt !== undefined && (!expectedUpdatedAt || Number.isNaN(expectedUpdatedAt.getTime()))) {
      return NextResponse.json({ error: "expectedUpdatedAt must be a valid timestamp" }, { status: 400 })
    }
    if (evidenceId && !expectedUpdatedAt) return NextResponse.json({ error: "expectedUpdatedAt is required when editing evidence" }, { status: 400 })
    const expectedRevision = Number(body.expectedRevision)
    if (!Number.isInteger(expectedRevision) || expectedRevision < 0) {
      return NextResponse.json({ error: "A valid expected workspace revision is required" }, { status: 400 })
    }

    const evidenceData = {
      componentId,
      learningOutcomeId,
      competencyId,
      rubricId,
      evidenceType: evidenceType as EvidenceType,
      numericScore,
      maxScore: maxScore ?? undefined,
      masteryLevel,
      narrative,
      internalNote,
    }

    const workspaceSession = await txSession(lesson.entry.id, lesson.entry.schoolId, lesson.entry.teacherId)
    if (workspaceSession.lastClientRevision !== expectedRevision) {
      return NextResponse.json({ error: "Workspace changed in another session; reload before continuing", code: "REVISION_CONFLICT", revision: workspaceSession.lastClientRevision }, { status: 409 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedSession = await tx.lessonWorkspaceSession.updateMany({
        where: { id: workspaceSession.id, lastClientRevision: expectedRevision, state: { in: ["OPEN", "RETURNED"] } },
        data: { lastClientRevision: { increment: 1 }, lastSavedAt: new Date() },
      })
      if (updatedSession.count !== 1) throw new Error("WORKSPACE_REVISION_CONFLICT")
      let evidence
      let priorStatus: string | undefined
      if (evidenceId) {
        const existing = await tx.assessmentEvidence.findFirst({
          where: { id: evidenceId, schoolId: lesson.entry.schoolId, studentId, assessmentPlanId, capturedById: teacherId, status: { in: ["DRAFT", "RETURNED"] } },
          select: { id: true, status: true, updatedAt: true },
        })
        if (!existing) throw new Error("EVIDENCE_NOT_EDITABLE")
        if (expectedUpdatedAt && existing.updatedAt.getTime() !== expectedUpdatedAt.getTime()) throw new Error("EVIDENCE_REVISION_CONFLICT")
        priorStatus = existing.status
        const updated = await tx.assessmentEvidence.updateMany({
          where: { id: evidenceId, capturedById: teacherId, updatedAt: existing.updatedAt, status: { in: ["DRAFT", "RETURNED"] } },
          data: { ...evidenceData, ...(existing.status === "RETURNED" ? { status: "DRAFT" as const } : {}) },
        })
        if (updated.count !== 1) throw new Error("EVIDENCE_REVISION_CONFLICT")
        evidence = await tx.assessmentEvidence.findUniqueOrThrow({ where: { id: evidenceId }, select: { id: true, status: true, updatedAt: true } })
      } else {
        evidence = await tx.assessmentEvidence.create({
          data: { ...evidenceData, schoolId: lesson.entry.schoolId, assessmentPlanId, studentId, capturedById: teacherId, status: "DRAFT" },
          select: { id: true, status: true, updatedAt: true },
        })
      }
      await tx.rubricCriterionScore.deleteMany({ where: { evidenceId: evidence.id } })
      if (rubricScores.length > 0) {
        await tx.rubricCriterionScore.createMany({ data: rubricScores.map((item: { criterionId: string; levelId: string; comment: string | null }) => ({ evidenceId: evidence.id, criterionId: item.criterionId, levelId: item.levelId, comment: item.comment })) })
      }
      await tx.evidenceAuditEvent.create({
        data: {
          schoolId: lesson.entry.schoolId,
          evidenceId: evidence.id,
          planId: assessmentPlanId,
          actorId: teacherId,
          action: evidenceId ? "EDITED" : "CREATED",
          priorStatus,
          newStatus: evidence.status,
        },
      })
      return { ...evidence, workspaceRevision: expectedRevision + 1 }
    })

    return NextResponse.json(result, { status: evidenceId ? 200 : 201 })
  } catch (error) {
    if (error instanceof Error && error.message === "EVIDENCE_NOT_EDITABLE") return NextResponse.json({ error: "Evidence not found or is no longer editable" }, { status: 404 })
    if (error instanceof Error && error.message === "EVIDENCE_REVISION_CONFLICT") return NextResponse.json({ error: "Evidence changed in another session; reload before continuing", code: "REVISION_CONFLICT" }, { status: 409 })
    if (error instanceof Error && error.message === "WORKSPACE_REVISION_CONFLICT") return NextResponse.json({ error: "Workspace changed in another session; reload before continuing", code: "REVISION_CONFLICT" }, { status: 409 })
    console.error("Teacher lesson evidence save error:", error)
    return NextResponse.json({ error: "Unable to save learner evidence" }, { status: 500 })
  }
}

async function txSession(timetableEntryId: string, schoolId: string, teacherId: string) {
  return prisma.lessonWorkspaceSession.upsert({
    where: { timetableEntryId_teacherId: { timetableEntryId, teacherId } },
    create: { schoolId, timetableEntryId, teacherId },
    update: {},
    select: { id: true, lastClientRevision: true },
  })
}