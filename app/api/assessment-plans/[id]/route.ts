import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { canAccessClass, requireRole } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"

const transitions: Record<string, string[]> = { DRAFT: ["OPEN", "ARCHIVED"], OPEN: ["SUBMITTED", "ARCHIVED"], SUBMITTED: ["MODERATION", "OPEN"], MODERATION: ["PUBLISHED", "OPEN"], PUBLISHED: ["LOCKED"], LOCKED: [], ARCHIVED: [] }

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth(); const access = requireRole(session, ["SCHOOL_ADMIN", "TEACHER"]); if (!access.ok) return access.response
    const { id } = await params
    const plan = await prisma.assessmentPlan.findUnique({ where: { id }, include: { classAssignment: { include: { class: { select: { id: true, name: true, grade: true }, }, offeringGrade: { select: { displayName: true } } } }, period: true, rubric: { include: { criteria: { include: { levels: { orderBy: { sequence: "asc" } } } } } }, gradeScale: { include: { bands: { orderBy: { sequence: "asc" } } } }, nodes: { include: { curriculumNode: true, learningOutcome: true } }, components: { orderBy: { sequence: "asc" } } } })
    if (!plan) return NextResponse.json({ error: "Assessment plan not found" }, { status: 404 })
    const classAccess = await canAccessClass(session, plan.classAssignment.classId); if (!classAccess.ok) return classAccess.response
    return NextResponse.json(plan)
  } catch (error) { console.error("Assessment plan detail error:", error); return NextResponse.json({ error: "Unable to load assessment plan" }, { status: 500 }) }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth(); const access = requireRole(session, ["SCHOOL_ADMIN", "TEACHER"]); if (!access.ok) return access.response
    const { id } = await params; const body = await request.json(); const nextStatus = typeof body.status === "string" ? body.status : ""
    const plan = await prisma.assessmentPlan.findUnique({ where: { id }, select: { id: true, status: true, classAssignment: { select: { classId: true } } } })
    if (!plan) return NextResponse.json({ error: "Assessment plan not found" }, { status: 404 })
    const classAccess = await canAccessClass(session, plan.classAssignment.classId); if (!classAccess.ok) return classAccess.response
    if (!transitions[plan.status]?.includes(nextStatus)) return NextResponse.json({ error: `Cannot move a ${plan.status.toLowerCase()} plan to ${nextStatus.toLowerCase()}` }, { status: 409 })
    if (nextStatus === "PUBLISHED" && access.role === "TEACHER") return NextResponse.json({ error: "Only a school administrator or moderator can publish plans" }, { status: 403 })
    const updated = await prisma.assessmentPlan.update({ where: { id }, data: { status: nextStatus, publishedAt: nextStatus === "PUBLISHED" ? new Date() : undefined, lockedAt: nextStatus === "LOCKED" ? new Date() : undefined }, select: { id: true, status: true, publishedAt: true, lockedAt: true } })
    return NextResponse.json(updated)
  } catch (error) { console.error("Assessment plan status error:", error); return NextResponse.json({ error: "Unable to update assessment plan" }, { status: 500 }) }
}
