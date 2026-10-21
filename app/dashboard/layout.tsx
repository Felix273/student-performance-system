import { redirect } from "next/navigation"
import { auth } from "@/lib/auth-config"
import DashboardNav from "./DashboardNav"
import { isUserRole } from "@/lib/authorization"
import PasswordForm from "./account/PasswordForm"
import MfaEnrol from "./account/MfaEnrol"
import { prisma } from "@/lib/prisma"

function AnnouncementBanners({ announcements }: { announcements: { id: string; kind: string; title: string; body: string }[] }) {
  if (!announcements.length) return null
  return <div className="mx-auto max-w-[1480px] space-y-2 px-5 pt-4 sm:px-8 lg:px-12">{announcements.map((item) => item.kind === "MAINTENANCE" ? (
    <section key={item.id} role="status" aria-live="polite" className="animate-maintenance-attention relative overflow-hidden rounded-2xl border border-[#e0ad35] bg-[#fff2c2] text-[#49390e] shadow-[0_10px_28px_rgba(185,128,17,.14)]">
      <div aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5 bg-[#d99412]" />
      <div className="relative flex gap-3.5 px-4 py-4 pl-5 sm:gap-4 sm:px-6 sm:py-5">
        <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#ffd02f] text-lg font-black text-[#49390e]">!</span>
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#8a5a09]">Scheduled maintenance</p>
          <h2 className="mt-1 text-base font-bold leading-6 sm:text-lg">{item.title}</h2>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#66521d]">{item.body}</p>
        </div>
      </div>
    </section>
  ) : (
    <section key={item.id} role="status" className="rounded-xl border border-[#b7d8ec] bg-[#eef8ff] px-4 py-3 text-[#275675]"><h2 className="text-sm font-bold">{item.title}</h2><p className="mt-1 whitespace-pre-wrap text-sm leading-5">{item.body}</p></section>
  ))}</div>
}

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

  const currentSchool = session.user.schoolId
    ? await prisma.school.findUnique({
        where: { id: session.user.schoolId },
        select: { id: true, name: true, logoUrl: true },
      })
    : null

  const announcements = session.user.role === "SCHOOL_ADMIN" && session.user.schoolId
    ? await prisma.platformAnnouncement.findMany({
        where: { isActive: true, startsAt: { lte: new Date() }, AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] }, { OR: [{ schoolId: null }, { schoolId: session.user.schoolId }] }] },
        select: { id: true, kind: true, title: true, body: true },
        orderBy: [{ kind: "desc" }, { startsAt: "asc" }],
        take: 3,
      })
    : []

  return <div className="min-h-screen bg-white text-[#1c1c1e]"><DashboardNav session={session} schoolLogo={currentSchool?.logoUrl} schoolName={currentSchool?.name} /><main className="min-h-screen lg:ml-64"><AnnouncementBanners announcements={announcements} /><div className="mx-auto max-w-[1480px] px-5 py-7 sm:px-8 sm:py-10 lg:px-12 lg:py-12">{children}</div></main></div>
}
