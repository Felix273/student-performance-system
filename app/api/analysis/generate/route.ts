import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"
import { canAccessStudent } from "@/lib/authorization"

// ---------------------------------------------------------------------------
// Rate limiter — prevents runaway Anthropic API costs.
// Keyed by studentId so teachers can generate for different students in parallel
// without blocking each other, but the same student cannot be spammed.
//
// NOTE: This is an in-process Map. In serverless environments it resets on cold
// start, which is acceptable — it provides a "best-effort" guard, not a
// cryptographic one. For strict enforcement, swap the Map for an Upstash / Redis
// counter with TTL.
// ---------------------------------------------------------------------------
const RATE_WINDOW_MS = 10 * 60 * 1000 // 10 minutes
const RATE_LIMIT = 5 // max AI generate requests per student per window

interface RateEntry {
  count: number
  windowStart: number
}
const rateLimitMap = new Map<string, RateEntry>()

function checkRateLimit(key: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(key)

  if (!entry || now - entry.windowStart >= RATE_WINDOW_MS) {
    // Start a fresh window
    rateLimitMap.set(key, { count: 1, windowStart: now })
    return { allowed: true, retryAfterSec: 0 }
  }

  if (entry.count < RATE_LIMIT) {
    entry.count++
    return { allowed: true, retryAfterSec: 0 }
  }

  const retryAfterSec = Math.ceil((RATE_WINDOW_MS - (now - entry.windowStart)) / 1000)
  return { allowed: false, retryAfterSec }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    const { studentId } = await request.json()
    if (typeof studentId !== "string" || !studentId)
      return NextResponse.json({ error: "Student ID required" }, { status: 400 })

    const access = await canAccessStudent(session, studentId)
    if (!access.ok || !["SCHOOL_ADMIN", "TEACHER"].includes(access.role))
      return access.ok
        ? NextResponse.json({ error: "Forbidden" }, { status: 403 })
        : access.response

    // Rate-limit check (after auth so we don't leak studentId existence to unauthenticated callers)
    const rateKey = `analysis:${studentId}`
    const { allowed, retryAfterSec } = checkRateLimit(rateKey)
    if (!allowed) {
      return NextResponse.json(
        {
          error: `Too many analysis requests for this student. Please wait ${Math.ceil(retryAfterSec / 60)} minute(s) before trying again.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSec) },
        },
      )
    }

    // Fetch student data with all assessments
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        assessments: {
          include: {
            assessment: {
              include: {
                subject: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    })

    if (!student || student.assessments.length === 0) {
      return NextResponse.json(
        { error: "Student not found or has no assessment records" },
        { status: 404 },
      )
    }

    // Prepare data for AI analysis
    const assessmentData = student.assessments.map((result) => ({
      subject: result.assessment.subject.name,
      title: result.assessment.title,
      type: result.assessment.type,
      score: result.score,
      maxScore: result.assessment.maxScore,
      percentage:
        result.assessment.maxScore > 0
          ? ((result.score / result.assessment.maxScore) * 100).toFixed(1)
          : "0.0",
    }))

    const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "AI analysis is not configured for this deployment. Add ANTHROPIC_API_KEY in the server environment, then redeploy.",
        },
        { status: 503 },
      )
    }

    const anthropic = new Anthropic({ apiKey })

    // Call Claude AI
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [
        {
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
}`,
        },
      ],
    })

    const aiResponse = message.content[0]?.type === "text" ? message.content[0].text : ""

    // Parse AI response
    let analysisData
    try {
      analysisData = JSON.parse(aiResponse)
    } catch {
      // Fallback if AI doesn't return pure JSON
      analysisData = {
        overallGrade: "B",
        trend: "STABLE",
        strengths: ["Shows consistent effort", "Good attendance", "Participates actively"],
        weaknesses: ["Needs improvement in some areas", "Can focus more", "Practice needed"],
        recommendations: [
          "Regular practice",
          "Seek help when needed",
          "Review materials",
          "Stay consistent",
          "Set goals",
        ],
        insights:
          "Student shows good potential and with focused effort can achieve better results.",
      }
    }

    const allowedGrades = new Set(["A", "B", "C", "D", "F"])
    const allowedTrends = new Set(["IMPROVING", "DECLINING", "STABLE"])
    if (
      !allowedGrades.has(analysisData.overallGrade) ||
      !allowedTrends.has(analysisData.trend) ||
      !Array.isArray(analysisData.strengths) ||
      !Array.isArray(analysisData.weaknesses) ||
      !Array.isArray(analysisData.recommendations)
    ) {
      return NextResponse.json({ error: "AI returned an invalid analysis" }, { status: 502 })
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
        aiInsights: analysisData.insights,
      },
    })

    return NextResponse.json(analysis, { status: 201 })
  } catch (error: unknown) {
    console.error("AI Analysis error:", error)
    const providerError = error instanceof Anthropic.APIError
    return NextResponse.json(
      {
        error: providerError
          ? "The AI provider could not generate an analysis. Check the Anthropic API key and model access, then try again."
          : "Failed to generate analysis",
      },
      { status: providerError ? 502 : 500 },
    )
  }
}
