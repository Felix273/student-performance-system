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

    const subjects = await prisma.subject.findMany({
      where: schoolId 
        ? { schoolId }
        : session.user.role === "SCHOOL_ADMIN" 
          ? { schoolId: session.user.schoolId }
          : undefined,
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(subjects)
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

    const { name, code, schoolId: requestSchoolId } = await request.json()

    let schoolId = requestSchoolId
    if (session.user.role === "SCHOOL_ADMIN") {
      schoolId = session.user.schoolId
    }

    if (!schoolId) {
      return NextResponse.json({ error: "School ID is required" }, { status: 400 })
    }

    const subject = await prisma.subject.create({
      data: {
        name,
        code,
        schoolId
      }
    })

    return NextResponse.json(subject, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
