import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import { schoolScope, requireRole } from "@/lib/authorization"

const feeSelect = { id: true, schoolId: true, classId: true, term: true, academicYear: true, tuitionFee: true, labFee: true, libraryFee: true, sportsFee: true, examFee: true, otherFees: true, totalAmount: true, dueDate: true, class: { select: { id: true, name: true } }, school: { select: { id: true, name: true } }, applicableFees: { select: { id: true, name: true, amount: true }, orderBy: { createdAt: "asc" as const } }, _count: { select: { payments: true } } } as const

function parseApplicableFees(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.map((item: { name?: unknown; amount?: unknown }) => ({ name: String(item.name || "").trim(), amount: Number(item.amount) })).filter((item) => item.name && Number.isFinite(item.amount) && item.amount >= 0)
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SCHOOL_ADMIN"])
    if (!access.ok) return access.response
    const { classId, term, academicYear, tuitionFee, labFee, libraryFee, sportsFee, examFee, otherFees, totalAmount, dueDate, applicableFees: rawApplicableFees } = await request.json()
    const schoolId = access.user.schoolId
    const applicableFees = parseApplicableFees(rawApplicableFees)
    const calculatedOtherFees = applicableFees.reduce((sum, item) => sum + item.amount, 0) + Number(otherFees || 0)
    const values = [tuitionFee, labFee, libraryFee, sportsFee, examFee, otherFees, totalAmount]
    if (!schoolId || !classId || !term || !academicYear || !dueDate || values.some((value) => !Number.isFinite(Number(value)) || Number(value) < 0)) return NextResponse.json({ error: "Valid school, class, term, year, due date, and non-negative fees are required" }, { status: 400 })
    const classData = await prisma.class.findFirst({ where: { id: classId, schoolId }, select: { id: true } })
    if (!classData) return NextResponse.json({ error: "Class not found in school" }, { status: 404 })
    const parsedDueDate = new Date(dueDate)
    if (Number.isNaN(parsedDueDate.getTime())) return NextResponse.json({ error: "Invalid due date" }, { status: 400 })
    const existing = await prisma.feeStructure.findUnique({ where: { schoolId_classId_term_academicYear: { schoolId, classId, term, academicYear } }, select: { id: true } })
    if (existing) return NextResponse.json({ error: "Fee structure already exists for this class, term and academic year" }, { status: 409 })
    const feeStructure = await prisma.feeStructure.create({ data: { schoolId, classId, term, academicYear, tuitionFee: Number(tuitionFee), labFee: Number(labFee), libraryFee: Number(libraryFee), sportsFee: Number(sportsFee), examFee: Number(examFee), otherFees: calculatedOtherFees, totalAmount: Number(totalAmount), dueDate: parsedDueDate, applicableFees: { create: applicableFees } }, select: feeSelect })
    return NextResponse.json({ message: "Fee structure created successfully", feeStructure }, { status: 201 })
  } catch (error) {
    console.error("Fee structure creation error:", error)
    return NextResponse.json({ error: "Unable to create fee structure" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const { searchParams } = new URL(request.url)
    const access = schoolScope(session, searchParams.get("schoolId"))
    if (!access.ok || access.role !== "SCHOOL_ADMIN") return access.ok ? NextResponse.json({ error: "Forbidden" }, { status: 403 }) : access.response
    const classId = searchParams.get("classId")
    const feeStructures = await prisma.feeStructure.findMany({ where: { schoolId: access.schoolId, ...(classId ? { classId } : {}) }, select: feeSelect, orderBy: [{ academicYear: "desc" }, { term: "desc" }] })
    return NextResponse.json(feeStructures)
  } catch (error) {
    console.error("Fee structures fetch error:", error)
    return NextResponse.json({ error: "Unable to load fee structures" }, { status: 500 })
  }
}
