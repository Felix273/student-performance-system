import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import { clientIp, recordPlatformEvent } from "@/lib/platform/audit"
import type { Prisma, SchoolLevel } from "@prisma/client"

const schoolSelect = {
  id: true,
  name: true,
  domain: true,
  schoolLevel: true,
  logoUrl: true,
  county: true,
  contactEmail: true,
  contactPhone: true,
  timezone: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const

const domainPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const schoolLevels = new Set(["PRE_PRIMARY", "PRIMARY", "PRIMARY_AND_JUNIOR", "JUNIOR", "SENIOR"])

function isTimezone(value: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value })
    return true
  } catch {
    return false
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SUPER_ADMIN", "SCHOOL_ADMIN"])
    if (!access.ok) return access.response

    const { id } = await params
    if (access.role === "SCHOOL_ADMIN" && access.user.schoolId !== id) {
      return NextResponse.json({ error: "Access denied to this school" }, { status: 403 })
    }

    const school = await prisma.school.findUnique({
      where: { id },
      select: schoolSelect,
    })

    if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 })
    return NextResponse.json({ school })
  } catch (error) {
    console.error("School fetch error:", error)
    return NextResponse.json({ error: "Unable to fetch school" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SUPER_ADMIN", "SCHOOL_ADMIN"])
    if (!access.ok) return access.response

    const { id } = await params

    if (access.role === "SCHOOL_ADMIN" && access.user.schoolId !== id) {
      return NextResponse.json({ error: "Access denied to this school" }, { status: 403 })
    }

    const body = await request.json()
    const name = typeof body.name === "string" ? body.name.trim() : ""
    if (name && (name.length < 2 || name.length > 120)) {
      return NextResponse.json({ error: "School name must be between 2 and 120 characters" }, { status: 400 })
    }

    const existing = await prisma.school.findUnique({
      where: { id },
      select: schoolSelect,
    })
    if (!existing) return NextResponse.json({ error: "School not found" }, { status: 404 })

    const data: Prisma.SchoolUpdateInput = {}
    if (name) data.name = name

    if (body.domain !== undefined && access.role === "SUPER_ADMIN") {
      const domain = typeof body.domain === "string" ? body.domain.trim().toLowerCase() : ""
      if (!domainPattern.test(domain) || domain.length > 80) {
        return NextResponse.json({ error: "Domain may contain lowercase letters, numbers, and single hyphens only" }, { status: 400 })
      }
      const duplicate = await prisma.school.findFirst({ where: { domain, NOT: { id } }, select: { id: true } })
      if (duplicate) return NextResponse.json({ error: "Domain already exists" }, { status: 409 })
      data.domain = domain
    }

    if (body.schoolLevel !== undefined) {
      if (body.schoolLevel !== null && !schoolLevels.has(body.schoolLevel)) {
        return NextResponse.json({ error: "Choose a valid school level" }, { status: 400 })
      }
      data.schoolLevel = body.schoolLevel as SchoolLevel | null
    }

    if (body.logoUrl !== undefined) {
      data.logoUrl = typeof body.logoUrl === "string" && body.logoUrl.trim() ? body.logoUrl.trim() : null
    }

    for (const field of ["county", "contactEmail", "contactPhone"] as const) {
      if (body[field] === undefined) continue
      if (typeof body[field] !== "string") return NextResponse.json({ error: `Invalid ${field}` }, { status: 400 })
      const value = body[field].trim()
      if (field === "contactEmail" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return NextResponse.json({ error: "Provide a valid school contact email" }, { status: 400 })
      }
      if ((field === "county" && value.length > 100) || (field === "contactPhone" && value.length > 40)) {
        return NextResponse.json({ error: `${field} is too long` }, { status: 400 })
      }
      if (field === "county") data.county = value || null
      if (field === "contactEmail") data.contactEmail = value || null
      if (field === "contactPhone") data.contactPhone = value || null
    }

    if (body.timezone !== undefined) {
      if (typeof body.timezone !== "string" || !isTimezone(body.timezone.trim())) {
        return NextResponse.json({ error: "Provide a valid IANA timezone" }, { status: 400 })
      }
      data.timezone = body.timezone.trim()
    }

    const school = await prisma.school.update({ where: { id }, data, select: schoolSelect })

    await recordPlatformEvent({
      actor: { id: access.user.id, email: access.user.email },
      action: "school.updated",
      targetType: "School",
      targetId: id,
      schoolId: id,
      metadata: { before: existing, after: school },
      ip: clientIp(request.headers),
    })

    return NextResponse.json({ school })
  } catch (error) {
    console.error("School update error:", error)
    return NextResponse.json({ error: "Unable to update school" }, { status: 500 })
  }
}
