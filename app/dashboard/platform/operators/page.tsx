import { redirect } from "next/navigation"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import OperatorManager from "./OperatorManager"

export const metadata = { title: "Platform operators · Fentech StudentOS" }

export default async function PlatformOperatorsPage() {
  const session = await auth()
  if (session?.user.role !== "SUPER_ADMIN") redirect("/dashboard")
  const operators = await prisma.user.findMany({
    where: { role: "SUPER_ADMIN" },
    select: { id: true, name: true, email: true, isActive: true, mfaEnabled: true, lastLoginAt: true, createdAt: true },
    orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
  })

  return <div className="space-y-8 animate-fade-in"><header><p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#4262ff]">Platform security</p><h1 className="mt-2 text-4xl font-medium tracking-[-.055em] sm:text-5xl">Platform operators</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b6f7e]">Invite another operator or disable access. Operators are not deleted; invitations require a password setup and MFA enrollment.</p></header><OperatorManager operators={operators.map((operator) => ({ ...operator, lastLoginAt: operator.lastLoginAt?.toISOString() ?? null, createdAt: operator.createdAt.toISOString() }))} /></div>
}