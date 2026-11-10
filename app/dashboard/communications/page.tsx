import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import CommunicationsClient from "./CommunicationsClient"

export const metadata = {
  title: "Communications & SMS | Fentech StudentOS",
}

export default async function CommunicationsPage() {
  const session = await auth()
  if (!session || !["SCHOOL_ADMIN"].includes(session.user.role || "")) {
    redirect("/dashboard")
  }

  const schoolId = session.user.schoolId
  if (!schoolId) redirect("/dashboard")

  const [school, classes, logs] = await Promise.all([
    prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true },
    }),
    prisma.class.findMany({
      where: { schoolId },
      select: { id: true, name: true, grade: true },
      orderBy: { name: "asc" },
    }),
    prisma.smsDeliveryLog.findMany({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
      take: 60,
      include: { sentBy: { select: { name: true, email: true } } },
    }),
  ])

  return (
    <CommunicationsClient
      classes={classes}
      initialLogs={logs.map((l) => ({
        ...l,
        createdAt: l.createdAt.toISOString(),
      }))}
      schoolName={school?.name || "School"}
    />
  )
}
