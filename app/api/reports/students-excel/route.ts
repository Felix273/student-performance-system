import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import { generateStudentListExport } from "@/lib/reports/excelGenerator"

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

    // Fetch students
    const students = await prisma.student.findMany({
      where: {
        schoolId,
        ...(classId ? { classId } : {})
      },
      include: {
        class: true,
        assessments: {
          include: {
            assessment: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    const exportData = students.map(student => {
      const percentages = student.assessments.map(result =>
        (result.score / result.assessment.maxScore) * 100
      )
      const averageScore = percentages.length > 0
        ? percentages.reduce((sum, p) => sum + p, 0) / percentages.length
        : 0

      return {
        admissionNo: student.admissionNo,
        name: student.name,
        className: student.class.name,
        grade: student.class.grade,
        averageScore,
        totalAssessments: student.assessments.length
      }
    })

    // Generate Excel
    const buffer = await generateStudentListExport(exportData, school.name)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="students-list-${Date.now()}.xlsx"`
      }
    })
  } catch (error: any) {
    console.error("Excel generation error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
