import { NextRequest, NextResponse } from "next/server"
import { PaymentMethod, PaymentStatus } from "@prisma/client"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/authorization"

const methods = new Set(Object.values(PaymentMethod))
const statuses = new Set(Object.values(PaymentStatus))

function scopeFor(access: { role: string; user: { schoolId?: string | null } }, requestedSchoolId?: string | null) {
  return access.role === "SCHOOL_ADMIN" ? access.user.schoolId : requestedSchoolId || undefined
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SUPER_ADMIN", "SCHOOL_ADMIN"])
    if (!access.ok) return access.response
    const { searchParams } = new URL(request.url)
    const schoolId = scopeFor(access, searchParams.get("schoolId"))
    if (!schoolId) return NextResponse.json({ error: "School is required" }, { status: 400 })
    const feeStructureId = searchParams.get("feeStructureId")
    const status = searchParams.get("status")
    const payments = await prisma.feePayment.findMany({
      where: { feeStructure: { schoolId, ...(feeStructureId ? { id: feeStructureId } : {}) }, ...(status && statuses.has(status as PaymentStatus) ? { status: status as PaymentStatus } : {}) },
      include: { student: { select: { id: true, name: true, admissionNo: true, class: { select: { id: true, name: true } } } }, feeStructure: { select: { id: true, term: true, academicYear: true, totalAmount: true, class: { select: { id: true, name: true } } } } },
      orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
    })
    return NextResponse.json(payments)
  } catch (error) {
    console.error("Fee payments fetch error:", error)
    return NextResponse.json({ error: "Unable to load fee payments" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SUPER_ADMIN", "SCHOOL_ADMIN"])
    if (!access.ok) return access.response
    const body = await request.json()
    const requestedSchoolId = typeof body.schoolId === "string" ? body.schoolId : null
    const schoolId = scopeFor(access, requestedSchoolId)
    const feeStructureId = String(body.feeStructureId || "")
    const studentId = String(body.studentId || "")
    const amountPaid = Number(body.amountPaid)
    const paymentDate = new Date(body.paymentDate || new Date())
    const paymentMethod = String(body.paymentMethod || "")
    const status = String(body.status || "COMPLETED")
    const transactionId = body.transactionId ? String(body.transactionId).trim() : null
    const remarks = body.remarks ? String(body.remarks).trim() : null

    if (!schoolId || !feeStructureId || !studentId || !Number.isFinite(amountPaid) || amountPaid <= 0 || Number.isNaN(paymentDate.getTime()) || !methods.has(paymentMethod as PaymentMethod) || !statuses.has(status as PaymentStatus)) {
      return NextResponse.json({ error: "A valid fee structure, student, positive amount, date, payment method, and status are required" }, { status: 400 })
    }

    const [structure, student] = await Promise.all([
      prisma.feeStructure.findFirst({ where: { id: feeStructureId, schoolId }, select: { id: true, classId: true, totalAmount: true, payments: { where: { status: PaymentStatus.COMPLETED }, select: { amountPaid: true } } } }),
      prisma.student.findFirst({ where: { id: studentId, schoolId }, select: { id: true, classId: true } }),
    ])
    if (!structure) return NextResponse.json({ error: "Fee structure not found in this school" }, { status: 404 })
    if (!student || student.classId !== structure.classId) return NextResponse.json({ error: "Student is not enrolled in the fee structure's class" }, { status: 400 })

    const alreadyPaid = structure.payments.reduce((sum, payment) => sum + payment.amountPaid, 0)
    if (status === PaymentStatus.COMPLETED && amountPaid > Math.max(structure.totalAmount - alreadyPaid, 0)) return NextResponse.json({ error: `Payment exceeds the outstanding balance of KES ${Math.max(structure.totalAmount - alreadyPaid, 0).toLocaleString()}` }, { status: 400 })

    const receiptNumber = String(body.receiptNumber || `RCPT-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`)
    const paidBy = access.user.id || access.user.email || "system"
    const collectedBy = access.user.name ?? access.user.email ?? "School administrator"
    const payment = await prisma.feePayment.create({ data: { studentId, feeStructureId, amountPaid, paymentDate, paymentMethod: paymentMethod as PaymentMethod, transactionId, receiptNumber, remarks, paidBy, collectedBy, status: status as PaymentStatus }, include: { student: { select: { name: true, admissionNo: true } }, feeStructure: { select: { term: true, academicYear: true, class: { select: { name: true } } } } } })
    return NextResponse.json({ message: "Payment recorded successfully", payment }, { status: 201 })
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return NextResponse.json({ error: "Receipt number already exists" }, { status: 409 })
    console.error("Fee payment creation error:", error)
    return NextResponse.json({ error: "Unable to record fee payment" }, { status: 500 })
  }
}
