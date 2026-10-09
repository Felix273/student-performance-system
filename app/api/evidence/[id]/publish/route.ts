import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { publishEvidence } from "@/lib/moderation"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth(); const access = requireRole(session, ["SCHOOL_ADMIN"]); if (!access.ok) return access.response
  const { id } = await params; const body = await request.json().catch(() => ({})); const actorId = access.user.id; if (!actorId) return NextResponse.json({ error: "Authenticated user required" }, { status: 401 })
  try { const evidence = await publishEvidence(id, actorId, access.user.schoolId || "", typeof body.reason === "string" ? body.reason.trim() : undefined); return NextResponse.json({ evidence, message: "Approved result published to linked parents." }) }
  catch (error) { const code = error instanceof Error ? error.message : ""; if (code === "NOT_FOUND") return NextResponse.json({ error: "Evidence not found" }, { status: 404 }); if (code === "ONLY_VERIFIED") return NextResponse.json({ error: "Only verified evidence can be published" }, { status: 409 }); console.error("Evidence publication error", error); return NextResponse.json({ error: "Unable to publish evidence" }, { status: 500 }) }
}
