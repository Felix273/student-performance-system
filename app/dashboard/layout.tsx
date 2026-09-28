import { redirect } from "next/navigation"
import { auth } from "@/lib/auth-config"
import DashboardNav from "./DashboardNav"
import { isUserRole } from "@/lib/authorization"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session || !isUserRole(session.user.role) || session.user.role === "STUDENT") {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav session={session} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {children}
      </main>
    </div>
  )
}
