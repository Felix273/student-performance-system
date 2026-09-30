import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import { requireRole, schoolScope } from "@/lib/authorization"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const access = schoolScope(session, request.nextUrl.searchParams.get("schoolId"))
    if (!access.ok) return access.response
    const assignments = await prisma.classCurriculumAssignment.findMany({ where: { ...(access.schoolId ? { schoolId: access.schoolId } : {}), ...(request.nextUrl.searchParams.get("classId") ? { classId: request.nextUrl.searchParams.get("classId")! } : {}) }, include: { class: { select: { id: true, name: true, grade: true } }, offering: { select: { id: true, name: true, code: true, curriculum: { select: { name: true, code: true } } } }, offeringGrade: { select: { gradeCode: true, displayName: true } }, academicYear: { select: { name: true } }, period: { select: { name: true } } }, orderBy: { createdAt: "desc" } })
    return NextResponse.json(assignments)
  } catch (error) {
    console.error("Curriculum assignments error:", error)
    return NextResponse.json({ error: "Unable to load curriculum assignments" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SUPER_ADMIN", "SCHOOL_ADMIN"])
    if (!access.ok) return access.response
    const body = await request.json()
    const classId = typeof body.classId === "string" ? body.classId : ""
    const offeringId = typeof body.offeringId === "string" ? body.offeringId : ""
    const offeringGradeId = typeof body.offeringGradeId === "string" ? body.offeringGradeId : ""
    const academicYearId = typeof body.academicYearId === "string" ? body.academicYearId : ""
    const periodId = typeof body.periodId === "string" && body.periodId.trim() ? body.periodId : undefined
    if (!classId || !offeringId || !offeringGradeId || !academicYearId) return NextResponse.json({ error: "Class, offering, grade, and academic year are required" }, { status: 400 })

    const [classData, offering, grade, year] = await Promise.all([
      prisma.class.findUnique({ where: { id: classId }, select: { id: true, schoolId: true, grade: true } }),
      prisma.curriculumOffering.findUnique({ where: { id: offeringId }, select: { id: true, schoolId: true, academicYearId: true } }),
      prisma.offeringGrade.findUnique({ where: { id: offeringGradeId }, select: { id: true, offeringId: true, gradeCode: true, displayName: true } }),
      prisma.academicYear.findUnique({ where: { id: academicYearId }, select: { id: true, schoolId: true } }),
    ])
    if (!classData || !offering || !grade || !year) return NextResponse.json({ error: "One or more curriculum assignment records were not found" }, { status: 404 })
    if (access.role !== "SUPER_ADMIN" && classData.schoolId !== access.user.schoolId) return access.role === "SCHOOL_ADMIN" ? NextResponse.json({ error: "Class belongs to another school" }, { status: 403 }) : NextResponse.json({ error: "Forbidden" }, { status: 403 })
    if (classData.schoolId !== offering.schoolId || classData.schoolId !== year.schoolId || offering.academicYearId !== academicYearId || grade.offeringId !== offeringId) return NextResponse.json({ error: "Class, offering, grade, and academic year must belong to the same school and year" }, { status: 400 })
    const normaliseGrade = (value: string) => value.toUpperCase().replace(/GRADE|FORM|YEAR|LEVEL|[^A-Z0-9]/g, "")
    const classGrade = normaliseGrade(classData.grade)
    const curriculumGrade = normaliseGrade(grade.gradeCode) || normaliseGrade(grade.displayName)
    if (classGrade && curriculumGrade && classGrade.replace(/^G/, "") !== curriculumGrade.replace(/^G/, "")) return NextResponse.json({ error: `The selected curriculum grade (${grade.displayName}) does not match this class grade (${classData.grade}).` }, { status: 400 })

    const assignment = await prisma.classCurriculumAssignment.create({ data: { schoolId: classData.schoolId, classId, offeringId, offeringGradeId, academicYearId, periodId }, include: { class: true, offeringGrade: true, offering: true, academicYear: true } })
    return NextResponse.json(assignment, { status: 201 })
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return NextResponse.json({ error: "This class already has that curriculum assignment" }, { status: 409 })
    if (typeof error === "object" && error && "code" in error && error.code === "P2003") return NextResponse.json({ error: "The selected curriculum reference is no longer available. Refresh the page and select the class, offering, and grade again." }, { status: 400 })
    console.error("Curriculum assignment creation error:", error)
    return NextResponse.json({ error: "Unable to create curriculum assignment" }, { status: 500 })
  }
}
