import { redirect } from "next/navigation"
import { auth } from "@/lib/auth-config"
import InstallPWA from "@/components/InstallPWA"
import DashboardNav from "./DashboardNav"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900 selection:bg-blue-500 selection:text-white">
      <DashboardNav session={session} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {children}
      </main>
      <InstallPWA />
    </div>
  )
}
