import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import { generateStudentReportCard } from "@/lib/reports/pdfGenerator"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')

    if (!studentId) {
      return NextResponse.json({ error: "Student ID required" }, { status: 400 })
    }

    // Fetch student with all data
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: true,
        school: true,
        assessments: {
          include: {
            assessment: {
              include: {
                subject: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        },
        performances: {
          orderBy: {
            analysisDate: 'desc'
          },
          take: 1
        }
      }
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Verify access
    if (session.user.role === "SCHOOL_ADMIN" && student.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Prepare data
    const assessments = student.assessments.map(result => ({
      subject: result.assessment.subject.name,
      title: result.assessment.title,
      score: result.score,
      maxScore: result.assessment.maxScore,
      percentage: (result.score / result.assessment.maxScore) * 100,
      date: result.assessment.date.toISOString()
    }))

    const allPercentages = assessments.map(a => a.percentage)
    const summary = {
      currentAverage: allPercentages.length > 0 
        ? allPercentages.reduce((sum, p) => sum + p, 0) / allPercentages.length
        : 0,
      highest: allPercentages.length > 0 ? Math.max(...allPercentages) : 0,
      lowest: allPercentages.length > 0 ? Math.min(...allPercentages) : 0,
      totalAssessments: assessments.length
    }

    const latestAnalysis = student.performances[0]
    const analysis = latestAnalysis ? {
      overallGrade: latestAnalysis.overallGrade,
      trend: latestAnalysis.trend,
      strengths: JSON.parse(latestAnalysis.strengths),
      weaknesses: JSON.parse(latestAnalysis.weaknesses),
      recommendations: JSON.parse(latestAnalysis.recommendations),
      aiInsights: latestAnalysis.aiInsights
    } : undefined

    const reportData = {
      name: student.name,
      admissionNo: student.admissionNo,
      className: student.class.name,
      schoolName: student.school.name,
      assessments,
      summary,
      analysis
    }

    // Generate PDF
    const pdf = generateStudentReportCard(reportData)
    const pdfBuffer = pdf.output('arraybuffer')

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="report-${student.admissionNo}.pdf"`
      }
    })
  } catch (error: any) {
    console.error("PDF generation error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
