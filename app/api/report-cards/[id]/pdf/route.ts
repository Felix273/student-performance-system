import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import { generateSnapshotReportCard } from "@/lib/reports/snapshotReportCardPdf"

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SCHOOL_ADMIN", "PARENT", "STUDENT"])
    if (!access.ok) return access.response
    const { id } = await params
    const familyRole = access.role === "PARENT" || access.role === "STUDENT"
    const card = await prisma.reportCard.findUnique({
      where: { id },
      include: {
        entries: { orderBy: { sequence: "asc" } },
        comments: { where: familyRole ? { audience: access.role === "PARENT" ? "FAMILY" : "LEARNER" } : undefined, orderBy: { createdAt: "asc" } },
        publications: familyRole ? { where: { recipientId: access.user.id || "" }, select: { version: true, channel: true } } : false,
      },
    })
    if (!card) return NextResponse.json({ error: "Report card not found" }, { status: 404 })
    if (access.role === "SCHOOL_ADMIN" && card.schoolId !== access.user.schoolId) {
      return NextResponse.json({ error: "Report card not found" }, { status: 404 })
    }
    if (familyRole) {
      const visibleStatus = ["PUBLISHED", "AMENDED", "ARCHIVED"].includes(card.status)
      const expectedChannel = access.role === "PARENT" ? "PARENT_PORTAL" : "LEARNER_PORTAL"
      const publication = card.publications.find((item) => item.version === card.version && item.channel === expectedChannel)
      if (!visibleStatus || !publication) return NextResponse.json({ error: "Published report card not found" }, { status: 404 })
    }

    const pdf = generateSnapshotReportCard({
      snapshot: card.snapshot as Parameters<typeof generateSnapshotReportCard>[0]["snapshot"],
      entries: card.entries,
      comments: card.comments,
    })
    const safeAdmission = String((card.snapshot as { student?: { admissionNo?: string } }).student?.admissionNo || "learner").replace(/[^a-zA-Z0-9_-]/g, "-")
    const bytes = pdf.output("arraybuffer")
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="report-${safeAdmission}-v${card.version}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    console.error("Snapshot report PDF error:", error)
    return NextResponse.json({ error: "Unable to generate report-card PDF" }, { status: 500 })
  }
}
