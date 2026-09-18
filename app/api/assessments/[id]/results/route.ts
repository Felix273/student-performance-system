import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const { results } = await request.json()

    if (!Array.isArray(results) || results.length === 0) {
      return NextResponse.json({ error: "No results provided" }, { status: 400 })
    }

    // Use upsert to handle both create and update
    const savedResults = await Promise.all(
      results.map(({ studentId, score }) =>
        prisma.assessmentResult.upsert({
          where: {
            studentId_assessmentId: {
              studentId,
              assessmentId: id
            }
          },
          update: {
            score
          },
          create: {
            studentId,
            assessmentId: id,
            score
          }
        })
      )
    )

    return NextResponse.json({ 
      message: "Scores saved successfully",
      count: savedResults.length
    }, { status: 201 })
  } catch (error: any) {
    console.error("Error saving scores:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
