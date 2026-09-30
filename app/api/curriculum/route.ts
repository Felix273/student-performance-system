import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/authorization"

export async function GET() {
  try {
    const session = await auth()
    const access = requireRole(session, ["SUPER_ADMIN", "SCHOOL_ADMIN"])
    if (!access.ok) return access.response

    const curricula = await prisma.curriculum.findMany({
      include: { versions: { orderBy: { version: "desc" }, select: { id: true, version: true, status: true, effectiveFrom: true } } },
      orderBy: { name: "asc" },
    })

    if (access.role === "SUPER_ADMIN") {
      return NextResponse.json({ curricula, academicYears: [], offerings: [] })
    }

    const schoolId = access.user.schoolId
    if (!schoolId) return NextResponse.json({ error: "School context required" }, { status: 403 })
    const [academicYears, offerings] = await Promise.all([
      prisma.academicYear.findMany({ where: { schoolId }, orderBy: { name: "desc" }, select: { id: true, name: true, isCurrent: true, startsOn: true, endsOn: true } }),
      prisma.curriculumOffering.findMany({
        where: { schoolId },
        include: {
          curriculum: { select: { code: true, name: true } },
          curriculumVersion: { select: { id: true, version: true, status: true } },
          academicYear: { select: { id: true, name: true } },
          grades: { orderBy: { sequence: "asc" }, select: { id: true, gradeCode: true, displayName: true, sequence: true } },
          _count: { select: { assignments: true } },
        },
        orderBy: [{ academicYear: { name: "desc" } }, { name: "asc" }],
      }),
    ])
    return NextResponse.json({ curricula, academicYears, offerings })
  } catch (error) {
    console.error("Curriculum catalog error:", error)
    return NextResponse.json({ error: "Unable to load curriculum configuration" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SCHOOL_ADMIN"])
    if (!access.ok) return access.response
    const body = await request.json()
    const schoolId = access.user.schoolId
    if (!schoolId || typeof body.curriculumVersionId !== "string" || typeof body.academicYearId !== "string" || typeof body.name !== "string" || typeof body.code !== "string") {
      return NextResponse.json({ error: "School, curriculum version, academic year, name, and code are required" }, { status: 400 })
    }

    const version = await prisma.curriculumVersion.findUnique({ where: { id: body.curriculumVersionId }, select: { id: true, curriculumId: true, status: true } })
    const year = await prisma.academicYear.findUnique({ where: { id: body.academicYearId }, select: { id: true, schoolId: true } })
    if (!version || !year || year.schoolId !== schoolId) return NextResponse.json({ error: "Curriculum version or academic year not found" }, { status: 404 })
    if (version.status !== "PUBLISHED") return NextResponse.json({ error: "Only published curriculum versions can be adopted" }, { status: 400 })

    const offering = await prisma.curriculumOffering.create({
      data: { schoolId, curriculumId: version.curriculumId, curriculumVersionId: version.id, academicYearId: year.id, name: body.name.trim(), code: body.code.trim().toUpperCase(), status: "ACTIVE", isDefault: Boolean(body.isDefault) },
      include: { curriculum: { select: { code: true, name: true } }, curriculumVersion: { select: { version: true } }, academicYear: { select: { name: true } }, grades: true },
    })
    return NextResponse.json(offering, { status: 201 })
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return NextResponse.json({ error: "An offering with this code already exists for the academic year" }, { status: 409 })
    console.error("Curriculum offering creation error:", error)
    return NextResponse.json({ error: "Unable to create curriculum offering" }, { status: 500 })
  }
}
