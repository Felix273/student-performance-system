import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import { DEFAULT_REPORT_TEMPLATE_SECTIONS, normalizeReportTemplateSections } from "@/lib/reports/reportTemplateSections"

function scopedSchoolId(userSchoolId: string | null | undefined, requestedSchoolId: string | null) {
  if (!userSchoolId) return ""
  return requestedSchoolId && requestedSchoolId !== userSchoolId ? "" : userSchoolId
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SCHOOL_ADMIN"])
    if (!access.ok) return access.response
    const schoolId = scopedSchoolId(access.user.schoolId, request.nextUrl.searchParams.get("schoolId"))
    if (!schoolId) return NextResponse.json({ error: "School context required" }, { status: 400 })

    const templates = await prisma.reportTemplate.findMany({
      where: { schoolId },
      include: { sections: { orderBy: { sequence: "asc" } } },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    })
    return NextResponse.json(templates)
  } catch (error) {
    console.error("Report template fetch error:", error)
    return NextResponse.json({ error: "Unable to load report templates" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SCHOOL_ADMIN"])
    if (!access.ok) return access.response
    const actorId = access.user.id
    if (!actorId) return NextResponse.json({ error: "Authenticated user required" }, { status: 401 })

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") return NextResponse.json({ error: "A JSON request body is required" }, { status: 400 })
    const schoolId = scopedSchoolId(access.user.schoolId, typeof body.schoolId === "string" ? body.schoolId : null)
    const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : ""
    const name = typeof body.name === "string" ? body.name.trim() : ""
    if (!schoolId) return NextResponse.json({ error: "School context required" }, { status: 400 })
    if (!/^[A-Z0-9_-]{2,40}$/.test(code) || !name || name.length > 120) {
      return NextResponse.json({ error: "A template code (2–40 letters/numbers) and name (1–120 characters) are required" }, { status: 400 })
    }

    const sectionResult = normalizeReportTemplateSections(body.sections === undefined ? DEFAULT_REPORT_TEMPLATE_SECTIONS : body.sections)
    if (!sectionResult.ok) return NextResponse.json({ error: sectionResult.error }, { status: 400 })
    const normalizedSections = sectionResult.sections

    const curriculumVersionId = typeof body.curriculumVersionId === "string" ? body.curriculumVersionId : null
    if (!curriculumVersionId) return NextResponse.json({ error: "A curriculum version is required for a CBC report template" }, { status: 400 })
    const version = await prisma.curriculumVersion.findUnique({ where: { id: curriculumVersionId }, select: { id: true, status: true } })
    if (!version) return NextResponse.json({ error: "Curriculum version not found" }, { status: 404 })
    if (version.status !== "PUBLISHED" && version.status !== "RETIRED") return NextResponse.json({ error: "Templates can only use a published curriculum version" }, { status: 409 })
    const schoolOffering = await prisma.curriculumOffering.findFirst({
      where: { schoolId, curriculumVersionId, status: { in: ["ACTIVE", "ARCHIVED"] } },
      select: { id: true },
    })
    if (!schoolOffering) return NextResponse.json({ error: "This school has no active or archived offering for the selected curriculum version" }, { status: 409 })
    const isDefault = body.isDefault === true

    const template = await prisma.$transaction(async (tx) => {
      if (isDefault) await tx.reportTemplate.updateMany({ where: { schoolId, isDefault: true }, data: { isDefault: false } })
      return tx.reportTemplate.create({
        data: {
          schoolId,
          code,
          name,
          description: typeof body.description === "string" ? body.description.trim() || undefined : undefined,
          curriculumVersionId: curriculumVersionId || undefined,
          isDefault,
          createdById: actorId,
          sections: { create: normalizedSections },
        },
        include: { sections: { orderBy: { sequence: "asc" } } },
      })
    })
    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "A template with this code already exists for the school" }, { status: 409 })
    }
    console.error("Report template creation error:", error)
    return NextResponse.json({ error: "Unable to create report template" }, { status: 500 })
  }
}
