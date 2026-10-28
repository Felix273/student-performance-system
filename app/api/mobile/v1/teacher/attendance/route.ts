import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyMobileAuth } from "@/lib/security/mobileAuth"
import type { AttendanceStatus } from "@prisma/client"

export async function GET(request: NextRequest) {
  const authCheck = verifyMobileAuth(request)
  if (!authCheck.ok) return authCheck.response

  const classId = request.nextUrl.searchParams.get("classId")
  if (!classId) return NextResponse.json({ error: "Class ID required" }, { status: 400 })

  const dateStr = request.nextUrl.searchParams.get("date") || new Date().toISOString().split("T")[0]
  const targetDate = new Date(`${dateStr}T00:00:00.000Z`)

  try {
    const students = await prisma.student.findMany({
      where: { classId },
      select: {
        id: true,
        name: true,
        admissionNo: true,
        attendance: {
          where: { date: targetDate },
          select: { id: true, status: true, remarks: true },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json({
      date: dateStr,
      students: students.map((s) => ({
        id: s.id,
        name: s.name,
        admissionNo: s.admissionNo,
        status: s.attendance[0]?.status || "UNMARKED",
        remarks: s.attendance[0]?.remarks || null,
      })),
    })
  } catch (error) {
    console.error("Mobile attendance fetch error:", error)
    return NextResponse.json({ error: "Unable to load class roll" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authCheck = verifyMobileAuth(request)
  if (!authCheck.ok) return authCheck.response

  const { classId, date: dateStr, records } = await request.json()
  if (!classId || !Array.isArray(records)) {
    return NextResponse.json({ error: "Class ID and records array required" }, { status: 400 })
  }

  const targetDate = new Date(`${dateStr || new Date().toISOString().split("T")[0]}T00:00:00.000Z`)

  try {
    let savedCount = 0
    await prisma.$transaction(async (tx) => {
      for (const rec of records) {
        if (!rec.studentId || !rec.status) continue
        await tx.attendance.upsert({
          where: {
            studentId_date: {
              studentId: rec.studentId,
              date: targetDate,
            },
          },
          update: {
            status: rec.status as AttendanceStatus,
            remarks: rec.remarks || null,
          },
          create: {
            studentId: rec.studentId,
            date: targetDate,
            status: rec.status as AttendanceStatus,
            remarks: rec.remarks || null,
            createdBy: authCheck.payload.userId,
          },
        })
        savedCount++
      }
    })

    return NextResponse.json({ ok: true, savedCount, message: `Attendance saved for ${savedCount} learners.` })
  } catch (error) {
    console.error("Mobile attendance save error:", error)
    return NextResponse.json({ error: "Unable to save attendance" }, { status: 500 })
  }
}
