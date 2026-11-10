import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyMobileAuth } from "@/lib/security/mobileAuth"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authCheck = verifyMobileAuth(request)
  if (!authCheck.ok) return authCheck.response

  const { id } = await params

  try {
    const entry = await prisma.timetableEntry.findUnique({
      where: { id },
      include: {
        class: { select: { id: true, name: true, grade: true } },
        subject: { select: { id: true, name: true, code: true } },
        teacher: { select: { id: true, name: true } },
        academicYear: { select: { name: true } },
        period: { select: { name: true } },
        focuses: {
          include: {
            learningOutcome: { select: { id: true, code: true, statement: true } },
            competency: { select: { id: true, code: true, name: true } },
          },
        },
      },
    })

    if (!entry) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404, headers: corsHeaders })
    }

    // Get learners for this class
    const learners = await prisma.student.findMany({
      where: { classId: entry.classId },
      select: {
        id: true,
        name: true,
        admissionNo: true,
        cbcEvidence: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: { id: true, masteryLevel: true, narrative: true, status: true },
        },
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json(
      {
        lesson: {
          id: entry.id,
          day: entry.day,
          startTime: entry.startTime,
          endTime: entry.endTime,
          room: entry.room || "Room not set",
          notes: entry.notes,
          className: entry.class.name,
          classId: entry.class.id,
          grade: entry.class.grade,
          subjectName: entry.subject.name,
          subjectCode: entry.subject.code,
          year: entry.academicYear.name,
          term: entry.period?.name || "Term 1",
          outcomes: entry.focuses.flatMap((f) => (f.learningOutcome ? [f.learningOutcome] : [])),
          competencies: entry.focuses.flatMap((f) => (f.competency ? [f.competency] : [])),
          learners: learners.map((l) => ({
            id: l.id,
            name: l.name,
            admissionNo: l.admissionNo,
            latestEvidence: l.cbcEvidence[0] || null,
          })),
        },
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error("Mobile lesson detail error:", error)
    return NextResponse.json({ error: "Unable to load lesson details" }, { status: 500, headers: corsHeaders })
  }
}
