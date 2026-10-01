import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SUPER_ADMIN", "SCHOOL_ADMIN"])
    if (!access.ok) return access.response
    const actorId = access.user.id
    if (!actorId) return NextResponse.json({ error: "Authenticated user required" }, { status: 401 })
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const reason = typeof body?.reason === "string" ? body.reason.trim() : ""
    if (reason.length > 2000) return NextResponse.json({ error: "Publication note must be 2,000 characters or fewer" }, { status: 400 })

    const card = await prisma.reportCard.findFirst({
      where: { id, ...(access.role === "SCHOOL_ADMIN" ? { schoolId: access.user.schoolId || "" } : {}) },
      include: { student: { select: { id: true, name: true, schoolId: true } }, academicPeriod: { select: { name: true } }, _count: { select: { entries: true } } },
    })
    if (!card) return NextResponse.json({ error: "Report card not found" }, { status: 404 })
    if (card.status !== "REVIEW") return NextResponse.json({ error: "Only a report card in review can be published" }, { status: 409 })
    if (card._count.entries === 0) return NextResponse.json({ error: "A report card with no snapshot entries cannot be published" }, { status: 409 })

    const parents = await prisma.parentStudent.findMany({
      where: { studentId: card.studentId, student: { schoolId: card.schoolId } },
      select: { parentId: true },
    })
    const parentIds = [...new Set(parents.map(({ parentId }) => parentId))]
    const publishedAt = new Date()
    const result = await prisma.$transaction(async (tx) => {
      const changed = await tx.reportCard.updateMany({
        where: { id: card.id, schoolId: card.schoolId, status: "REVIEW" },
        data: { status: "PUBLISHED", publishedAt, publishedById: actorId },
      })
      if (changed.count !== 1) return null

      await tx.reportCardStatusEvent.create({
        data: { reportCardId: card.id, fromStatus: "REVIEW", toStatus: "PUBLISHED", actorId, reason: reason || undefined },
      })
      if (parentIds.length) {
        await tx.reportPublication.createMany({
          data: parentIds.map((recipientId) => ({
            reportCardId: card.id,
            recipientId,
            channel: "PARENT_PORTAL" as const,
            version: card.version,
            eventKey: `report:${card.id}:${card.version}:${recipientId}`,
            publishedAt,
          })),
          skipDuplicates: true,
        })
        const preferences = await tx.schoolNotificationPreference.findUnique({ where: { schoolId: card.schoolId }, select: { publishedInApp: true } })
        if (preferences?.publishedInApp !== false) {
          await tx.notification.createMany({
            data: parentIds.map((recipientId) => ({
              schoolId: card.schoolId,
              recipientId,
              studentId: card.studentId,
              type: "REPORT_PUBLISHED" as const,
              title: "A learner report is ready",
              message: `${card.student.name}'s ${card.academicPeriod.name} report is available in the parent portal.`,
              href: `/dashboard/parent/report-cards?reportCardId=${card.id}`,
              eventKey: `report-published:${card.id}:${card.version}:${recipientId}`,
            })),
            skipDuplicates: true,
          })
        }
      }
      return tx.reportCard.findUnique({
        where: { id: card.id },
        include: { entries: { orderBy: { sequence: "asc" } }, publications: { select: { id: true, recipientId: true, channel: true, publishedAt: true } } },
      })
    })
    if (!result) return NextResponse.json({ error: "Report card changed during publication; reload and try again" }, { status: 409 })
    return NextResponse.json({ reportCard: result, publishedRecipients: parentIds.length })
  } catch (error) {
    console.error("Report-card publication error:", error)
    return NextResponse.json({ error: "Unable to publish report card" }, { status: 500 })
  }
}
