import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    const access = requireRole(session, ["PARENT"])
    if (!access.ok) return access.response
    const recipientId = access.user.id
    if (!recipientId) return NextResponse.json({ error: "Authenticated parent required" }, { status: 401 })
    const { id } = await params
    const card = await prisma.reportCard.findUnique({ where: { id }, select: { id: true, version: true, status: true } })
    if (!card || !["PUBLISHED", "AMENDED", "ARCHIVED"].includes(card.status)) {
      return NextResponse.json({ error: "Published report card not found" }, { status: 404 })
    }

    const where = { reportCardId: id, recipientId, version: card.version, channel: "PARENT_PORTAL" as const }
    const publication = await prisma.reportPublication.findFirst({ where, select: { id: true, acknowledgedAt: true } })
    if (!publication) return NextResponse.json({ error: "Published report card not found" }, { status: 404 })
    if (publication.acknowledgedAt) return NextResponse.json({ acknowledgedAt: publication.acknowledgedAt, alreadyAcknowledged: true })

    const acknowledgedAt = new Date()
    const updated = await prisma.reportPublication.updateMany({
      where: { ...where, acknowledgedAt: null },
      data: { acknowledgedAt },
    })
    if (updated.count !== 1) {
      const current = await prisma.reportPublication.findUnique({ where: { id: publication.id }, select: { acknowledgedAt: true } })
      return NextResponse.json({ acknowledgedAt: current?.acknowledgedAt ?? acknowledgedAt, alreadyAcknowledged: true })
    }
    return NextResponse.json({ acknowledgedAt, alreadyAcknowledged: false })
  } catch (error) {
    console.error("Report-card acknowledgement error:", error)
    return NextResponse.json({ error: "Unable to acknowledge report card" }, { status: 500 })
  }
}
