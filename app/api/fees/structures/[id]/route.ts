import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/authorization"

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SUPER_ADMIN", "SCHOOL_ADMIN"])
    if (!access.ok) return access.response
    const { id } = await params
    const body = await request.json()
    const { schoolId: requestedSchoolId, classId, term, academicYear, tuitionFee, labFee, libraryFee, sportsFee, examFee, otherFees, dueDate, applicableFees: rawApplicableFees } = body
    const schoolId = access.role === "SCHOOL_ADMIN" ? access.user.schoolId : requestedSchoolId
    const applicableFees = Array.isArray(rawApplicableFees) ? rawApplicableFees.map((item: { name?: unknown; amount?: unknown }) => ({ name: String(item.name || "").trim(), amount: Number(item.amount) })).filter((item) => item.name && Number.isFinite(item.amount) && item.amount >= 0) : []
    const values = [tuitionFee, labFee, libraryFee, sportsFee, examFee, otherFees]
    if (!schoolId || !classId || !term || !academicYear || !dueDate || values.some((value) => !Number.isFinite(Number(value)) || Number(value) < 0)) return NextResponse.json({ error: "Valid school, class, term, year, due date, and non-negative fees are required" }, { status: 400 })
    const existing = await prisma.feeStructure.findFirst({ where: { id, schoolId }, select: { id: true } })
    if (!existing) return NextResponse.json({ error: "Fee structure not found" }, { status: 404 })
    const classData = await prisma.class.findFirst({ where: { id: classId, schoolId }, select: { id: true } })
    if (!classData) return NextResponse.json({ error: "Class not found in school" }, { status: 404 })
    const parsedDueDate = new Date(dueDate)
    if (Number.isNaN(parsedDueDate.getTime())) return NextResponse.json({ error: "Invalid due date" }, { status: 400 })
    const totalAmount = values.reduce((sum, value) => sum + Number(value), 0) + applicableFees.reduce((sum, item) => sum + item.amount, 0)
    const duplicate = await prisma.feeStructure.findFirst({ where: { schoolId, classId, term, academicYear, NOT: { id } }, select: { id: true } })
    if (duplicate) return NextResponse.json({ error: "Another fee structure already exists for this class, term and academic year" }, { status: 409 })
    const feeStructure = await prisma.$transaction(async (transaction) => {
      await transaction.applicableFee.deleteMany({ where: { feeStructureId: id } })
      return transaction.feeStructure.update({ where: { id }, data: { schoolId, classId, term, academicYear, tuitionFee: Number(tuitionFee), labFee: Number(labFee), libraryFee: Number(libraryFee), sportsFee: Number(sportsFee), examFee: Number(examFee), otherFees: Number(otherFees) + applicableFees.reduce((sum, item) => sum + item.amount, 0), totalAmount, dueDate: parsedDueDate, applicableFees: { create: applicableFees } }, select: { id: true } })
    })
    return NextResponse.json({ message: "Fee structure updated successfully", feeStructure })
  } catch (error) {
    console.error("Fee structure update error:", error)
    return NextResponse.json({ error: "Unable to update fee structure" }, { status: 500 })
  }
}
