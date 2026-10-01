import { NextRequest, NextResponse } from "next/server"
import { ReportCardStatus } from "@prisma/client"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SUPER_ADMIN", "SCHOOL_ADMIN"])
    if (!access.ok) return access.response
    const requestedSchoolId = request.nextUrl.searchParams.get("schoolId")
    const schoolId = access.role === "SCHOOL_ADMIN" ? access.user.schoolId : requestedSchoolId || undefined
    if (access.role === "SCHOOL_ADMIN" && !schoolId) return NextResponse.json({ error: "School context required" }, { status: 400 })

    const periodId = request.nextUrl.searchParams.get("periodId") || undefined
    const statusParam = request.nextUrl.searchParams.get("status")
    if (statusParam && !Object.values(ReportCardStatus).includes(statusParam as ReportCardStatus)) {
      return NextResponse.json({ error: "Invalid report-card status" }, { status: 400 })
    }
    const cards = await prisma.reportCard.findMany({
      where: {
        ...(schoolId ? { schoolId } : {}),
        ...(periodId ? { academicPeriodId: periodId } : {}),
        ...(statusParam ? { status: statusParam as ReportCardStatus } : {}),
      },
      include: {
        student: { select: { id: true, name: true, admissionNo: true, class: { select: { name: true } } } },
        academicPeriod: { select: { id: true, name: true, code: true } },
        template: { select: { id: true, name: true, code: true } },
        _count: { select: { entries: true, comments: true, publications: true } },
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: 100,
    })
    return NextResponse.json(cards)
  } catch (error) {
    console.error("Report-card list error:", error)
    return NextResponse.json({ error: "Unable to load report cards" }, { status: 500 })
  }
}
