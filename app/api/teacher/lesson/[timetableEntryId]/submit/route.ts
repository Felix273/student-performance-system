import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import { authorizeTeacherLesson, lessonError } from "@/lib/teacherLessonWorkspace"

type RouteContext = { params: Promise<{ timetableEntryId: string }> }

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth()
    const { timetableEntryId } = await params
    const lesson = await authorizeTeacherLesson(session, timetableEntryId)
    if (!lesson.ok) return lessonError(lesson)
    if (lesson.access.role !== "TEACHER") return NextResponse.json({ error: "Only the assigned teacher can submit lesson evidence" }, { status: 403 })
    const teacherId = lesson.access.user.id
    if (!teacherId) return NextResponse.json({ error: "Teacher account is invalid" }, { status: 403 })
    if (!lesson.curriculumAssignment || lesson.curriculumAssignment.status !== "ACTIVE") return NextResponse.json({ error: "An active curriculum assignment is required to submit lesson evidence" }, { status: 409 })

    const body = await request.json()
    const assessmentPlanId = typeof body.assessmentPlanId === "string" ? body.assessmentPlanId : ""
    const expectedRevision = Number(body.expectedRevision)
    if (!assessmentPlanId || !Number.isInteger(expectedRevision) || expectedRevision < 0) {
      return NextResponse.json({ error: "Assessment plan and expected workspace revision are required" }, { status: 400 })
    }
    if (body.allowIncomplete === true) return NextResponse.json({ error: "Incomplete submission is not enabled for this school" }, { status: 400 })
    const plan = await prisma.assessmentPlan.findFirst({
      where: {
        id: assessmentPlanId,
        schoolId: lesson.entry.schoolId,
        classAssignmentId: lesson.curriculumAssignment?.id ?? "",
        status: "OPEN",
        ...(lesson.entry.periodId ? { periodId: lesson.entry.periodId } : {}),
      },
      select: { id: true },
    })
    if (!plan) return NextResponse.json({ error: "Assessment plan is not open for this lesson" }, { status: 409 })

    const requestedIds = body.studentIds === undefined ? null : Array.isArray(body.studentIds) && body.studentIds.every((id: unknown) => typeof id === "string") ? [...new Set(body.studentIds as string[])] : undefined
    if (requestedIds === undefined || requestedIds?.length === 0) return NextResponse.json({ error: "studentIds must be omitted or contain at least one learner ID" }, { status: 400 })
    const targetStudents = await prisma.student.findMany({
      where: { schoolId: lesson.entry.schoolId, classId: lesson.entry.classId, ...(requestedIds ? { id: { in: requestedIds } } : {}) },
      select: { id: true },
    })
    if (requestedIds && targetStudents.length !== requestedIds.length) return NextResponse.json({ error: "One or more learners are outside this lesson's class" }, { status: 400 })
    if (targetStudents.length === 0) return NextResponse.json({ error: "No learners are available for submission" }, { status: 409 })

    const studentIds = targetStudents.map((student) => student.id)
    const drafts = await prisma.assessmentEvidence.findMany({
      where: { schoolId: lesson.entry.schoolId, assessmentPlanId, studentId: { in: studentIds }, capturedById: teacherId, status: { in: ["DRAFT", "RETURNED"] } },
      select: { id: true, studentId: true, status: true },
    })
    const completedIds = new Set(drafts.map((evidence) => evidence.studentId))
    const missingStudentIds = studentIds.filter((id) => !completedIds.has(id))
    if (missingStudentIds.length > 0) {
      return NextResponse.json({ error: "Some target learners have no draft evidence for this plan", code: "INCOMPLETE_EVIDENCE", missingStudentIds, incompleteCount: missingStudentIds.length }, { status: 409 })
    }

    const workspaceTeacherId = lesson.entry.teacherId
    const workspaceSession = await prisma.lessonWorkspaceSession.upsert({
      where: { timetableEntryId_teacherId: { timetableEntryId: lesson.entry.id, teacherId: workspaceTeacherId } },
      create: { schoolId: lesson.entry.schoolId, timetableEntryId: lesson.entry.id, teacherId: workspaceTeacherId },
      update: {},
      select: { id: true, lastClientRevision: true },
    })
    if (workspaceSession.lastClientRevision !== expectedRevision) {
      return NextResponse.json({ error: "Workspace changed in another session; reload before continuing", code: "REVISION_CONFLICT", revision: workspaceSession.lastClientRevision }, { status: 409 })
    }

    try {
      await prisma.$transaction(async (tx) => {
        const updatedSession = await tx.lessonWorkspaceSession.updateMany({
          where: { id: workspaceSession.id, lastClientRevision: expectedRevision, state: { in: ["OPEN", "RETURNED"] } },
          data: { state: "SUBMITTED", lastClientRevision: { increment: 1 }, lastSavedAt: new Date(), submittedAt: new Date() },
        })
        if (updatedSession.count !== 1) throw new Error("WORKSPACE_REVISION_CONFLICT")
        for (const evidence of drafts) {
          const updated = await tx.assessmentEvidence.updateMany({
            where: { id: evidence.id, capturedById: teacherId, status: evidence.status },
            data: { status: "SUBMITTED" },
          })
          if (updated.count !== 1) throw new Error("EVIDENCE_REVISION_CONFLICT")
          await tx.evidenceAuditEvent.create({
            data: {
              schoolId: lesson.entry.schoolId,
              evidenceId: evidence.id,
              planId: assessmentPlanId,
              actorId: teacherId,
              action: "SUBMITTED",
              priorStatus: evidence.status,
              newStatus: "SUBMITTED",
            },
          })
        }
      })
    } catch (error) {
      if (error instanceof Error && ["WORKSPACE_REVISION_CONFLICT", "EVIDENCE_REVISION_CONFLICT"].includes(error.message)) {
        const latest = await prisma.lessonWorkspaceSession.findUnique({ where: { id: workspaceSession.id }, select: { lastClientRevision: true } })
        return NextResponse.json({ error: "Workspace or evidence changed in another session; reload before submitting", code: "REVISION_CONFLICT", revision: latest?.lastClientRevision }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({
      submittedCount: drafts.length,
      incompleteCount: 0,
      warnings: [],
      session: { state: "SUBMITTED", revision: expectedRevision + 1, submittedAt: new Date().toISOString() },
    })
  } catch (error) {
    console.error("Teacher lesson submission error:", error)
    return NextResponse.json({ error: "Unable to submit lesson evidence" }, { status: 500 })
  }
}