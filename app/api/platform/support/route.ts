import { NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const access = requireRole(await auth(), ["SUPER_ADMIN"])
  if (!access.ok) return access.response
  const grants = await prisma.supportAccessGrant.findMany({
    where: { status: { in: ["PENDING", "APPROVED"] } },
    include: { school: { select: { id: true, name: true, domain: true, status: true } }, requestedBy: { select: { name: true, email: true } }, approvedBy: { select: { name: true, email: true } } },
    orderBy: { requestedAt: "desc" },
    take: 100,
  })
  return NextResponse.json({ grants })
}