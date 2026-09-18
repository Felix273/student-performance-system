import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const classes = await prisma.class.findMany({
      where: session.user.role === "SCHOOL_ADMIN" && session.user.schoolId
        ? { schoolId: session.user.schoolId }
        : undefined,
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(classes)
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

    if (session.user.role !== "SCHOOL_ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { name, grade, schoolId: requestSchoolId } = await request.json()

    // Determine the schoolId
    let schoolId = requestSchoolId

    // For School Admin, use their school ID
    if (session.user.role === "SCHOOL_ADMIN") {
      schoolId = session.user.schoolId
    }

    // Check if schoolId exists and is not empty
    if (!schoolId || schoolId === "") {
      return NextResponse.json({ 
        error: "School ID is required. Please log out and log back in." 
      }, { status: 400 })
    }

    const classData = await prisma.class.create({
      data: {
        name,
        grade,
        schoolId
      }
    })

    return NextResponse.json(classData, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
