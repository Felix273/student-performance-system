import { NextRequest, NextResponse } from "next/server"
import crypto from "node:crypto"

export type MobileAuthPayload = {
  userId: string
  role: string
  schoolId: string | null
  exp: number
}

export function verifyMobileAuth(request: NextRequest): { ok: true; payload: MobileAuthPayload } | { ok: false; response: NextResponse } {
  const authHeader = request.headers.get("Authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { ok: false, response: NextResponse.json({ error: "Bearer token required" }, { status: 401 }) }
  }

  const token = authHeader.slice(7).trim()
  const secret = process.env.NEXTAUTH_SECRET || "fentech-studentos-mobile-secret-2026"

  const parts = token.split(".")
  if (parts.length !== 3) {
    return { ok: false, response: NextResponse.json({ error: "Malformed token" }, { status: 401 }) }
  }

  const [header, body, signature] = parts
  const expectedSig = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url")

  if (signature !== expectedSig) {
    return { ok: false, response: NextResponse.json({ error: "Invalid token signature" }, { status: 401 }) }
  }

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as MobileAuthPayload
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) {
      return { ok: false, response: NextResponse.json({ error: "Token expired. Please sign in again." }, { status: 401 }) }
    }
    return { ok: true, payload }
  } catch {
    return { ok: false, response: NextResponse.json({ error: "Invalid token payload" }, { status: 401 }) }
  }
}
