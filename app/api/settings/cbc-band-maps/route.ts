import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"

const mapInclude = { academicYear: { select: { id: true, name: true } }, bands: { orderBy: { sequence: "asc" as const } } }

export async function GET() {
  const session = await auth()
  const access = requireRole(session, ["SCHOOL_ADMIN"])
  if (!access.ok) return access.response
  const schoolId = access.user.schoolId
  if (!schoolId) return NextResponse.json({ error: "School context required" }, { status: 403 })

  const [academicYears, maps] = await Promise.all([
    prisma.academicYear.findMany({ where: { schoolId }, select: { id: true, name: true }, orderBy: { name: "desc" } }),
    prisma.cbcPerformanceBandMap.findMany({ where: { schoolId }, include: mapInclude, orderBy: [{ academicYear: { name: "desc" } }, { scope: "asc" }, { scopeCode: "asc" }] }),
  ])
  return NextResponse.json({ academicYears, maps })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  const access = requireRole(session, ["SCHOOL_ADMIN"])
  if (!access.ok) return access.response
  const schoolId = access.user.schoolId
  if (!schoolId) return NextResponse.json({ error: "School context required" }, { status: 403 })

  const body: unknown = await request.json()
  if (typeof body !== "object" || body === null) return NextResponse.json({ error: "Invalid map configuration" }, { status: 400 })
  const input = body as { academicYearId?: unknown; scope?: unknown; scopeCode?: unknown }
  if (typeof input.academicYearId !== "string" || !["SCHOOL", "STAGE", "GRADE"].includes(String(input.scope))) {
    return NextResponse.json({ error: "Academic year and map scope are required" }, { status: 400 })
  }

  const scope = input.scope as "SCHOOL" | "STAGE" | "GRADE"
  const scopeCode = typeof input.scopeCode === "string" ? input.scopeCode.trim() : ""
  if ((scope === "SCHOOL" && scopeCode) || (scope !== "SCHOOL" && !scopeCode)) {
    return NextResponse.json({ error: "School-wide maps use no scope code; grade and stage maps require one" }, { status: 400 })
  }
  const academicYear = await prisma.academicYear.findFirst({ where: { id: input.academicYearId, schoolId }, select: { id: true } })
  if (!academicYear) return NextResponse.json({ error: "Academic year not found" }, { status: 404 })

  try {
    const map = await prisma.cbcPerformanceBandMap.create({ data: { schoolId, academicYearId: academicYear.id, scope, scopeCode }, include: mapInclude })
    return NextResponse.json(map, { status: 201 })
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "A map already exists for this year and scope" }, { status: 409 })
    }
    throw error
  }
}