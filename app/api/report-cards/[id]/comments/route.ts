import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"

const audiences = new Set(["STAFF", "FAMILY", "LEARNER"])

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SCHOOL_ADMIN"])
    if (!access.ok) return access.response
    const actorId = access.user.id
    if (!actorId) return NextResponse.json({ error: "Authenticated user required" }, { status: 401 })
    const { id } = await params
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object" || typeof body.body !== "string") return NextResponse.json({ error: "A comment is required" }, { status: 400 })
    const commentBody = body.body.trim()
    if (!commentBody || commentBody.length > 5000) return NextResponse.json({ error: "Comment must be between 1 and 5,000 characters" }, { status: 400 })
    const audience = typeof body.audience === "string" ? body.audience : "FAMILY"
    if (!audiences.has(audience)) return NextResponse.json({ error: "Invalid comment audience" }, { status: 400 })

    const card = await prisma.reportCard.findFirst({
      where: { id, ...(access.role === "SCHOOL_ADMIN" ? { schoolId: access.user.schoolId || "" } : {}) },
    })
    if (!card) return NextResponse.json({ error: "Report card not found" }, { status: 404 })
    if (card.status !== "DRAFT" && card.status !== "REVIEW") return NextResponse.json({ error: "Published snapshots are immutable; create an amendment to change report content" }, { status: 409 })
    const snapshot = card.snapshot as unknown as { template?: { sections?: Array<{ code?: unknown; isEnabled?: unknown }> } }
    const frozenSections = Array.isArray(snapshot?.template?.sections) ? snapshot.template.sections : []
    const sectionCode = typeof body.sectionCode === "string" && body.sectionCode.trim() ? body.sectionCode.trim().toUpperCase() : null
    if (sectionCode && !frozenSections.some((section) => section.code === sectionCode && section.isEnabled === true)) {
      return NextResponse.json({ error: "The selected report section is not enabled on this template" }, { status: 400 })
    }
    const comment = await prisma.reportCardComment.create({
      data: { reportCardId: card.id, sectionCode, audience: audience as "STAFF" | "FAMILY" | "LEARNER", body: commentBody, authorId: actorId },
    })
    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error("Report-card comment creation error:", error)
    return NextResponse.json({ error: "Unable to save report comment" }, { status: 500 })
  }
}
