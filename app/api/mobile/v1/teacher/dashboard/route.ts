import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyMobileAuth } from "@/lib/security/mobileAuth"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function GET(request: NextRequest) {
  const authCheck = verifyMobileAuth(request)
  if (!authCheck.ok) return authCheck.response

  const { userId, role, schoolId } = authCheck.payload
  if (role !== "TEACHER" && role !== "SCHOOL_ADMIN") {
    return NextResponse.json({ error: "Teacher access required" }, { status: 403, headers: corsHeaders })
  }

  try {
    const teacherClasses = await prisma.teacherClass.findMany({
      where: { teacherId: userId },
      include: {
        class: {
          include: {
            _count: { select: { students: true, assessments: true } },
          },
        },
        subject: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ class: { name: "asc" } }],
    })

    const classIds = Array.from(new Set(teacherClasses.map((tc) => tc.classId)))

    // Fetch recent assessments for assigned classes
    const recentAssessments = await prisma.assessment.findMany({
      where: { classId: { in: classIds } },
      include: {
        class: { select: { name: true, _count: { select: { students: true } } } },
        subject: { select: { name: true } },
        _count: { select: { results: true } },
      },
      orderBy: { date: "desc" },
      take: 6,
    })

    // Group subjects per class & detect homeroom
    const classMap = new Map<string, {
      id: string
      name: string
      grade: string
      isHomeroom: boolean
      studentCount: number
      assessmentCount: number
      subjects: string[]
    }>()

    for (const tc of teacherClasses) {
      if (!classMap.has(tc.classId)) {
        classMap.set(tc.classId, {
          id: tc.class.id,
          name: tc.class.name,
          grade: tc.class.grade,
          isHomeroom: false,
          studentCount: tc.class._count.students,
          assessmentCount: tc.class._count.assessments,
          subjects: [],
        })
      }
      const entry = classMap.get(tc.classId)!
      if (tc.subjectId === null) {
        entry.isHomeroom = true
      } else if (tc.subject?.name && !entry.subjects.includes(tc.subject.name)) {
        entry.subjects.push(tc.subject.name)
      }
    }

    const classes = Array.from(classMap.values())
    const totalStudents = classes.reduce((sum, c) => sum + c.studentCount, 0)
    const totalAssessments = classes.reduce((sum, c) => sum + c.assessmentCount, 0)
    const totalSubjects = new Set(teacherClasses.flatMap((tc) => (tc.subject?.name ? [tc.subject.name] : []))).size

    return NextResponse.json(
      {
        metrics: {
          classesCount: classes.length,
          learnersCount: totalStudents,
          subjectsCount: totalSubjects,
          assessmentsCount: totalAssessments,
        },
        classes,
        recentAssessments: recentAssessments.map((a) => {
          const totalLearners = a.class._count.students
          const recorded = a._count.results
          const percentage = totalLearners > 0 ? Math.round((recorded / totalLearners) * 100) : 0
          return {
            id: a.id,
            title: a.title,
            className: a.class.name,
            subjectName: a.subject.name,
            date: a.date.toISOString(),
            maxScore: a.maxScore,
            totalLearners,
            recorded,
            percentage,
            status: recorded >= totalLearners && totalLearners > 0 ? "Complete" : recorded > 0 ? "In Progress" : "Ready",
          }
        }),
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error("Mobile teacher dashboard error:", error)
    return NextResponse.json({ error: "Unable to load dashboard data" }, { status: 500, headers: corsHeaders })
  }
}
