import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import { sendSms } from "@/lib/sms/smsService"

export async function GET() {
  try {
    const session = await auth()
    const access = requireRole(session, ["SCHOOL_ADMIN"])
    if (!access.ok) return access.response

    const schoolId = access.user.schoolId
    if (!schoolId) return NextResponse.json({ error: "School not assigned" }, { status: 400 })

    const logs = await prisma.smsDeliveryLog.findMany({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { sentBy: { select: { name: true, email: true } } },
    })

    return NextResponse.json({ logs })
  } catch (error) {
    console.error("SMS logs fetch error:", error)
    return NextResponse.json({ error: "Unable to load SMS logs" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const access = requireRole(session, ["SCHOOL_ADMIN"])
    if (!access.ok) return access.response

    const schoolId = access.user.schoolId
    if (!schoolId) return NextResponse.json({ error: "School not assigned" }, { status: 400 })

    const body = await request.json()
    const { targetGroup, classId, customPhones, message } = body

    if (!message || typeof message !== "string" || message.trim().length < 4) {
      return NextResponse.json({ error: "Message must be at least 4 characters" }, { status: 400 })
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true },
    })
    if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 })

    let phoneNumbers: string[] = []

    if (targetGroup === "CUSTOM" && customPhones) {
      // Split by commas, newlines, or spaces
      phoneNumbers = String(customPhones)
        .split(/[\n,;]+/)
        .map((p) => p.trim())
        .filter(Boolean)
    } else if (targetGroup === "CLASS" && classId) {
      const students = await prisma.student.findMany({
        where: { schoolId, classId },
        select: {
          parentPhone: true,
          parents: { select: { parent: { select: { phone: true } } } },
        },
      })
      students.forEach((s) => {
        if (s.parentPhone) phoneNumbers.push(s.parentPhone)
        s.parents.forEach((p) => {
          if (p.parent.phone) phoneNumbers.push(p.parent.phone)
        })
      })
    } else if (targetGroup === "ALL_PARENTS") {
      const students = await prisma.student.findMany({
        where: { schoolId },
        select: {
          parentPhone: true,
          parents: { select: { parent: { select: { phone: true } } } },
        },
      })
      students.forEach((s) => {
        if (s.parentPhone) phoneNumbers.push(s.parentPhone)
        s.parents.forEach((p) => {
          if (p.parent.phone) phoneNumbers.push(p.parent.phone)
        })
      })
    } else if (targetGroup === "TEACHERS") {
      const teachers = await prisma.user.findMany({
        where: { schoolId, role: "TEACHER", isActive: true },
        select: { phone: true },
      })
      teachers.forEach((t) => {
        if (t.phone) phoneNumbers.push(t.phone)
      })
    }

    if (phoneNumbers.length === 0) {
      return NextResponse.json({
        error: "No phone numbers found for this audience. Use 'Direct / Test Numbers' to enter a number directly.",
      }, { status: 400 })
    }

    const prefixedMessage = `${school.name}: ${message.trim()}`

    const result = await sendSms({
      to: phoneNumbers,
      message: prefixedMessage,
      schoolId,
      category: "GENERAL_BROADCAST",
      actorId: access.user.id,
    })

    return NextResponse.json({
      message: `SMS broadcast sent to ${result.sentCount} recipient(s).`,
      result,
    })
  } catch (error) {
    console.error("SMS broadcast error:", error)
    return NextResponse.json({ error: "Unable to send SMS broadcast" }, { status: 500 })
  }
}
