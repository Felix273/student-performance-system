import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('schoolId')

    const students = await prisma.student.findMany({
      where: schoolId 
        ? { schoolId }
        : session.user.role === "SCHOOL_ADMIN" && session.user.schoolId
          ? { schoolId: session.user.schoolId }
          : undefined,
      include: {
        class: true
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(students)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, admissionNo, classId, schoolId: requestSchoolId } = await request.json()

    let schoolId = requestSchoolId
    if (session.user.role === "SCHOOL_ADMIN") {
      schoolId = session.user.schoolId
    }

    if (!schoolId) {
      return NextResponse.json({ error: "School ID is required" }, { status: 400 })
    }

    const student = await prisma.student.create({
      data: {
        name,
        admissionNo,
        classId,
        schoolId
      }
    })

    return NextResponse.json(student, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
