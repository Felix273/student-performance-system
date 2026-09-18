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

    const assessments = await prisma.assessment.findMany({
      where: {
        schoolId: session.user.role === "SCHOOL_ADMIN" 
          ? (session.user.schoolId || undefined)
          : (schoolId || undefined)
      },
      include: {
        class: true,
        subject: true
      },
      orderBy: {
        date: 'desc'
      }
    })

    return NextResponse.json(assessments)
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

    const { title, type, maxScore, classId, subjectId, schoolId: requestSchoolId, date } = await request.json()

    let schoolId = requestSchoolId
    if (session.user.role === "SCHOOL_ADMIN") {
      schoolId = session.user.schoolId
    }

    if (!schoolId) {
      return NextResponse.json({ error: "School ID is required" }, { status: 400 })
    }

    const assessment = await prisma.assessment.create({
      data: {
        title,
        type,
        maxScore,
        classId,
        subjectId,
        schoolId,
        date: new Date(date)
      }
    })

    return NextResponse.json(assessment, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
