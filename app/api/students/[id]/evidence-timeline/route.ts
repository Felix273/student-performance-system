import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { canAccessStudent } from "@/lib/authorization"
import { getLearnerEvidenceTimeline } from "@/lib/learnerEvidenceTimeline"

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    const { id } = await params
    const access = await canAccessStudent(session, id)
    if (!access.ok) return access.response
    if (!["TEACHER", "SCHOOL_ADMIN", "PARENT"].includes(access.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const publishedOnly = access.role === "PARENT"
    const timeline = await getLearnerEvidenceTimeline(id, access.student.schoolId, publishedOnly)
    return NextResponse.json({ timeline, publishedOnly })
  } catch (error) {
    console.error("Learner evidence timeline error:", error)
    return NextResponse.json({ error: "Unable to load learner evidence timeline" }, { status: 500 })
  }
}