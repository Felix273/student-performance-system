import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/authorization"
import { authorizeTeacherLesson, lessonError } from "@/lib/teacherLessonWorkspace"

type RouteContext = { params: Promise<{ timetableEntryId: string }> }

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth()
    const access = requireRole(session, ["TEACHER", "SCHOOL_ADMIN"])
    if (!access.ok) return access.response
    const schoolId = access.user.schoolId
    if (!schoolId) return NextResponse.json({ error: "School context required" }, { status: 403 })

    const { timetableEntryId } = await params
    const entry = await prisma.timetableEntry.findFirst({
      where: { id: timetableEntryId, schoolId },
      include: {
        academicYear: { select: { id: true, name: true } },
        period: { select: { id: true, name: true, code: true } },
        class: { select: { id: true, name: true, grade: true } },
        teacher: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true, code: true } },
        curriculumAssignment: {
          include: {
            offering: {
              include: {
                curriculum: { select: { name: true, code: true } },
                curriculumVersion: { select: { version: true, status: true } },
              },
            },
            offeringGrade: { select: { gradeCode: true, displayName: true } },
          },
        },
      },
    })

    if (!entry) return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    if (access.role === "TEACHER") {
      if (entry.teacherId !== access.user.id) return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
      const assignment = await prisma.teacherClass.findFirst({
        where: {
          teacherId: access.user.id,
          classId: entry.classId,
          OR: [{ subjectId: entry.subjectId }, { subjectId: null }],
        },
        select: { id: true },
      })
      if (!assignment) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const matchingAssignments = entry.curriculumAssignment
      ? [entry.curriculumAssignment]
      : await prisma.classCurriculumAssignment.findMany({
          where: {
            schoolId: entry.schoolId,
            classId: entry.classId,
            academicYearId: entry.academicYearId,
            ...(entry.periodId ? { OR: [{ periodId: entry.periodId }, { periodId: null }] } : {}),
            status: "ACTIVE",
          },
          include: {
            offering: {
              include: {
                curriculum: { select: { name: true, code: true } },
                curriculumVersion: { select: { version: true, status: true } },
              },
            },
            offeringGrade: { select: { gradeCode: true, displayName: true } },
          },
        })

    const curriculumAssignment = matchingAssignments.length === 1 ? matchingAssignments[0] : null
    const curriculumStatus = matchingAssignments.length === 0 || (matchingAssignments.length === 1 && matchingAssignments[0].status !== "ACTIVE")
      ? "missing"
      : matchingAssignments.length > 1
        ? "ambiguous"
        : "ready"
    if (curriculumAssignment && (curriculumAssignment.classId !== entry.classId || curriculumAssignment.academicYearId !== entry.academicYearId || curriculumAssignment.schoolId !== entry.schoolId)) {
      return NextResponse.json({ error: "Curriculum assignment does not match this lesson" }, { status: 409 })
    }

    const workspaceTeacherId = entry.teacherId
    const [initialWorkspaceSession, focusRows, plans] = await Promise.all([
      prisma.lessonWorkspaceSession.upsert({
        where: { timetableEntryId_teacherId: { timetableEntryId: entry.id, teacherId: workspaceTeacherId } },
        create: { schoolId: entry.schoolId, timetableEntryId: entry.id, teacherId: workspaceTeacherId },
        update: {},
      }),
      prisma.lessonFocus.findMany({
        where: { timetableEntryId: entry.id, schoolId: entry.schoolId },
        include: {
          curriculumNode: { select: { id: true, code: true, title: true, nodeType: true } },
          learningOutcome: { select: { id: true, code: true, statement: true, suggestedActivities: true } },
          competency: { select: { id: true, code: true, name: true } },
          value: { select: { id: true, code: true, name: true } },
        },
        orderBy: { sequence: "asc" },
      }),
      curriculumAssignment
        ? prisma.assessmentPlan.findMany({
            where: { schoolId: entry.schoolId, classAssignmentId: curriculumAssignment.id, ...(entry.periodId ? { periodId: entry.periodId } : {}) },
            include: {
              rubric: {
                select: {
                  id: true,
                  name: true,
                  criteria: {
                    orderBy: { sequence: "asc" },
                    select: {
                      id: true,
                      code: true,
                      name: true,
                      sequence: true,
                      levels: {
                        orderBy: { sequence: "asc" },
                        select: { id: true, code: true, label: true, points: true, sequence: true },
                      },
                    },
                  },
                },
              },
              gradeScale: { select: { id: true, name: true, scaleType: true } },
              components: { orderBy: { sequence: "asc" }, select: { id: true, name: true, maxScore: true, weight: true } },
              nodes: { include: { curriculumNode: { select: { id: true, code: true, title: true, nodeType: true } }, learningOutcome: { select: { id: true, code: true, statement: true, suggestedActivities: true } } } },
            },
            orderBy: [{ date: "desc" }, { createdAt: "desc" }],
            take: 12,
          })
        : Promise.resolve([]),
    ])

    const selectedPlan = plans.find((plan) => plan.id === initialWorkspaceSession.assessmentPlanId) ?? plans.find((plan) => plan.status === "OPEN") ?? null
    const students = await prisma.student.findMany({
      where: { classId: entry.classId, schoolId: entry.schoolId },
      select: {
        id: true,
        name: true,
        admissionNo: true,
        attendance: { where: { date: { gte: utcDayStart(), lt: utcNextDayStart() } }, select: { id: true, status: true, remarks: true, updatedAt: true }, take: 1 },
        cbcEvidence: {
          where: {
            schoolId: entry.schoolId,
            ...(selectedPlan ? { assessmentPlanId: selectedPlan.id } : {}),
            OR: [{ status: "PUBLISHED" }, { capturedById: workspaceTeacherId }],
          },
          select: { id: true, assessmentPlanId: true, status: true, evidenceType: true, numericScore: true, masteryLevel: true, narrative: true, internalNote: true, learningOutcomeId: true, competencyId: true, componentId: true, rubricId: true, capturedById: true, updatedAt: true, rubricScores: { select: { criterionId: true, levelId: true, comment: true } } },
          orderBy: { updatedAt: "desc" },
          take: 3,
        },
      },
      orderBy: { name: "asc" },
    })
    let workspaceSession = initialWorkspaceSession
    const hasReturnedEvidence = students.some((student) => student.cbcEvidence.some((evidence) => evidence.status === "RETURNED"))
    if (hasReturnedEvidence && workspaceSession.state === "SUBMITTED") {
      await prisma.lessonWorkspaceSession.updateMany({
        where: { id: workspaceSession.id, state: "SUBMITTED" },
        data: { state: "RETURNED", lastClientRevision: { increment: 1 }, lastSavedAt: new Date() },
      })
      workspaceSession = await prisma.lessonWorkspaceSession.findUniqueOrThrow({
        where: { id: workspaceSession.id },
        select: { id: true, state: true, lastClientRevision: true, lastSavedAt: true, assessmentPlanId: true, teacherId: true, schoolId: true, timetableEntryId: true, submittedAt: true, closedAt: true, createdAt: true, updatedAt: true },
      })
    }
    const selectedFocus = focusRows.length > 0 ? focusRows : selectedPlan?.nodes.map((link) => ({
      ...link,
      competency: null,
      value: null,
      note: null,
    })) ?? []
    const attendance = students.map((student) => ({ studentId: student.id, record: student.attendance[0] ?? null }))
    const outcomes = selectedFocus.flatMap((focus) => focus.learningOutcome ? [focus.learningOutcome] : [])
    const suggestedActivities = [...new Set(outcomes.flatMap((outcome) => outcome.suggestedActivities ? outcome.suggestedActivities.split("\n").filter(Boolean) : []))]

    return NextResponse.json({
      context: {
        timetableEntry: { id: entry.id, day: entry.day, startTime: entry.startTime, endTime: entry.endTime, room: entry.room, notes: entry.notes },
        academicYear: entry.academicYear,
        period: entry.period,
        class: entry.class,
        subject: entry.subject,
        teacher: entry.teacher,
        curriculum: {
          assignmentId: curriculumAssignment?.id ?? null,
          frameworkName: curriculumAssignment?.offering.curriculum.name ?? null,
          version: curriculumAssignment?.offering.curriculumVersion.version ?? null,
          grade: curriculumAssignment ? { code: curriculumAssignment.offeringGrade.gradeCode, displayName: curriculumAssignment.offeringGrade.displayName } : null,
          status: curriculumStatus,
        },
      },
      focus: {
        nodes: selectedFocus.flatMap((focus) => focus.curriculumNode ? [focus.curriculumNode] : []),
        outcomes,
        competencies: [...new Map(selectedFocus.flatMap((focus) => focus.competency ? [[focus.competency.id, focus.competency] as const] : []).map(([id, item]) => [id, item])).values()],
        values: [...new Map(selectedFocus.flatMap((focus) => focus.value ? [[focus.value.id, focus.value] as const] : []).map(([id, item]) => [id, item])).values()],
        suggestedActivities,
        saved: focusRows,
      },
      plans: {
        selected: selectedPlan,
        open: plans.filter((plan) => plan.status === "OPEN"),
        recent: plans.filter((plan) => plan.status !== "OPEN").slice(0, 5),
      },
      learners: students.map((student) => ({
        id: student.id,
        name: student.name,
        admissionNo: student.admissionNo,
        attendance: student.attendance[0] ?? null,
        evidence: student.cbcEvidence.map(({ capturedById, ...evidence }) => ({
          ...evidence,
          editable: capturedById === workspaceTeacherId && ["DRAFT", "RETURNED"].includes(evidence.status),
        })),
      })),
      attendance: { date: new Date().toISOString().slice(0, 10), records: attendance },
      session: { id: workspaceSession.id, state: workspaceSession.state, revision: workspaceSession.lastClientRevision, lastSavedAt: workspaceSession.lastSavedAt },
      permissions: {
        canTakeAttendance: access.role === "TEACHER",
        canCreateEvidence: access.role === "TEACHER",
        canSubmit: access.role === "TEACHER",
        canViewInternalNotes: access.role === "TEACHER" || access.role === "SCHOOL_ADMIN",
        canReview: access.role === "SCHOOL_ADMIN",
      },
      warnings: [curriculumStatus !== "ready" ? { code: `CURRICULUM_${curriculumStatus.toUpperCase()}`, message: curriculumStatus === "ambiguous" ? "More than one active curriculum assignment matches this timetable entry." : "No active curriculum assignment is linked to this timetable entry." } : null].filter(Boolean),
    })
  } catch (error) {
    console.error("Teacher lesson workspace load error:", error)
    return NextResponse.json({ error: "Unable to load lesson workspace" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth()
    const { timetableEntryId } = await params
    const lesson = await authorizeTeacherLesson(session, timetableEntryId)
    if (!lesson.ok) return lessonError(lesson)
    if (lesson.access.role !== "TEACHER") return NextResponse.json({ error: "Only the assigned teacher can change the selected plan" }, { status: 403 })
    const teacherId = lesson.access.user.id
    if (!teacherId) return NextResponse.json({ error: "Teacher account is invalid" }, { status: 403 })

    const body = await request.json()
    const assessmentPlanId = body.assessmentPlanId === null ? null : typeof body.assessmentPlanId === "string" ? body.assessmentPlanId : undefined
    const expectedRevision = Number(body.expectedRevision)
    if (assessmentPlanId === undefined || !Number.isInteger(expectedRevision) || expectedRevision < 0) {
      return NextResponse.json({ error: "Provide assessmentPlanId and the expected workspace revision" }, { status: 400 })
    }
    if (assessmentPlanId && (!lesson.curriculumAssignment || lesson.curriculumAssignment.status !== "ACTIVE")) {
      return NextResponse.json({ error: "Link a unique active curriculum assignment before selecting a plan" }, { status: 409 })
    }

    if (assessmentPlanId) {
      const plan = await prisma.assessmentPlan.findFirst({
        where: {
          id: assessmentPlanId,
          schoolId: lesson.entry.schoolId,
          classAssignmentId: lesson.curriculumAssignment!.id,
          status: "OPEN",
          ...(lesson.entry.periodId ? { periodId: lesson.entry.periodId } : {}),
        },
        select: { id: true },
      })
      if (!plan) return NextResponse.json({ error: "Plan must be open and belong to this lesson's class, school, and period" }, { status: 400 })
    }

    const workspaceSession = await prisma.lessonWorkspaceSession.upsert({
      where: { timetableEntryId_teacherId: { timetableEntryId: lesson.entry.id, teacherId } },
      create: { schoolId: lesson.entry.schoolId, timetableEntryId: lesson.entry.id, teacherId },
      update: {},
      select: { id: true, lastClientRevision: true },
    })
    if (workspaceSession.lastClientRevision !== expectedRevision) {
      return NextResponse.json({ error: "Workspace changed in another session; reload before continuing", code: "REVISION_CONFLICT", revision: workspaceSession.lastClientRevision }, { status: 409 })
    }

    const updated = await prisma.lessonWorkspaceSession.updateMany({
      where: { id: workspaceSession.id, lastClientRevision: expectedRevision, state: { in: ["OPEN", "RETURNED"] } },
      data: { assessmentPlanId, state: "OPEN", lastClientRevision: { increment: 1 }, lastSavedAt: new Date() },
    })
    if (updated.count !== 1) return NextResponse.json({ error: "Workspace changed or is no longer editable", code: "REVISION_CONFLICT" }, { status: 409 })
    const saved = await prisma.lessonWorkspaceSession.findUniqueOrThrow({ where: { id: workspaceSession.id }, select: { id: true, assessmentPlanId: true, state: true, lastClientRevision: true, lastSavedAt: true } })
    return NextResponse.json({ session: saved })
  } catch (error) {
    console.error("Teacher lesson plan selection error:", error)
    return NextResponse.json({ error: "Unable to select assessment plan" }, { status: 500 })
  }
}

function utcDayStart() {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

function utcNextDayStart() {
  const dayStart = utcDayStart()
  dayStart.setUTCDate(dayStart.getUTCDate() + 1)
  return dayStart
}
