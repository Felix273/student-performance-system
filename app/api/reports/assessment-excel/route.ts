import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import { generateAssessmentExport } from "@/lib/reports/excelGenerator"
import { schoolScope } from "@/lib/authorization"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('schoolId')
    const classId = searchParams.get('classId')

    if (!schoolId) {
      return NextResponse.json({ error: "School ID required" }, { status: 400 })
    }
    const access = schoolScope(session, schoolId)
    if (!access.ok || !["SCHOOL_ADMIN", "TEACHER"].includes(access.role) || !access.schoolId) return access.ok ? NextResponse.json({ error: "Forbidden" }, { status: 403 }) : access.response
    if (classId) {
      const classData = await prisma.class.findFirst({ where: { id: classId, schoolId: access.schoolId }, select: { id: true } })
      if (!classData) return NextResponse.json({ error: "Class not found in school" }, { status: 404 })
    }

    // Fetch school
    const school = await prisma.school.findUnique({
      where: { id: access.schoolId }
    })

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 })
    }

    // Fetch assessment results
    const results = await prisma.assessmentResult.findMany({
      where: {
        student: {
          schoolId: access.schoolId,
          ...(classId ? { classId } : {})
        }
      },
      include: {
        student: {
          include: {
            class: true
          }
        },
        assessment: {
          include: {
            subject: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const exportData = results.map(result => ({
      studentName: result.student.name,
      admissionNo: result.student.admissionNo,
      className: result.student.class.name,
      subject: result.assessment.subject.name,
      assessmentTitle: result.assessment.title,
      assessmentType: result.assessment.type,
      score: result.score,
      maxScore: result.assessment.maxScore,
      percentage: (result.score / result.assessment.maxScore) * 100,
      date: result.assessment.date.toLocaleDateString()
    }))

    // Generate Excel
    const buffer = await generateAssessmentExport(exportData, school.name)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="assessment-data-${Date.now()}.xlsx"`
      }
    })
  } catch (error) {
    console.error("Excel generation error:", error)
    return NextResponse.json({ error: "Unable to export assessment data" }, { status: 500 })
  }
}
