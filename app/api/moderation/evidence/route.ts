import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const session = await auth(); const access = requireRole(session, ["SCHOOL_ADMIN"]); if (!access.ok) return access.response
  const q = request.nextUrl.searchParams; const status = q.get("status") || "SUBMITTED"; const schoolId = access.user.schoolId
  const page = Math.max(1, Number(q.get("page") || 1)); const pageSize = Math.min(100, Math.max(1, Number(q.get("pageSize") || 25)))
  const where = { ...(schoolId ? { schoolId } : {}), ...(status !== "ALL" ? { status: status as never } : {}), ...(q.get("classId") ? { student: { classId: q.get("classId")! } } : {}), ...(q.get("planId") ? { assessmentPlanId: q.get("planId")! } : {}), ...(q.get("outcomeId") ? { learningOutcomeId: q.get("outcomeId")! } : {}), ...(q.get("competencyId") ? { competencyId: q.get("competencyId")! } : {}) }
  const [items, total] = await prisma.$transaction([prisma.assessmentEvidence.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { updatedAt: "desc" }, include: { student: { select: { id: true, name: true, admissionNo: true, class: { select: { id: true, name: true } } } }, assessmentPlan: { select: { id: true, title: true, date: true, status: true } }, component: { select: { name: true } }, learningOutcome: { select: { code: true, statement: true } }, competency: { select: { code: true, name: true } } } }), prisma.assessmentEvidence.count({ where })])
  return NextResponse.json({ items, pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) } })
}
