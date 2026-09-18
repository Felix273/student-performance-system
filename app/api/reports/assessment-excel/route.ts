import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import { generateAssessmentExport } from "@/lib/reports/excelGenerator"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('schoolId')
    const classId = searchParams.get('classId')

    if (!schoolId) {
      return NextResponse.json({ error: "School ID required" }, { status: 400 })
    }

    // Fetch school
    const school = await prisma.school.findUnique({
      where: { id: schoolId }
    })

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 })
    }

    // Verify access
    if (session.user.role === "SCHOOL_ADMIN" && schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Fetch assessment results
    const results = await prisma.assessmentResult.findMany({
      where: {
        student: {
          schoolId,
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
  } catch (error: any) {
    console.error("Excel generation error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
