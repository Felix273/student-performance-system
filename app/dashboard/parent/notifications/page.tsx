import { redirect } from "next/navigation"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import ParentNotificationsClient from "./ParentNotificationsClient"

export default async function ParentNotificationsPage() {
  const session = await auth()
  if (!session || session.user.role !== "PARENT") redirect("/dashboard")
  const notifications = await prisma.notification.findMany({ where: { recipientId: session.user.id }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, type: true, title: true, message: true, href: true, readAt: true, createdAt: true, student: { select: { id: true, name: true } } } })
  return <ParentNotificationsClient initialNotifications={notifications} />
}
