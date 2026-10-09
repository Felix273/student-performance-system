import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import { generateClassReport } from "@/lib/reports/pdfGenerator"
import { canAccessClass } from "@/lib/authorization"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')

    if (!classId) {
      return NextResponse.json({ error: "Class ID required" }, { status: 400 })
    }

    const access = await canAccessClass(session, classId)
    if (!access.ok || !["SCHOOL_ADMIN", "TEACHER"].includes(access.role)) return access.ok ? NextResponse.json({ error: "Forbidden" }, { status: 403 }) : access.response

    // Fetch class with students
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        school: true,
        students: {
          include: {
            assessments: {
              include: {
                assessment: true
              }
            }
          }
        }
      }
    })

    if (!classData) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 })
    }

    // Verify access
    // Calculate student averages
    const students = classData.students.map(student => {
      const percentages = student.assessments.map(result => 
        (result.score / result.assessment.maxScore) * 100
      )
      const average = percentages.length > 0
        ? percentages.reduce((sum, p) => sum + p, 0) / percentages.length
        : 0

      return {
        name: student.name,
        admissionNo: student.admissionNo,
        average,
        assessments: student.assessments.length
      }
    })

    const averages = students.map(s => s.average)
    const summary = {
      classAverage: averages.length > 0
        ? averages.reduce((sum, a) => sum + a, 0) / averages.length
        : 0,
      highestAverage: averages.length > 0 ? Math.max(...averages) : 0,
      lowestAverage: averages.length > 0 ? Math.min(...averages) : 0,
      totalStudents: students.length
    }

    const reportData = {
      className: classData.name,
      schoolName: classData.school.name,
      students,
      summary
    }

    // Generate PDF
    const pdf = generateClassReport(reportData)
    const pdfBuffer = pdf.output('arraybuffer')

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="class-report-${classData.name}.pdf"`
      }
    })
  } catch (error) {
    console.error("PDF generation error:", error)
    return NextResponse.json({ error: "Unable to generate class report" }, { status: 500 })
  }
}
