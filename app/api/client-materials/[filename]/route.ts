import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import fs from "node:fs/promises"
import path from "node:path"

const ALLOWED_FILES = new Set([
  "StudentOS_School_Overview_and_Directives.pdf",
  "StudentOS_School_Workflow_Walkthrough.pdf",
])

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"])
    if (!access.ok) return access.response

    const { filename } = await params
    const decodedFilename = decodeURIComponent(filename)

    if (!ALLOWED_FILES.has(decodedFilename)) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    const filePath = path.join(process.cwd(), "docs", "client-materials", decodedFilename)

    const fileBuffer = await fs.readFile(filePath)

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${decodedFilename}"`,
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (error) {
    console.error("Client material retrieval error:", error)
    return NextResponse.json({ error: "Unable to retrieve document" }, { status: 500 })
  }
}
