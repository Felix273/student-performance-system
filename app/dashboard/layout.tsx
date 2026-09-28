import { redirect } from "next/navigation"
import { auth } from "@/lib/auth-config"
import DashboardNav from "./DashboardNav"
import { isUserRole } from "@/lib/authorization"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session || !isUserRole(session.user.role) || session.user.role === "STUDENT") redirect("/login")

  return <div className="min-h-screen bg-[#f5f7fb] text-slate-900"><DashboardNav session={session} /><main className="min-h-screen lg:ml-72"><div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">{children}</div></main></div>
}
