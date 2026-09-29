import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { canAccessClass, requireRole, schoolScope } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"

type RubricScoreInput = { criterionId: string; levelId: string; comment?: string }

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const access = schoolScope(session, request.nextUrl.searchParams.get("schoolId"))
    if (!access.ok) return access.response
    const assessmentId = request.nextUrl.searchParams.get("assessmentId")
    const assessmentPlanId = request.nextUrl.searchParams.get("assessmentPlanId")
    if (!assessmentId && !assessmentPlanId) return NextResponse.json({ error: "assessmentId or assessmentPlanId is required" }, { status: 400 })
    const context = assessmentId
      ? await prisma.assessment.findUnique({ where: { id: assessmentId }, select: { id: true, schoolId: true, classId: true } })
      : await prisma.assessmentPlan.findUnique({ where: { id: assessmentPlanId || "" }, select: { id: true, schoolId: true, classAssignment: { select: { classId: true } } } })
    if (!context) return NextResponse.json({ error: "Assessment context not found" }, { status: 404 })
    const schoolId = context.schoolId
    const classId = "classId" in context ? context.classId : context.classAssignment.classId
    if (access.schoolId && schoolId !== access.schoolId) return NextResponse.json({ error: "Assessment context not found" }, { status: 404 })
    const classAccess = await canAccessClass(session, classId)
    if (!classAccess.ok) return classAccess.response
    const evidence = await prisma.assessmentEvidence.findMany({ where: assessmentId ? { assessmentId } : { assessmentPlanId: assessmentPlanId || "" }, include: { student: { select: { id: true, name: true, admissionNo: true } }, learningOutcome: { select: { id: true, code: true, statement: true } }, competency: { select: { code: true, name: true } }, rubric: { select: { id: true, code: true, name: true } }, assessmentPlan: { select: { id: true, title: true, status: true, date: true } }, rubricScores: { include: { criterion: { select: { code: true, name: true } }, level: { select: { code: true, label: true, points: true } } } } }, orderBy: [{ student: { name: "asc" } }, { createdAt: "desc" }] })
    return NextResponse.json(evidence)
  } catch (error) { console.error("Evidence fetch error:", error); return NextResponse.json({ error: "Unable to load evidence" }, { status: 500 }) }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"])
    if (!access.ok) return access.response
    const body = await request.json()
    const assessmentId = typeof body.assessmentId === "string" ? body.assessmentId : ""
    const assessmentPlanId = typeof body.assessmentPlanId === "string" ? body.assessmentPlanId : ""
    const studentId = typeof body.studentId === "string" ? body.studentId : ""
    if ((!assessmentId && !assessmentPlanId) || !studentId || typeof body.evidenceType !== "string") return NextResponse.json({ error: "Assessment or plan, student, and evidence type are required" }, { status: 400 })

    let schoolId = ""
    let classId = ""
    let maximumScore: number | null = null
    let planRubricId: string | null = null
    if (assessmentId) {
      const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId }, select: { id: true, schoolId: true, classId: true, maxScore: true } })
      if (!assessment) return NextResponse.json({ error: "Assessment not found" }, { status: 404 })
      schoolId = assessment.schoolId; classId = assessment.classId; maximumScore = assessment.maxScore
    } else {
      const plan = await prisma.assessmentPlan.findUnique({ where: { id: assessmentPlanId }, select: { id: true, schoolId: true, status: true, rubricId: true, classAssignment: { select: { classId: true } }, components: { orderBy: { sequence: "asc" }, select: { maxScore: true } } } })
      if (!plan) return NextResponse.json({ error: "Assessment plan not found" }, { status: 404 })
      if (access.role === "TEACHER" && plan.status !== "OPEN") return NextResponse.json({ error: "This plan is not open for evidence entry" }, { status: 409 })
      schoolId = plan.schoolId; classId = plan.classAssignment.classId; planRubricId = plan.rubricId; maximumScore = plan.components[0]?.maxScore ?? null
    }
    const student = await prisma.student.findUnique({ where: { id: studentId }, select: { id: true, schoolId: true, classId: true } })
    if (!student || schoolId !== student.schoolId || classId !== student.classId) return NextResponse.json({ error: "Assessment context and learner must belong to the same class and school" }, { status: 400 })
    if (access.role === "SCHOOL_ADMIN" && schoolId !== access.user.schoolId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    const classAccess = await canAccessClass(session, classId); if (!classAccess.ok) return classAccess.response
    if (body.learningOutcomeId) { const outcome = await prisma.learningOutcome.findUnique({ where: { id: body.learningOutcomeId }, select: { id: true } }); if (!outcome) return NextResponse.json({ error: "Learning outcome not found" }, { status: 404 }) }
    if (body.competencyId) { const competency = await prisma.competency.findUnique({ where: { id: body.competencyId }, select: { id: true } }); if (!competency) return NextResponse.json({ error: "Competency not found" }, { status: 404 }) }
    const rubricId = typeof body.rubricId === "string" ? body.rubricId : planRubricId || ""
    const rubricScores: RubricScoreInput[] = Array.isArray(body.rubricScores) ? body.rubricScores.reduce((scores: RubricScoreInput[], score: unknown) => { if (typeof score === "object" && score !== null && "criterionId" in score && "levelId" in score && typeof score.criterionId === "string" && typeof score.levelId === "string") scores.push({ criterionId: score.criterionId, levelId: score.levelId, comment: "comment" in score && typeof score.comment === "string" ? score.comment : undefined }); return scores }, []) : []
    if (rubricId) {
      const rubric = await prisma.rubric.findUnique({ where: { id: rubricId }, select: { id: true, criteria: { select: { id: true, levels: { select: { id: true } } } } } })
      if (!rubric) return NextResponse.json({ error: "Rubric not found" }, { status: 404 })
      const validPairs = new Set(rubric.criteria.flatMap((criterion) => criterion.levels.map((level) => `${criterion.id}:${level.id}`)))
      if (rubricScores.some((score) => !validPairs.has(`${score.criterionId}:${score.levelId}`))) return NextResponse.json({ error: "One or more rubric levels do not belong to the selected rubric" }, { status: 400 })
      if (new Set(rubricScores.map((score) => score.criterionId)).size !== rubricScores.length) return NextResponse.json({ error: "Each rubric criterion can only be scored once" }, { status: 400 })
    } else if (rubricScores.length > 0) return NextResponse.json({ error: "A rubric is required when criterion scores are provided" }, { status: 400 })
    const numericScore = body.numericScore === null || body.numericScore === undefined || body.numericScore === "" ? undefined : Number(body.numericScore)
    if (numericScore !== undefined && (!Number.isFinite(numericScore) || numericScore < 0 || (maximumScore !== null && numericScore > maximumScore))) return NextResponse.json({ error: `Score must be between 0 and ${maximumScore ?? "the maximum"}` }, { status: 400 })
    const evidence = await prisma.assessmentEvidence.create({ data: { schoolId, assessmentId: assessmentId || undefined, assessmentPlanId: assessmentPlanId || undefined, componentId: typeof body.componentId === "string" ? body.componentId : undefined, studentId, learningOutcomeId: typeof body.learningOutcomeId === "string" ? body.learningOutcomeId : undefined, competencyId: typeof body.competencyId === "string" ? body.competencyId : undefined, rubricId: rubricId || undefined, evidenceType: body.evidenceType, numericScore, maxScore: numericScore === undefined ? maximumScore ?? undefined : maximumScore ?? undefined, masteryLevel: typeof body.masteryLevel === "string" ? body.masteryLevel : undefined, narrative: typeof body.narrative === "string" ? body.narrative.trim() : undefined, capturedById: access.user.id || "system", status: "SUBMITTED", rubricScores: rubricScores.length > 0 ? { create: rubricScores.map((score) => ({ criterionId: score.criterionId, levelId: score.levelId, comment: typeof score.comment === "string" ? score.comment.trim() : undefined })) } : undefined }, include: { student: { select: { id: true, name: true } }, assessmentPlan: { select: { title: true, status: true } }, learningOutcome: { select: { code: true, statement: true } }, competency: { select: { code: true, name: true } }, rubricScores: { include: { criterion: { select: { code: true, name: true } }, level: { select: { code: true, label: true, points: true } } } } } })
    if (access.role === "TEACHER") {
      const parents = await prisma.parentStudent.findMany({ where: { studentId }, select: { parentId: true } })
      if (parents.length > 0) {
        const hasMastery = typeof body.masteryLevel === "string" && body.masteryLevel.length > 0
        await prisma.notification.createMany({ data: parents.map((parent) => ({ schoolId, recipientId: parent.parentId, studentId, evidenceId: evidence.id, type: hasMastery ? "MASTERY_RECORDED" as const : "EVIDENCE_RECORDED" as const, title: hasMastery ? "New mastery level recorded" : "New learning evidence recorded", message: hasMastery ? `A teacher recorded a ${body.masteryLevel} mastery level for your child. The school may review it before publication.` : "A teacher recorded new learning evidence for your child. The school may review it before publication.", href: `/dashboard/parent/student/${studentId}` })) })
      }
    }
    return NextResponse.json(evidence, { status: 201 })
  } catch (error) { console.error("Evidence creation error:", error); return NextResponse.json({ error: "Unable to save evidence" }, { status: 500 }) }
}
