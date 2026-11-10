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

  const { userId, role } = authCheck.payload
  if (role !== "PARENT" && role !== "SCHOOL_ADMIN") {
    return NextResponse.json({ error: "Parent access required" }, { status: 403, headers: corsHeaders })
  }

  try {
    const parentLinks = await prisma.parentStudent.findMany({
      where: { parentId: userId },
      include: {
        student: {
          include: {
            class: { select: { id: true, name: true, grade: true } },
            school: { select: { id: true, name: true, logoUrl: true } },
            feePayments: {
              where: { status: "COMPLETED" },
              orderBy: { paymentDate: "desc" },
              take: 5,
              select: {
                id: true,
                amountPaid: true,
                paymentDate: true,
                paymentMethod: true,
                receiptNumber: true,
                transactionId: true,
              },
            },
            cbcEvidence: {
              where: { status: "PUBLISHED" },
              orderBy: { publishedAt: "desc" },
              take: 10,
              select: {
                id: true,
                masteryLevel: true,
                narrative: true,
                publishedAt: true,
                publishedSnapshot: true,
                learningOutcome: { select: { code: true, statement: true } },
                competency: { select: { code: true, name: true } },
                assessmentPlan: { select: { title: true } },
              },
            },
          },
        },
      },
    })

    if (parentLinks.length === 0) {
      return NextResponse.json({ children: [] }, { headers: corsHeaders })
    }

    // Get active fee structures for each child's class
    const classIds = Array.from(new Set(parentLinks.map((l) => l.student.classId)))
    const feeStructures = await prisma.feeStructure.findMany({
      where: { classId: { in: classIds } },
      orderBy: { createdAt: "desc" },
    })
    const feeMap = new Map(feeStructures.map((fs) => [fs.classId, fs]))

    // Get current active academic period for report card links
    const schoolId = parentLinks[0].student.schoolId
    const currentPeriod = await prisma.academicPeriod.findFirst({
      where: { academicYear: { schoolId, isCurrent: true } },
      select: { id: true, name: true, academicYear: { select: { name: true } } },
      orderBy: { sequence: "asc" },
    })

    const children = parentLinks.map(({ student }) => {
      const feeStructure = feeMap.get(student.classId)
      const totalBilled = feeStructure?.totalAmount || 0
      const totalPaid = student.feePayments.reduce((sum, p) => sum + p.amountPaid, 0)
      const feeBalance = Math.max(0, totalBilled - totalPaid)
      const isFeeCleared = totalBilled > 0 && feeBalance === 0

      return {
        id: student.id,
        name: student.name,
        admissionNo: student.admissionNo,
        className: student.class.name,
        classId: student.class.id,
        grade: student.class.grade,
        schoolName: student.school.name,
        schoolLogo: student.school.logoUrl,
        reportCardPeriodId: currentPeriod?.id || null,
        reportCardPeriodName: currentPeriod ? `${currentPeriod.academicYear.name} · ${currentPeriod.name}` : null,
        finance: {
          totalBilled,
          totalPaid,
          balance: feeBalance,
          isCleared: isFeeCleared,
          dueDate: feeStructure?.dueDate ? feeStructure.dueDate.toISOString() : null,
          termName: feeStructure ? `${feeStructure.academicYear} ${feeStructure.term}` : "Current Term",
          recentPayments: student.feePayments.map((p) => ({
            id: p.id,
            amount: p.amountPaid,
            date: p.paymentDate.toISOString(),
            method: p.paymentMethod,
            receiptNumber: p.receiptNumber,
            transactionId: p.transactionId,
          })),
        },
        evidence: student.cbcEvidence.map((e) => {
          const snapshot = (e.publishedSnapshot as Record<string, unknown> | null) ?? {}
          return {
            id: e.id,
            title: e.assessmentPlan?.title || (snapshot.planTitle as string) || "CBC Learning Evaluation",
            masteryLevel: e.masteryLevel || (snapshot.masteryLevel as string) || "ME",
            outcome: e.learningOutcome?.statement || ((snapshot.learningOutcome as { statement?: string })?.statement) || "Core Learning Outcome",
            competency: e.competency?.name || ((snapshot.competency as { name?: string })?.name) || "Core Competency",
            narrative: e.narrative || (snapshot.narrative as string) || null,
            publishedAt: e.publishedAt ? e.publishedAt.toISOString() : null,
          }
        }),
      }
    })

    return NextResponse.json({ children }, { headers: corsHeaders })
  } catch (error) {
    console.error("Mobile parent overview error:", error)
    return NextResponse.json({ error: "Unable to load parent overview" }, { status: 500, headers: corsHeaders })
  }
}
