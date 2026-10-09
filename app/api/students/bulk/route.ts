import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/authorization"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    const access = requireRole(session, ["SCHOOL_ADMIN"])
    if (!access.ok) return access.response

    const { schoolId, students } = await request.json()
    if (!Array.isArray(students) || students.length === 0) return NextResponse.json({ error: "Upload must contain at least one student" }, { status: 400 })
    if (students.length > 2000) return NextResponse.json({ error: "Upload is limited to 2,000 students per batch" }, { status: 413 })

    // Validate schoolId
    let finalSchoolId = schoolId
    if (access.role === "SCHOOL_ADMIN") {
      finalSchoolId = access.user.schoolId
    }

    if (!finalSchoolId) {
      return NextResponse.json({ error: "School ID is required" }, { status: 400 })
    }

    const school = await prisma.school.findUnique({ where: { id: finalSchoolId }, select: { id: true } })
    if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 })

    // Process students in batches
    const results = {
      created: 0,
      updated: 0,
      failed: [] as string[]
    }

    const seenAdmissions = new Set<string>()
    for (const rawStudent of students) {
      let admissionNoForError = "unknown"
      try {
        const student = {
          name: String(rawStudent?.name || "").trim(),
          admissionNo: String(rawStudent?.admissionNo || "").trim(),
          className: String(rawStudent?.className || "").trim(),
          grade: String(rawStudent?.grade || "").trim(),
        }
        admissionNoForError = student.admissionNo
        if (!student.name || !student.admissionNo || !student.className || !student.grade) throw new Error("name, admissionNo, className, and grade are required")
        if (seenAdmissions.has(student.admissionNo)) throw new Error("duplicate admission number in this file")
        seenAdmissions.add(student.admissionNo)
        // Ensure grade is a string
        const gradeString = student.grade

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
        console.error(`Error processing student ${admissionNoForError}:`, err)
        results.failed.push(`${admissionNoForError}: ${err.message}`)
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
