import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"

async function getManageableMap(id: string, schoolId: string, role: string, teacherId: string) {
  const map = await prisma.cbcPerformanceBandMap.findFirst({
    where: { id, schoolId },
    select: { id: true, schoolId: true, scope: true, classId: true, subjectId: true },
  })
  if (!map) return null
  if (role === "SCHOOL_ADMIN") return map
  if (map.scope !== "CLASS" || !map.classId) return null
  const assignment = await prisma.teacherClass.findFirst({
    where: { teacherId, classId: map.classId, subjectId: map.subjectId },
    select: { id: true },
  })
  return assignment ? map : null
}

type BandInput = {
  id?: unknown
  code?: unknown
  label?: unknown
  parentLevelCode?: unknown
  minPercent?: unknown
  maxPercent?: unknown
}

function validBand(value: unknown): value is BandInput {
  if (typeof value !== "object" || value === null) return false
  const band = value as BandInput
  return typeof band.code === "string" && band.code.trim().length > 0
    && typeof band.label === "string" && band.label.trim().length > 0
    && (band.parentLevelCode === undefined || band.parentLevelCode === null || typeof band.parentLevelCode === "string")
    && typeof band.minPercent === "number" && Number.isFinite(band.minPercent) && band.minPercent >= 0 && band.minPercent <= 100
    && typeof band.maxPercent === "number" && Number.isFinite(band.maxPercent) && band.maxPercent >= 0 && band.maxPercent <= 100
    && band.minPercent <= band.maxPercent
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const access = requireRole(session, ["SCHOOL_ADMIN", "TEACHER"])
  if (!access.ok) return access.response
  const schoolId = access.user.schoolId
  if (!schoolId) return NextResponse.json({ error: "School context required" }, { status: 403 })
  const { id } = await params
  const map = await getManageableMap(id, schoolId, access.role, access.user.id || "")
  if (!map) return NextResponse.json({ error: "Band map not found" }, { status: 404 })

  const body: unknown = await request.json()
  if (typeof body !== "object" || body === null) return NextResponse.json({ error: "Invalid band configuration" }, { status: 400 })
  const input = body as { bands?: unknown; deleteBandIds?: unknown }
  if (!Array.isArray(input.bands) || !input.bands.every(validBand) || input.bands.length > 100) {
    return NextResponse.json({ error: "Each band needs a code, label, and valid 0-100 percentage bounds" }, { status: 400 })
  }
  const bands = input.bands as BandInput[]
  const codes = bands.map((band) => (band.code as string).trim())
  if (new Set(codes).size !== codes.length) return NextResponse.json({ error: "Band codes must be unique within a map" }, { status: 400 })
  if (bands.some((band) => band.id !== undefined && (typeof band.id !== "string" || !band.id))) {
    return NextResponse.json({ error: "Invalid band identifier" }, { status: 400 })
  }
  const bandIds = bands.flatMap((band) => typeof band.id === "string" ? [band.id] : [])
  if (new Set(bandIds).size !== bandIds.length) return NextResponse.json({ error: "Band identifiers must be unique" }, { status: 400 })

  const deleteBandIds = input.deleteBandIds === undefined ? [] : input.deleteBandIds
  if (!Array.isArray(deleteBandIds) || !deleteBandIds.every((bandId) => typeof bandId === "string")) {
    return NextResponse.json({ error: "Invalid band deletion list" }, { status: 400 })
  }
  const allIds = [...bandIds, ...deleteBandIds as string[]]
  if (new Set(allIds).size !== allIds.length) return NextResponse.json({ error: "A band cannot be saved and deleted together" }, { status: 400 })
  const ownedIds = await prisma.cbcPerformanceBand.findMany({ where: { id: { in: allIds }, bandMapId: map.id }, select: { id: true } })
  if (ownedIds.length !== bandIds.length + deleteBandIds.length) return NextResponse.json({ error: "Band not found in this map" }, { status: 404 })

  const result = await prisma.$transaction(async (tx) => {
    if (deleteBandIds.length) await tx.cbcPerformanceBand.deleteMany({ where: { id: { in: deleteBandIds as string[] }, bandMapId: map.id } })
    for (const [sequence, band] of bands.entries()) {
      const data = {
        code: (band.code as string).trim(),
        label: (band.label as string).trim(),
        parentLevelCode: typeof band.parentLevelCode === "string" && band.parentLevelCode.trim() ? band.parentLevelCode.trim() : null,
        minPercent: band.minPercent as number,
        maxPercent: band.maxPercent as number,
        sequence,
      }
      if (typeof band.id === "string") await tx.cbcPerformanceBand.update({ where: { id: band.id }, data })
      else await tx.cbcPerformanceBand.create({ data: { ...data, bandMapId: map.id } })
    }
    return tx.cbcPerformanceBandMap.findFirst({ where: { id: map.id, schoolId }, include: { academicYear: { select: { id: true, name: true } }, class: { select: { id: true, name: true, grade: true } }, subject: { select: { id: true, name: true, code: true } }, bands: { orderBy: { sequence: "asc" } } } })
  })
  return NextResponse.json(result)
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const access = requireRole(session, ["SCHOOL_ADMIN", "TEACHER"])
  if (!access.ok) return access.response
  const schoolId = access.user.schoolId
  if (!schoolId) return NextResponse.json({ error: "School context required" }, { status: 403 })
  const { id } = await params
  const map = await getManageableMap(id, schoolId, access.role, access.user.id || "")
  if (!map) return NextResponse.json({ error: "Band map not found" }, { status: 404 })
  await prisma.cbcPerformanceBandMap.delete({ where: { id: map.id } })
  return NextResponse.json({ deleted: true })
}