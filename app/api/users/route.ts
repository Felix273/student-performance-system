import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "SCHOOL_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { email, password, name, role, schoolId: requestSchoolId, classIds, studentIds } = await request.json()

    // Validate role
    if (!["TEACHER", "PARENT"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    // School admins can only create users for their school
    let schoolId = requestSchoolId
    if (session.user.role === "SCHOOL_ADMIN") {
      schoolId = session.user.schoolId
    }

    if (!schoolId) {
      return NextResponse.json({ error: "School ID is required" }, { status: 400 })
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user with relationships
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
        schoolId
      }
    })

    // If teacher, assign to classes
    if (role === "TEACHER" && classIds && classIds.length > 0) {
      await prisma.teacherClass.createMany({
        data: classIds.map((classId: string) => ({
          teacherId: user.id,
          classId
        }))
      })
    }

    // If parent, link to students
    if (role === "PARENT" && studentIds && studentIds.length > 0) {
      await prisma.parentStudent.createMany({
        data: studentIds.map((studentId: string) => ({
          parentId: user.id,
          studentId
        }))
      })
    }

    return NextResponse.json({ 
      message: "User created successfully",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    }, { status: 201 })
  } catch (error: any) {
    console.error("User creation error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "SCHOOL_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const schoolId = searchParams.get('schoolId')

    const users = await prisma.user.findMany({
      where: {
        role: role ? role as any : { in: ["TEACHER", "PARENT"] },
        schoolId: session.user.role === "SCHOOL_ADMIN" 
          ? session.user.schoolId 
          : schoolId || undefined
      },
      include: {
        school: true,
        teacherClasses: {
          include: {
            class: true,
            subject: true
          }
        },
        children: {
          include: {
            student: {
              include: {
                class: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(users)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
