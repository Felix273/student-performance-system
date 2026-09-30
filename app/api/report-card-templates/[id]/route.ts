import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import { normalizeReportTemplateSections } from "@/lib/reports/reportTemplateSections"

function scopedSchoolId(userSchoolId: string | null | undefined, requestedSchoolId: string | null) {
  if (!userSchoolId) return ""
  return requestedSchoolId && requestedSchoolId !== userSchoolId ? "" : userSchoolId
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SCHOOL_ADMIN"])
    if (!access.ok) return access.response
    const schoolId = scopedSchoolId(access.user.schoolId, request.nextUrl.searchParams.get("schoolId"))
    if (!schoolId) return NextResponse.json({ error: "School context required" }, { status: 400 })
    const { id } = await params
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "A JSON request body is required" }, { status: 400 })
    const current = await prisma.reportTemplate.findFirst({
      where: { id, schoolId },
      select: { id: true, name: true, code: true, description: true, isDefault: true },
    })
    if (!current) return NextResponse.json({ error: "Report template not found" }, { status: 404 })

    const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : current.code
    const name = typeof body.name === "string" ? body.name.trim() : current.name
    const description = typeof body.description === "string" ? body.description.trim() || null : current.description
    const isDefault = typeof body.isDefault === "boolean" ? body.isDefault : current.isDefault
    if (!/^[A-Z0-9_-]{2,40}$/.test(code) || !name || name.length > 120 || (description && description.length > 2000)) {
      return NextResponse.json({ error: "A template code, name (1–120 characters), and description (up to 2,000 characters) are required" }, { status: 400 })
    }
    const parsed = normalizeReportTemplateSections(body.sections)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const template = await prisma.$transaction(async (tx) => {
      if (isDefault) await tx.reportTemplate.updateMany({ where: { schoolId, isDefault: true, id: { not: id } }, data: { isDefault: false } })
      await tx.reportTemplate.update({
        where: { id },
        data: { code, name, description, isDefault },
      })
      await tx.reportTemplateSection.deleteMany({ where: { templateId: id } })
      await tx.reportTemplateSection.createMany({
        data: parsed.sections.map((section) => ({ templateId: id, ...section })),
      })
      return tx.reportTemplate.findFirst({
        where: { id, schoolId },
        include: { sections: { orderBy: { sequence: "asc" } } },
      })
    })
    if (!template) return NextResponse.json({ error: "Report template not found" }, { status: 404 })
    return NextResponse.json(template)
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "A template with this code already exists for the school" }, { status: 409 })
    }
    console.error("Report template update error:", error)
    return NextResponse.json({ error: "Unable to update report template" }, { status: 500 })
  }
}
