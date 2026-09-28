import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import { canAccessClass, requireRole, schoolScope } from "@/lib/authorization"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const access = schoolScope(session, request.nextUrl.searchParams.get("schoolId"))
    if (!access.ok) return access.response
    const assessmentId = request.nextUrl.searchParams.get("assessmentId")
    if (!assessmentId) return NextResponse.json({ error: "assessmentId is required" }, { status: 400 })
    const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId }, select: { id: true, schoolId: true, classId: true } })
    if (!assessment || (access.schoolId && assessment.schoolId !== access.schoolId)) return NextResponse.json({ error: "Assessment not found" }, { status: 404 })
    const classAccess = await canAccessClass(session, assessment.classId)
    if (!classAccess.ok) return classAccess.response
    const evidence = await prisma.assessmentEvidence.findMany({ where: { assessmentId }, include: { student: { select: { id: true, name: true, admissionNo: true } }, learningOutcome: { select: { id: true, code: true, statement: true } }, competency: { select: { code: true, name: true } }, rubric: { select: { id: true, code: true, name: true } }, rubricScores: { include: { criterion: { select: { code: true, name: true } }, level: { select: { code: true, label: true, points: true } } } } }, orderBy: [{ student: { name: "asc" } }, { createdAt: "desc" }] })
    return NextResponse.json(evidence)
  } catch (error) {
    console.error("Evidence fetch error:", error)
    return NextResponse.json({ error: "Unable to load evidence" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"])
    if (!access.ok) return access.response
    const body = await request.json()
    const assessmentId = typeof body.assessmentId === "string" ? body.assessmentId : ""
    const studentId = typeof body.studentId === "string" ? body.studentId : ""
    if (!assessmentId || !studentId || typeof body.evidenceType !== "string") return NextResponse.json({ error: "Assessment, student, and evidence type are required" }, { status: 400 })
    const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId }, select: { id: true, schoolId: true, classId: true, maxScore: true } })
    const student = await prisma.student.findUnique({ where: { id: studentId }, select: { id: true, schoolId: true, classId: true } })
    if (!assessment || !student || assessment.schoolId !== student.schoolId || assessment.classId !== student.classId) return NextResponse.json({ error: "Assessment and learner must belong to the same class and school" }, { status: 400 })
    if (access.role === "SCHOOL_ADMIN" && assessment.schoolId !== access.user.schoolId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    if (access.role === "TEACHER") { const classAccess = await canAccessClass(session, assessment.classId); if (!classAccess.ok) return classAccess.response }
    if (body.learningOutcomeId) { const outcome = await prisma.learningOutcome.findUnique({ where: { id: body.learningOutcomeId }, select: { id: true } }); if (!outcome) return NextResponse.json({ error: "Learning outcome not found" }, { status: 404 }) }
    if (body.competencyId) { const competency = await prisma.competency.findUnique({ where: { id: body.competencyId }, select: { id: true } }); if (!competency) return NextResponse.json({ error: "Competency not found" }, { status: 404 }) }
    const numericScore = body.numericScore === null || body.numericScore === undefined || body.numericScore === "" ? undefined : Number(body.numericScore)
    if (numericScore !== undefined && (!Number.isFinite(numericScore) || numericScore < 0 || numericScore > assessment.maxScore)) return NextResponse.json({ error: `Score must be between 0 and ${assessment.maxScore}` }, { status: 400 })
    const evidence = await prisma.assessmentEvidence.create({ data: { schoolId: assessment.schoolId, assessmentId, studentId, learningOutcomeId: typeof body.learningOutcomeId === "string" ? body.learningOutcomeId : undefined, competencyId: typeof body.competencyId === "string" ? body.competencyId : undefined, rubricId: typeof body.rubricId === "string" ? body.rubricId : undefined, evidenceType: body.evidenceType, numericScore, maxScore: numericScore === undefined ? undefined : assessment.maxScore, masteryLevel: typeof body.masteryLevel === "string" ? body.masteryLevel : undefined, narrative: typeof body.narrative === "string" ? body.narrative.trim() : undefined, capturedById: access.user.id || "system", status: "SUBMITTED" }, include: { student: { select: { id: true, name: true } }, learningOutcome: { select: { code: true, statement: true } }, competency: { select: { code: true, name: true } } } })
    return NextResponse.json(evidence, { status: 201 })
  } catch (error) {
    console.error("Evidence creation error:", error)
    return NextResponse.json({ error: "Unable to save evidence" }, { status: 500 })
  }
}
