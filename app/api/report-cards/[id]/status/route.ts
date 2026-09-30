import { NextRequest, NextResponse } from "next/server"
import { ReportCardStatus } from "@prisma/client"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import { canTransitionReportCard } from "@/lib/reports/reportCardLifecycle"

const validStatuses = new Set<string>(Object.values(ReportCardStatus))

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SCHOOL_ADMIN"])
    if (!access.ok) return access.response
    const actorId = access.user.id
    if (!actorId) return NextResponse.json({ error: "Authenticated user required" }, { status: 401 })

    const { id } = await params
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object" || typeof body.status !== "string" || !validStatuses.has(body.status)) {
      return NextResponse.json({ error: "A valid next report-card status is required" }, { status: 400 })
    }
    const nextStatus = body.status as ReportCardStatus
    const reason = typeof body.reason === "string" ? body.reason.trim() : ""
    if (reason.length > 2000) return NextResponse.json({ error: "Reason must be 2,000 characters or fewer" }, { status: 400 })
    if (nextStatus === "ARCHIVED" && !reason) return NextResponse.json({ error: "An archive reason is required" }, { status: 400 })
    if (nextStatus === "PUBLISHED" || nextStatus === "AMENDED") {
      return NextResponse.json({ error: "Publication and amendments must use their dedicated audited workflows" }, { status: 409 })
    }

    const current = await prisma.reportCard.findUnique({ where: { id }, select: { id: true, schoolId: true, status: true } })
    if (!current) return NextResponse.json({ error: "Report card not found" }, { status: 404 })
    if (access.role === "SCHOOL_ADMIN" && current.schoolId !== access.user.schoolId) {
      return NextResponse.json({ error: "Report card not found" }, { status: 404 })
    }
    if (!canTransitionReportCard(current.status, nextStatus)) {
      return NextResponse.json({ error: `Cannot move a ${current.status.toLowerCase()} report card to ${nextStatus.toLowerCase()}` }, { status: 409 })
    }

    const timestamp = new Date()
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.reportCard.updateMany({
        where: { id, schoolId: current.schoolId, status: current.status },
        data: {
          status: nextStatus,
          ...(nextStatus === "REVIEW" ? { reviewedAt: timestamp, reviewedById: actorId } : {}),
          ...(nextStatus === "DRAFT" ? { reviewedAt: null, reviewedById: null } : {}),
          ...(nextStatus === "ARCHIVED" ? { archivedAt: timestamp, archivedById: actorId } : {}),
        },
      })
      if (updated.count !== 1) return null
      await tx.reportCardStatusEvent.create({
        data: {
          reportCardId: id,
          fromStatus: current.status,
          toStatus: nextStatus,
          actorId,
          reason: reason || undefined,
        },
      })
      return tx.reportCard.findUnique({
        where: { id },
        include: {
          entries: { orderBy: { sequence: "asc" } },
          comments: { orderBy: { createdAt: "asc" } },
          statusEvents: { orderBy: { createdAt: "asc" } },
        },
      })
    })
    if (!result) return NextResponse.json({ error: "Report card changed while you were editing it; reload and try again" }, { status: 409 })
    return NextResponse.json(result)
  } catch (error) {
    console.error("Report-card status update error:", error)
    return NextResponse.json({ error: "Unable to update report-card status" }, { status: 500 })
  }
}
