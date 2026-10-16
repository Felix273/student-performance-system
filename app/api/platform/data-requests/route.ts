import { NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const access = requireRole(await auth(), ["SUPER_ADMIN"])
  if (!access.ok) return access.response
  const requests = await prisma.schoolDataRequest.findMany({
    include: { school: { select: { id: true, name: true, domain: true } }, requestedBy: { select: { name: true, email: true } }, reviewedBy: { select: { name: true, email: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    take: 200,
  })
  return NextResponse.json({ requests })
}
