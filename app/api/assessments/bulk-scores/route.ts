import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { assessmentId, schoolId, scores } = await request.json()

    // Validate assessment exists
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        class: true,
        school: true
      }
    })

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 })
    }

    // Verify access
    if (session.user.role === "SCHOOL_ADMIN" && assessment.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Get all students from the school for lookup
    const allStudents = await prisma.student.findMany({
      where: { schoolId: assessment.schoolId },
      include: { class: true }
    })

    const results = {
      created: 0,
      updated: 0,
      failed: [] as string[],
      warnings: [] as string[]
    }

    console.log(`Processing ${scores.length} scores for assessment ${assessmentId}`)
    console.log(`School has ${allStudents.length} students`)

    for (const scoreData of scores) {
      try {
        // Convert admission number to string for comparison
        const admissionNo = String(scoreData.admissionNo).trim()
        
        // Find student by admission number across all school students
        const student = allStudents.find(
          s => s.admissionNo.trim() === admissionNo
        )

        if (!student) {
          results.failed.push(`${admissionNo}: Student not found in school`)
          continue
        }

        // Warn if student is not in the assessment's class
        if (student.classId !== assessment.classId) {
          results.warnings.push(
            `${admissionNo}: Student is in ${student.class.name}, not ${assessment.class.name}`
          )
        }

        // Validate score
        if (scoreData.score < 0 || scoreData.score > assessment.maxScore) {
          results.failed.push(
            `${admissionNo}: Score ${scoreData.score} out of range (0-${assessment.maxScore})`
          )
          continue
        }

        // Upsert score
        const existing = await prisma.assessmentResult.findUnique({
          where: {
            studentId_assessmentId: {
              studentId: student.id,
              assessmentId
            }
          }
        })

        if (existing) {
          await prisma.assessmentResult.update({
            where: { id: existing.id },
            data: { score: scoreData.score }
          })
          results.updated++
        } else {
          await prisma.assessmentResult.create({
            data: {
              studentId: student.id,
              assessmentId,
              score: scoreData.score
            }
          })
          results.created++
        }
      } catch (err: any) {
        results.failed.push(`${scoreData.admissionNo}: ${err.message}`)
        console.error(`Error processing ${scoreData.admissionNo}:`, err)
      }
    }

    console.log('Bulk score upload results:', {
      created: results.created,
      updated: results.updated,
      failed: results.failed.length,
      warnings: results.warnings.length
    })

    return NextResponse.json({
      message: "Bulk score upload completed",
      created: results.created,
      updated: results.updated,
      failed: results.failed,
      warnings: results.warnings
    }, { status: 201 })
  } catch (error: any) {
    console.error("Bulk score upload error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
