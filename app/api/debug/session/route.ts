import { NextResponse } from "next/server"

// Debug endpoints are not available in this build.
export function GET() {
  return NextResponse.json({ error: "Not found" }, { status: 404 })
}
