import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import { generateStudentReportCard } from "@/lib/reports/pdfGenerator"
import { canAccessStudent } from "@/lib/authorization"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')

    if (!studentId) {
      return NextResponse.json({ error: "Student ID required" }, { status: 400 })
    }

    const access = await canAccessStudent(session, studentId)
    if (!access.ok || !["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "PARENT"].includes(access.role)) return access.ok ? NextResponse.json({ error: "Forbidden" }, { status: 403 }) : access.response

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
    const parseList = (value: string) => {
      try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : [String(parsed)] } catch { return [value] }
    }
    const analysis = latestAnalysis ? {
      overallGrade: latestAnalysis.overallGrade,
      trend: latestAnalysis.trend,
      strengths: parseList(latestAnalysis.strengths),
      weaknesses: parseList(latestAnalysis.weaknesses),
      recommendations: parseList(latestAnalysis.recommendations),
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
  } catch (error) {
    console.error("PDF generation error:", error)
    return NextResponse.json({ error: "Unable to generate student report" }, { status: 500 })
  }
}
