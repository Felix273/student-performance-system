import { NextResponse } from "next/server"

export function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json({ error: "Use the server debugger during local development" }, { status: 404 })
}
