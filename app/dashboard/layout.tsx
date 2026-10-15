import { redirect } from "next/navigation"
import { auth } from "@/lib/auth-config"
import DashboardNav from "./DashboardNav"
import { isUserRole } from "@/lib/authorization"
import PasswordForm from "./account/PasswordForm"
import MfaEnrol from "./account/MfaEnrol"

function Gate({ title, detail, children }: { title: string; detail?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-5 py-10 text-[#1c1c1e]">
      <div className="w-full max-w-lg rounded-[28px] bg-white p-7 shadow-[0_18px_60px_rgba(28,28,30,.08)] sm:p-10">
        <h1 className="text-2xl font-medium tracking-[-.04em]">{title}</h1>
        {detail && <p className="mt-3 text-sm leading-6 text-[#6b6f7e]">{detail}</p>}
        <div className="mt-7">{children}</div>
      </div>
    </div>
  )
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session || !isUserRole(session.user.role) || session.user.role === "STUDENT") redirect("/login")

  // Nothing else is reachable until a temporary password is replaced.
  if (session.user.mustChangePassword) {
    return <Gate title="Choose your own password" detail="You signed in with a temporary password. Set a new one to continue — you’ll sign in again afterwards."><PasswordForm forced /></Gate>
  }
  // Platform operators cannot use the portal without a second factor.
  if (session.user.role === "SUPER_ADMIN" && !session.user.mfaEnabled) {
    return <Gate title="Secure your operator account"><MfaEnrol /></Gate>
  }

  return <div className="min-h-screen bg-white text-[#1c1c1e]"><DashboardNav session={session} /><main className="min-h-screen lg:ml-64"><div className="mx-auto max-w-[1480px] px-5 py-7 sm:px-8 sm:py-10 lg:px-12 lg:py-12">{children}</div></main></div>
}
