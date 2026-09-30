import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { canAccessClass, requireRole } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"

const validTypes = new Set(["CLASSROOM", "FORMATIVE", "SUMMATIVE", "PROJECT", "PRACTICAL", "OBSERVATION", "SELF_ASSESSMENT", "PEER_ASSESSMENT", "EXAM", "COURSEWORK", "MOCK_EXAM"])

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SCHOOL_ADMIN", "TEACHER"])
    if (!access.ok) return access.response
    const classId = request.nextUrl.searchParams.get("classId")
    const where = access.role === "TEACHER"
      ? { schoolId: access.user.schoolId || "", classAssignment: { ...(classId ? { classId } : {}), class: { teachers: { some: { teacherId: access.user.id } } } } }
      : { ...(access.role === "SCHOOL_ADMIN" ? { schoolId: access.user.schoolId || "" } : {}), ...(classId ? { classAssignment: { classId } } : {}) }
    const plans = await prisma.assessmentPlan.findMany({ where, include: { classAssignment: { include: { class: { select: { id: true, name: true, grade: true } }, offeringGrade: { select: { displayName: true } } } }, period: { select: { id: true, name: true } }, rubric: { select: { id: true, name: true } }, gradeScale: { select: { id: true, name: true, scaleType: true } }, components: { orderBy: { sequence: "asc" }, select: { id: true, name: true, maxScore: true, weight: true } }, _count: { select: { evidence: true } } }, orderBy: [{ date: "desc" }, { createdAt: "desc" }] })
    return NextResponse.json(plans)
  } catch (error) { console.error("Assessment plan fetch error:", error); return NextResponse.json({ error: "Unable to load assessment plans" }, { status: 500 }) }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SCHOOL_ADMIN", "TEACHER"])
    if (!access.ok) return access.response
    const body = await request.json()
    const classAssignmentId = typeof body.classAssignmentId === "string" ? body.classAssignmentId : ""
    const periodId = typeof body.periodId === "string" ? body.periodId : ""
    const title = typeof body.title === "string" ? body.title.trim() : ""
    const assessmentType = typeof body.assessmentType === "string" ? body.assessmentType : ""
    if (!classAssignmentId || !periodId || !title || !validTypes.has(assessmentType)) return NextResponse.json({ error: "Class assignment, period, title, and valid assessment type are required" }, { status: 400 })
    const assignment = await prisma.classCurriculumAssignment.findUnique({ where: { id: classAssignmentId }, select: { id: true, schoolId: true, classId: true, academicYearId: true, periodId: true, offeringId: true } })
    const period = await prisma.academicPeriod.findUnique({ where: { id: periodId }, select: { id: true, academicYearId: true } })
    if (!assignment || !period || assignment.academicYearId !== period.academicYearId || (assignment.periodId && assignment.periodId !== periodId)) return NextResponse.json({ error: "Assignment and period must belong to the same academic year" }, { status: 400 })
    const classAccess = await canAccessClass(session, assignment.classId)
    if (!classAccess.ok) return classAccess.response
    if (classAccess.classData.schoolId !== assignment.schoolId) return NextResponse.json({ error: "Assignment belongs to another school" }, { status: 403 })
    type ComponentInput = { name: string; maxScore?: number; weight?: number }
    const rawComponents = Array.isArray(body.components) ? body.components : []
    const components = rawComponents.filter((component: unknown): component is ComponentInput => typeof component === "object" && component !== null && "name" in component && typeof component.name === "string" && component.name.trim().length > 0).map((component: ComponentInput, index: number) => ({ name: component.name.trim(), maxScore: component.maxScore === undefined ? undefined : Number(component.maxScore), weight: component.weight === undefined ? undefined : Number(component.weight), sequence: index }))
    const plan = await prisma.assessmentPlan.create({ data: { schoolId: assignment.schoolId, classAssignmentId, periodId, title, assessmentType, status: "DRAFT", rubricId: typeof body.rubricId === "string" ? body.rubricId : undefined, gradeScaleId: typeof body.gradeScaleId === "string" ? body.gradeScaleId : undefined, weight: body.weight === undefined ? undefined : Number(body.weight), date: body.date ? new Date(body.date) : undefined, instructions: typeof body.instructions === "string" ? body.instructions.trim() : undefined, createdById: access.user.id || "system", components: components.length ? { create: components } : undefined }, include: { classAssignment: { include: { class: true } }, period: true, components: true } })
    return NextResponse.json(plan, { status: 201 })
  } catch (error) { console.error("Assessment plan creation error:", error); return NextResponse.json({ error: "Unable to create assessment plan" }, { status: 500 }) }
}
