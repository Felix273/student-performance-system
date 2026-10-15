import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { clientIp, recordPlatformEvent } from "@/lib/platform/audit"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = requireRole(await auth(), ["SUPER_ADMIN"])
  if (!access.ok) return access.response
  const { id } = await params
  const body = await request.json().catch(() => null)
  if (typeof body?.isActive !== "boolean") return NextResponse.json({ error: "Choose whether this operator is active" }, { status: 400 })

  const target = await prisma.user.findFirst({ where: { id, role: "SUPER_ADMIN" }, select: { id: true, email: true, name: true, isActive: true } })
  if (!target) return NextResponse.json({ error: "Platform operator not found" }, { status: 404 })
  if (target.isActive === body.isActive) return NextResponse.json({ operator: target, unchanged: true })

  let operator
  try {
    operator = await prisma.$transaction(async (tx) => {
      if (!body.isActive) {
        const activeCount = await tx.user.count({ where: { role: "SUPER_ADMIN", isActive: true } })
        if (activeCount <= 1) throw new Error("LAST_ACTIVE_OPERATOR")
      }
      return tx.user.update({
        where: { id },
        data: { isActive: body.isActive, sessionVersion: { increment: 1 } },
        select: { id: true, email: true, name: true, isActive: true },
      })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  } catch (error) {
    if (error instanceof Error && error.message === "LAST_ACTIVE_OPERATOR") return NextResponse.json({ error: "The last active platform operator cannot be disabled" }, { status: 409 })
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return NextResponse.json({ error: "Another operator change happened at the same time. Refresh and try again." }, { status: 409 })
    throw error
  }
  await recordPlatformEvent({
    actor: { id: access.user.id, email: access.user.email },
    action: body.isActive ? "platform_operator.reactivated" : "platform_operator.disabled",
    targetType: "User",
    targetId: id,
    metadata: { email: target.email, isActive: body.isActive },
    ip: clientIp(request.headers),
  })
  return NextResponse.json({ operator })
}