import { redirect } from "next/navigation"
import { auth } from "@/lib/auth-config"
import DashboardNav from "./DashboardNav"
import { isUserRole } from "@/lib/authorization"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session || !isUserRole(session.user.role) || session.user.role === "STUDENT") redirect("/login")

  return <div className="min-h-screen bg-white text-[#1c1c1e]"><DashboardNav session={session} /><main className="min-h-screen lg:ml-64"><div className="mx-auto max-w-[1480px] px-5 py-7 sm:px-8 sm:py-10 lg:px-12 lg:py-12">{children}</div></main></div>
}
