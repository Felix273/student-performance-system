import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) { const session = await auth(); const access = requireRole(session, ["PARENT"]); if (!access.ok) return access.response; const studentId = request.nextUrl.searchParams.get("studentId"); const linked = await prisma.parentStudent.findFirst({ where: { parentId: access.user.id, ...(studentId ? { studentId } : {}) }, select: { studentId: true } }); if (!linked) return NextResponse.json({ error: "Learner not linked to this parent" }, { status: 403 }); const items = await prisma.assessmentEvidence.findMany({ where: { studentId: linked.studentId, status: "PUBLISHED" }, orderBy: { publishedAt: "desc" }, select: { id: true, publishedVersion: true, publishedSnapshot: true, publishedAt: true, assessmentPlan: { select: { title: true, date: true } } } }); return NextResponse.json(items) }
