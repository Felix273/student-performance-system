import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyMobileAuth } from "@/lib/security/mobileAuth"

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

type TimetableDay = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY"

function getCurrentDayOfWeek(): TimetableDay {
  const dayIndex = new Date().getDay()
  const map: Record<number, TimetableDay> = {
    1: "MONDAY",
    2: "TUESDAY",
    3: "WEDNESDAY",
    4: "THURSDAY",
    5: "FRIDAY",
    6: "SATURDAY",
  }
  return map[dayIndex] || "THURSDAY"
}

export async function GET(request: NextRequest) {
  const authCheck = verifyMobileAuth(request)
  if (!authCheck.ok) return authCheck.response

  const { userId, role, schoolId } = authCheck.payload
  if (role !== "TEACHER" && role !== "SCHOOL_ADMIN") {
    return NextResponse.json({ error: "Teacher access required" }, { status: 403, headers: corsHeaders })
  }

  const searchParams = request.nextUrl.searchParams
  const day = (searchParams.get("day")?.toUpperCase() as TimetableDay) || getCurrentDayOfWeek()

  try {
    const lessons = await prisma.timetableEntry.findMany({
      where: {
        schoolId: schoolId || undefined,
        teacherId: userId,
        day,
      },
      include: {
        class: { select: { id: true, name: true, grade: true, _count: { select: { students: true } } } },
        subject: { select: { id: true, name: true, code: true } },
        sessions: {
          select: { id: true, state: true },
          take: 1,
        },
      },
      orderBy: { startTime: "asc" },
    })

    return NextResponse.json(
      {
        day,
        lessons: lessons.map((l) => ({
          id: l.id,
          day: l.day,
          startTime: l.startTime,
          endTime: l.endTime,
          room: l.room || "Room not set",
          notes: l.notes,
          class: {
            id: l.class.id,
            name: l.class.name,
            grade: l.class.grade,
            studentCount: l.class._count.students,
          },
          subject: {
            id: l.subject.id,
            name: l.subject.name,
            code: l.subject.code,
          },
          sessionState: l.sessions[0]?.state || "OPEN",
        })),
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error("Mobile teacher schedule error:", error)
    return NextResponse.json({ error: "Unable to load schedule" }, { status: 500, headers: corsHeaders })
  }
}
