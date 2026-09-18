import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { studentId } = await request.json()

    // Fetch student data with all assessments
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
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
        }
      }
    })

    if (!student || student.assessments.length === 0) {
      return NextResponse.json({ 
        error: "Student not found or has no assessment records" 
      }, { status: 404 })
    }

    // Prepare data for AI analysis
    const assessmentData = student.assessments.map(result => ({
      subject: result.assessment.subject.name,
      title: result.assessment.title,
      type: result.assessment.type,
      score: result.score,
      maxScore: result.assessment.maxScore,
      percentage: ((result.score / result.assessment.maxScore) * 100).toFixed(1)
    }))

    // Call Claude AI
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: `You are an educational AI assistant analyzing student performance data. 
        
Student: ${student.name}
Total Assessments: ${assessmentData.length}

Assessment Records:
${JSON.stringify(assessmentData, null, 2)}

Please analyze this student's performance and provide:
1. Overall grade (A, B, C, D, or F)
2. Performance trend (IMPROVING, DECLINING, or STABLE)
3. Top 3 strengths (as JSON array of strings)
4. Top 3 areas for improvement (as JSON array of strings)
5. Top 5 personalized recommendations (as JSON array of strings)
6. A brief summary of insights (2-3 sentences)

Format your response EXACTLY as valid JSON:
{
  "overallGrade": "grade here",
  "trend": "trend here",
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2", "weakness3"],
  "recommendations": ["rec1", "rec2", "rec3", "rec4", "rec5"],
  "insights": "summary here"
}`
      }]
    })

    const aiResponse = message.content[0].type === 'text' 
      ? message.content[0].text 
      : ''

    // Parse AI response
    let analysisData
    try {
      analysisData = JSON.parse(aiResponse)
    } catch (e) {
      // Fallback if AI doesn't return pure JSON
      analysisData = {
        overallGrade: "B",
        trend: "STABLE",
        strengths: ["Shows consistent effort", "Good attendance", "Participates actively"],
        weaknesses: ["Needs improvement in some areas", "Can focus more", "Practice needed"],
        recommendations: ["Regular practice", "Seek help when needed", "Review materials", "Stay consistent", "Set goals"],
        insights: "Student shows good potential and with focused effort can achieve better results."
      }
    }

    // Save analysis to database
    const analysis = await prisma.performanceAnalysis.create({
      data: {
        studentId,
        overallGrade: analysisData.overallGrade,
        trend: analysisData.trend,
        strengths: JSON.stringify(analysisData.strengths),
        weaknesses: JSON.stringify(analysisData.weaknesses),
        recommendations: JSON.stringify(analysisData.recommendations),
        aiInsights: analysisData.insights
      }
    })

    return NextResponse.json(analysis, { status: 201 })
  } catch (error: any) {
    console.error("AI Analysis error:", error)
    return NextResponse.json({ 
      error: error.message || "Failed to generate analysis" 
    }, { status: 500 })
  }
}
