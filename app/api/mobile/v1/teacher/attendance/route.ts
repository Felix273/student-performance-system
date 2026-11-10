import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyMobileAuth } from "@/lib/security/mobileAuth"
import type { AttendanceStatus } from "@prisma/client"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  })
}

const STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const

function dateOnly(value: string) {
  const clean = value.split("T")[0]
  const match = /^\d{4}-\d{2}-\d{2}$/.test(clean)
  if (!match) return null
  const date = new Date(`${clean}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

export async function GET(request: NextRequest) {
  const authCheck = verifyMobileAuth(request)
  if (!authCheck.ok) return authCheck.response

  const classId = request.nextUrl.searchParams.get("classId")
  if (!classId) {
    return NextResponse.json({ error: "Class ID required" }, { status: 400, headers: corsHeaders })
  }

  const rawDate = request.nextUrl.searchParams.get("date") || new Date().toISOString().split("T")[0]
  const date = dateOnly(rawDate)
  if (!date) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400, headers: corsHeaders })
  }

  try {
    const students = await prisma.student.findMany({
      where: { classId },
      select: {
        id: true,
        name: true,
        admissionNo: true,
        attendance: {
          where: { date },
          select: { id: true, status: true, remarks: true },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json(
      {
        date: rawDate.split("T")[0],
        students: students.map((s) => ({
          id: s.id,
          name: s.name,
          admissionNo: s.admissionNo,
          status: s.attendance[0]?.status || "UNMARKED",
          remarks: s.attendance[0]?.remarks || null,
        })),
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error("Mobile attendance fetch error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load class roll" },
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function POST(request: NextRequest) {
  const authCheck = verifyMobileAuth(request)
  if (!authCheck.ok) return authCheck.response

  try {
    const body = await request.json()
    const { classId, date: rawDate, records } = body

    if (!classId || !Array.isArray(records)) {
      return NextResponse.json({ error: "Class ID and records array required" }, { status: 400, headers: corsHeaders })
    }

    const date = dateOnly(String(rawDate || new Date().toISOString().split("T")[0]))
    if (!date) {
      return NextResponse.json({ error: "Invalid date format (use YYYY-MM-DD)" }, { status: 400, headers: corsHeaders })
    }

    const actorId = authCheck.payload.userId
    let savedCount = 0

    for (const rec of records) {
      if (!rec.studentId || !rec.status || rec.status === "UNMARKED") continue
      if (!STATUSES.includes(rec.status)) continue

      await prisma.attendance.upsert({
        where: {
          studentId_date: {
            studentId: rec.studentId,
            date,
          },
        },
        update: {
          status: rec.status as AttendanceStatus,
          remarks: rec.remarks ? String(rec.remarks).slice(0, 500) : null,
          createdBy: actorId,
        },
        create: {
          studentId: rec.studentId,
          date,
          status: rec.status as AttendanceStatus,
          remarks: rec.remarks ? String(rec.remarks).slice(0, 500) : null,
          createdBy: actorId,
        },
      })
      savedCount++
    }

    return NextResponse.json(
      { ok: true, savedCount, message: `Attendance saved for ${savedCount} learner(s).` },
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error("Mobile attendance save error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save attendance" },
      { status: 500, headers: corsHeaders }
    )
  }
}
