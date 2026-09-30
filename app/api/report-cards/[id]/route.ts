import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SCHOOL_ADMIN", "PARENT", "STUDENT"])
    if (!access.ok) return access.response
    const { id } = await params
    const isFamilyRecipient = access.role === "PARENT" || access.role === "STUDENT"
    const recipientId = access.user.id || ""
    const card = await prisma.reportCard.findUnique({
      where: { id },
      include: {
        entries: { orderBy: { sequence: "asc" } },
        comments: {
          where: isFamilyRecipient ? { audience: access.role === "PARENT" ? "FAMILY" : "LEARNER" } : undefined,
          orderBy: { createdAt: "asc" },
        },
        statusEvents: isFamilyRecipient ? false : { orderBy: { createdAt: "asc" } },
        publications: isFamilyRecipient ? { where: { recipientId }, select: { id: true, channel: true, version: true, publishedAt: true, acknowledgedAt: true } } : { select: { id: true, recipientId: true, channel: true, version: true, publishedAt: true, acknowledgedAt: true } },
        academicPeriod: { select: { id: true, name: true, code: true, startsOn: true, endsOn: true } },
        template: { select: { id: true, name: true, code: true } },
      },
    })
    if (!card) return NextResponse.json({ error: "Report card not found" }, { status: 404 })

    if (access.role === "SCHOOL_ADMIN" && card.schoolId !== access.user.schoolId) {
      return NextResponse.json({ error: "Report card not found" }, { status: 404 })
    }
    if (isFamilyRecipient) {
      const visibleStatus = ["PUBLISHED", "AMENDED", "ARCHIVED"].includes(card.status)
      const expectedChannel = access.role === "PARENT" ? "PARENT_PORTAL" : "LEARNER_PORTAL"
      const publication = card.publications.find((item) => item.version === card.version && item.channel === expectedChannel)
      if (!visibleStatus || !publication) return NextResponse.json({ error: "Published report card not found" }, { status: 404 })
    }
    return NextResponse.json(card)
  } catch (error) {
    console.error("Report-card detail error:", error)
    return NextResponse.json({ error: "Unable to load report card" }, { status: 500 })
  }
}
