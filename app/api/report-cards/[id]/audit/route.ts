import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SUPER_ADMIN", "SCHOOL_ADMIN"])
    if (!access.ok) return access.response
    const { id } = await params
    const card = await prisma.reportCard.findFirst({
      where: { id, ...(access.role === "SCHOOL_ADMIN" ? { schoolId: access.user.schoolId || "" } : {}) },
      select: { id: true },
    })
    if (!card) return NextResponse.json({ error: "Report card not found" }, { status: 404 })
    const events = await prisma.reportCardStatusEvent.findMany({
      where: { reportCardId: id },
      include: { actor: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    })
    return NextResponse.json({ events })
  } catch (error) {
    console.error("Report-card audit query error:", error)
    return NextResponse.json({ error: "Unable to load report-card audit history" }, { status: 500 })
  }
}
