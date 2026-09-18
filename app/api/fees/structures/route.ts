import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "SCHOOL_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await request.json()

    const {
      schoolId,
      classId,
      term,
      academicYear,
      tuitionFee,
      labFee,
      libraryFee,
      sportsFee,
      examFee,
      otherFees,
      totalAmount,
      dueDate
    } = data

    // Verify class belongs to school
    const classData = await prisma.class.findUnique({
      where: { id: classId }
    })

    if (!classData) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 })
    }

    if (session.user.role === "SCHOOL_ADMIN" && classData.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Check for duplicate
    const existing = await prisma.feeStructure.findUnique({
      where: {
        schoolId_classId_term_academicYear: {
          schoolId: classData.schoolId,
          classId,
          term,
          academicYear
        }
      }
    })

    if (existing) {
      return NextResponse.json({ 
        error: "Fee structure already exists for this class, term and academic year" 
      }, { status: 400 })
    }

    const feeStructure = await prisma.feeStructure.create({
      data: {
        schoolId: classData.schoolId,
        classId,
        term,
        academicYear,
        tuitionFee,
        labFee,
        libraryFee,
        sportsFee,
        examFee,
        otherFees,
        totalAmount,
        dueDate: new Date(dueDate)
      },
      include: {
        class: true,
        school: true
      }
    })

    return NextResponse.json({
      message: "Fee structure created successfully",
      feeStructure
    }, { status: 201 })
  } catch (error: any) {
    console.error("Fee structure creation error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('schoolId')
    const classId = searchParams.get('classId')

    const where: any = {}

    if (session.user.role === "SCHOOL_ADMIN") {
      where.schoolId = session.user.schoolId
    } else if (schoolId) {
      where.schoolId = schoolId
    }

    if (classId) {
      where.classId = classId
    }

    const feeStructures = await prisma.feeStructure.findMany({
      where,
      include: {
        class: true,
        school: true,
        _count: {
          select: {
            payments: true
          }
        }
      },
      orderBy: [
        { academicYear: 'desc' },
        { term: 'desc' }
      ]
    })

    return NextResponse.json(feeStructures)
  } catch (error: any) {
    console.error("Fee structures fetch error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
