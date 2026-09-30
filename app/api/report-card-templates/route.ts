import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"

const sectionTypes = new Set(["SUMMARY", "ASSESSMENT", "OUTCOME", "COMPETENCY", "ATTENDANCE", "COMMENT", "CUSTOM"])

const defaultSections = [
  { code: "SUMMARY", title: "Learning summary", sectionType: "SUMMARY", sequence: 0 },
  { code: "CBC_EVIDENCE", title: "CBC learning evidence", sectionType: "OUTCOME", sequence: 1 },
  { code: "LEGACY_ASSESSMENTS", title: "Assessment history", sectionType: "ASSESSMENT", sequence: 2 },
  { code: "TEACHER_COMMENT", title: "Teacher comments", sectionType: "COMMENT", sequence: 3 },
]

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

    const rawSections = Array.isArray(body.sections) ? body.sections : defaultSections
    if (rawSections.length === 0 || rawSections.length > 30) return NextResponse.json({ error: "A template must have between 1 and 30 sections" }, { status: 400 })
    const sections = rawSections.map((section: unknown, index: number) => {
      if (typeof section !== "object" || section === null) return null
      const value = section as Record<string, unknown>
      const sectionCode = typeof value.code === "string" ? value.code.trim().toUpperCase() : ""
      const title = typeof value.title === "string" ? value.title.trim() : ""
      const sectionType = typeof value.sectionType === "string" ? value.sectionType : ""
      const sequence = value.sequence === undefined ? index : Number(value.sequence)
      if (!/^[A-Z0-9_-]{2,40}$/.test(sectionCode) || !title || title.length > 120 || !sectionTypes.has(sectionType) || !Number.isInteger(sequence) || sequence < 0) return null
      return {
        code: sectionCode,
        title,
        sectionType,
        sequence,
        isEnabled: value.isEnabled !== false,
        isRequired: value.isRequired === true,
        ...(typeof value.description === "string" && value.description.trim() ? { description: value.description.trim() } : {}),
      }
    })
    if (sections.some((section: unknown) => section === null)) return NextResponse.json({ error: "Each section needs a valid code, title, type, and non-negative order" }, { status: 400 })
    const normalizedSections = sections as NonNullable<(typeof sections)[number]>[]
    if (new Set(normalizedSections.map((section) => section.code)).size !== normalizedSections.length) {
      return NextResponse.json({ error: "Section codes must be unique within a template" }, { status: 400 })
    }
    if (!normalizedSections.some((section) => section.code === "CBC_EVIDENCE" && section.isEnabled)) {
      return NextResponse.json({ error: "CBC report templates must include an enabled CBC_EVIDENCE section" }, { status: 400 })
    }

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
