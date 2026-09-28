import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import { requireRole, schoolScope } from "@/lib/authorization"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const access = schoolScope(session, request.nextUrl.searchParams.get("schoolId"))
    if (!access.ok) return access.response
    const versionId = request.nextUrl.searchParams.get("versionId")
    if (!versionId) return NextResponse.json({ error: "versionId is required" }, { status: 400 })

    const version = await prisma.curriculumVersion.findUnique({
      where: { id: versionId },
      select: { id: true, version: true, status: true, curriculum: { select: { code: true, name: true } }, offerings: access.schoolId ? { where: { schoolId: access.schoolId }, select: { id: true } } : { select: { id: true } } },
    })
    if (!version) return NextResponse.json({ error: "Curriculum version not found" }, { status: 404 })
    if (access.role !== "SUPER_ADMIN" && version.offerings.length === 0 && version.status !== "PUBLISHED") return NextResponse.json({ error: "You do not have access to this curriculum version" }, { status: 403 })

    const nodes = await prisma.curriculumNode.findMany({
      where: { curriculumVersionId: versionId },
      include: { outcomes: { orderBy: { sequence: "asc" }, select: { id: true, code: true, statement: true, isAssessable: true } }, competencies: { include: { competency: { select: { code: true, name: true } } } } },
      orderBy: [{ parentId: "asc" }, { sequence: "asc" }, { title: "asc" }],
    })
    return NextResponse.json({ version: { id: version.id, version: version.version, status: version.status, curriculum: version.curriculum }, nodes })
  } catch (error) {
    console.error("Curriculum tree error:", error)
    return NextResponse.json({ error: "Unable to load curriculum tree" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SUPER_ADMIN", "SCHOOL_ADMIN"])
    if (!access.ok) return access.response
    const body = await request.json()
    if (typeof body.curriculumVersionId !== "string" || typeof body.title !== "string" || typeof body.code !== "string" || typeof body.nodeType !== "string") return NextResponse.json({ error: "Version, title, code, and node type are required" }, { status: 400 })
    const version = await prisma.curriculumVersion.findUnique({ where: { id: body.curriculumVersionId }, select: { id: true, status: true } })
    if (!version) return NextResponse.json({ error: "Curriculum version not found" }, { status: 404 })
    if (version.status !== "DRAFT" && access.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Published curriculum versions are read-only" }, { status: 409 })
    const node = await prisma.curriculumNode.create({ data: { curriculumVersionId: version.id, parentId: typeof body.parentId === "string" ? body.parentId : undefined, code: body.code.trim(), title: body.title.trim(), description: typeof body.description === "string" ? body.description.trim() : undefined, nodeType: body.nodeType, sequence: Number.isFinite(body.sequence) ? body.sequence : 0, gradeFrom: typeof body.gradeFrom === "string" ? body.gradeFrom : undefined, gradeTo: typeof body.gradeTo === "string" ? body.gradeTo : undefined, isAssessable: Boolean(body.isAssessable) } })
    return NextResponse.json(node, { status: 201 })
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return NextResponse.json({ error: "That curriculum code already exists in this version" }, { status: 409 })
    console.error("Curriculum node creation error:", error)
    return NextResponse.json({ error: "Unable to create curriculum node" }, { status: 500 })
  }
}
