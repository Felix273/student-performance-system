import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    const access = requireRole(session, ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"])
    if (!access.ok) return access.response

    const schoolId = access.user.schoolId
    if (!schoolId) return NextResponse.json({ error: "School not assigned" }, { status: 400 })

    const academicYears = await prisma.academicYear.findMany({
      where: { schoolId },
      include: {
        periods: {
          orderBy: { sequence: "asc" },
        },
      },
      orderBy: { startsOn: "desc" },
    })

    return NextResponse.json({ academicYears })
  } catch (error) {
    console.error("Academic years fetch error:", error)
    return NextResponse.json({ error: "Unable to load academic years" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SCHOOL_ADMIN"])
    if (!access.ok) return access.response

    const schoolId = access.user.schoolId
    if (!schoolId) return NextResponse.json({ error: "School not assigned" }, { status: 400 })

    const body = await request.json()
    const { name, startsOn, endsOn, isCurrent } = body

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Academic year name is required (e.g. 2026)" }, { status: 400 })
    }
    if (!startsOn || !endsOn) {
      return NextResponse.json({ error: "Start and end dates are required" }, { status: 400 })
    }

    const start = new Date(startsOn)
    const end = new Date(endsOn)
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      return NextResponse.json({ error: "Invalid date range for academic year" }, { status: 400 })
    }

    const existing = await prisma.academicYear.findUnique({
      where: { schoolId_name: { schoolId, name: name.trim() } },
    })
    if (existing) {
      return NextResponse.json({ error: `Academic year ${name} already exists` }, { status: 409 })
    }

    if (isCurrent) {
      await prisma.academicYear.updateMany({
        where: { schoolId, isCurrent: true },
        data: { isCurrent: false },
      })
    }

    const academicYear = await prisma.academicYear.create({
      data: {
        schoolId,
        name: name.trim(),
        startsOn: start,
        endsOn: end,
        isCurrent: Boolean(isCurrent),
        periods: {
          create: [
            {
              name: "Term 1",
              code: "TERM_1",
              sequence: 1,
              startsOn: start,
              endsOn: new Date(start.getTime() + 90 * 24 * 60 * 60 * 1000),
            },
            {
              name: "Term 2",
              code: "TERM_2",
              sequence: 2,
              startsOn: new Date(start.getTime() + 120 * 24 * 60 * 60 * 1000),
              endsOn: new Date(start.getTime() + 210 * 24 * 60 * 60 * 1000),
            },
            {
              name: "Term 3",
              code: "TERM_3",
              sequence: 3,
              startsOn: new Date(start.getTime() + 240 * 24 * 60 * 60 * 1000),
              endsOn: end,
            },
          ],
        },
      },
      include: {
        periods: { orderBy: { sequence: "asc" } },
      },
    })

    return NextResponse.json({ academicYear }, { status: 201 })
  } catch (error) {
    console.error("Academic year create error:", error)
    return NextResponse.json({ error: "Unable to create academic year" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SCHOOL_ADMIN"])
    if (!access.ok) return access.response

    const schoolId = access.user.schoolId
    if (!schoolId) return NextResponse.json({ error: "School not assigned" }, { status: 400 })

    const body = await request.json()
    const { id, name, startsOn, endsOn, isCurrent, periods } = body

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Academic year ID required" }, { status: 400 })
    }

    const year = await prisma.academicYear.findFirst({
      where: { id, schoolId },
    })
    if (!year) return NextResponse.json({ error: "Academic year not found" }, { status: 404 })

    // If setting as current, clear other current years
    if (isCurrent === true) {
      await prisma.academicYear.updateMany({
        where: { schoolId, isCurrent: true, NOT: { id } },
        data: { isCurrent: false },
      })
    }

    const updateData: {
      name?: string
      startsOn?: Date
      endsOn?: Date
      isCurrent?: boolean
    } = {}

    if (name && typeof name === "string") {
      updateData.name = name.trim()
    }

    if (startsOn) {
      const sDate = new Date(startsOn)
      if (!isNaN(sDate.getTime())) updateData.startsOn = sDate
    }

    if (endsOn) {
      const eDate = new Date(endsOn)
      if (!isNaN(eDate.getTime())) updateData.endsOn = eDate
    }

    if (typeof isCurrent === "boolean") {
      updateData.isCurrent = isCurrent
    }

    // Run year update and term date updates in a transaction
    const updated = await prisma.$transaction(async (tx) => {
      const yr = await tx.academicYear.update({
        where: { id },
        data: updateData,
      })

      // Update terms if provided
      if (Array.isArray(periods)) {
        for (const p of periods) {
          if (!p.id || !p.startsOn || !p.endsOn) continue
          const pStart = new Date(p.startsOn)
          const pEnd = new Date(p.endsOn)
          if (isNaN(pStart.getTime()) || isNaN(pEnd.getTime())) continue

          await tx.academicPeriod.update({
            where: { id: p.id },
            data: {
              ...(p.name ? { name: p.name.trim() } : {}),
              startsOn: pStart,
              endsOn: pEnd,
            },
          })
        }
      }

      return tx.academicYear.findUnique({
        where: { id },
        include: { periods: { orderBy: { sequence: "asc" } } },
      })
    })

    return NextResponse.json({ academicYear: updated })
  } catch (error) {
    console.error("Academic year update error:", error)
    return NextResponse.json({ error: "Unable to update academic year" }, { status: 500 })
  }
}
