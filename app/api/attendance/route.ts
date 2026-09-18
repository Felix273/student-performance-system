import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { classId, records, createdBy } = await request.json()

    if (!classId || !records || !Array.isArray(records)) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
    }

    // Verify class access
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        teachers: {
          where: { teacherId: session.user.id }
        }
      }
    })

    if (!classData) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 })
    }

    // Check permissions
    if (
      session.user.role === "SCHOOL_ADMIN" && classData.schoolId !== session.user.schoolId
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    if (
      session.user.role === "TEACHER" && classData.teachers.length === 0
    ) {
      return NextResponse.json({ error: "Unauthorized - You are not assigned to this class" }, { status: 403 })
    }

    // Process attendance records
    const results = {
      created: 0,
      updated: 0,
      failed: [] as string[]
    }

    for (const record of records) {
      try {
        const attendanceDate = new Date(record.date)
        attendanceDate.setHours(0, 0, 0, 0)

        // Upsert attendance
        await prisma.attendance.upsert({
          where: {
            studentId_date: {
              studentId: record.studentId,
              date: attendanceDate
            }
          },
          update: {
            status: record.status,
            remarks: record.remarks,
            createdBy
          },
          create: {
            studentId: record.studentId,
            date: attendanceDate,
            status: record.status,
            remarks: record.remarks,
            createdBy
          }
        })

        results.created++
      } catch (err: any) {
        results.failed.push(`${record.studentId}: ${err.message}`)
      }
    }

    return NextResponse.json({
      message: "Attendance saved successfully",
      created: results.created,
      updated: results.updated,
      failed: results.failed
    }, { status: 201 })
  } catch (error: any) {
    console.error("Attendance save error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!classId) {
      return NextResponse.json({ error: "Class ID required" }, { status: 400 })
    }

    // Build where clause
    const where: any = {
      student: { classId }
    }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    const attendance = await prisma.attendance.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            admissionNo: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    })

    return NextResponse.json(attendance)
  } catch (error: any) {
    console.error("Attendance fetch error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
