import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "SCHOOL_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { schoolId, students } = await request.json()

    // Validate schoolId
    let finalSchoolId = schoolId
    if (session.user.role === "SCHOOL_ADMIN") {
      finalSchoolId = session.user.schoolId
    }

    if (!finalSchoolId) {
      return NextResponse.json({ error: "School ID is required" }, { status: 400 })
    }

    // Process students in batches
    const results = {
      created: 0,
      updated: 0,
      failed: [] as string[]
    }

    for (const student of students) {
      try {
        // Ensure grade is a string
        const gradeString = String(student.grade)
        
        // Find or create class
        const classData = await prisma.class.upsert({
          where: {
            schoolId_name: {
              schoolId: finalSchoolId,
              name: student.className
            }
          },
          update: {},
          create: {
            name: student.className,
            grade: gradeString,
            schoolId: finalSchoolId
          }
        })

        // Check if student exists
        const existing = await prisma.student.findUnique({
          where: {
            schoolId_admissionNo: {
              schoolId: finalSchoolId,
              admissionNo: student.admissionNo
            }
          }
        })

        if (existing) {
          // Update existing student
          await prisma.student.update({
            where: { id: existing.id },
            data: {
              name: student.name,
              classId: classData.id
            }
          })
          results.updated++
        } else {
          // Create new student
          await prisma.student.create({
            data: {
              name: student.name,
              admissionNo: student.admissionNo,
              classId: classData.id,
              schoolId: finalSchoolId
            }
          })
          results.created++
        }
      } catch (err: any) {
        console.error(`Error processing student ${student.admissionNo}:`, err)
        results.failed.push(`${student.admissionNo}: ${err.message}`)
      }
    }

    return NextResponse.json({
      message: "Bulk upload completed",
      created: results.created,
      updated: results.updated,
      failed: results.failed
    }, { status: 201 })
  } catch (error: any) {
    console.error("Bulk upload error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
