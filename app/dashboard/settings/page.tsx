import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import SchoolSettingsWorkspace from "./SchoolSettingsWorkspace"

export const metadata = {
  title: "School Settings | Fentech StudentOS",
}

export default async function SettingsPage() {
  const session = await auth()
  if (!session || session.user.role !== "SCHOOL_ADMIN") {
    redirect("/dashboard")
  }

  const schoolId = session.user.schoolId
  if (!schoolId) {
    redirect("/dashboard")
  }

  const [school, academicYears, notificationPref] = await Promise.all([
    prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        domain: true,
        schoolLevel: true,
        county: true,
        contactEmail: true,
        contactPhone: true,
        timezone: true,
      },
    }),
    prisma.academicYear.findMany({
      where: { schoolId },
      include: {
        periods: { orderBy: { sequence: "asc" } },
      },
      orderBy: { startsOn: "desc" },
    }),
    prisma.schoolNotificationPreference.findUnique({
      where: { schoolId },
    }),
  ])

  if (!school) {
    redirect("/dashboard")
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="border-b border-[#e0e2e8] pb-6">
        <p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#8e91a0]">Administration Hub</p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight text-[#1c1c1e] sm:text-4xl">
          School Settings & Operations
        </h1>
        <p className="mt-2 text-sm text-[#6b6f7e]">
          Manage your institutional identity, academic calendar terms, and CBC configuration for <span className="font-semibold text-[#1c1c1e]">{school.name}</span>.
        </p>

        <div className="mt-5 flex flex-wrap gap-2.5">
          <Link
            href="/dashboard/settings/cbc-bands"
            className="miro-pill border border-[#e0e2e8] bg-white px-4 py-2 text-xs font-semibold text-[#1c1c1e] hover:bg-[#f7f8fa]"
          >
            CBC Band Maps ↗
          </Link>
          <Link
            href="/dashboard/settings/notifications"
            className="miro-pill border border-[#e0e2e8] bg-white px-4 py-2 text-xs font-semibold text-[#1c1c1e] hover:bg-[#f7f8fa]"
          >
            Notification Rules ↗
          </Link>
          <Link
            href="/dashboard/timetable"
            className="miro-pill border border-[#e0e2e8] bg-white px-4 py-2 text-xs font-semibold text-[#1c1c1e] hover:bg-[#f7f8fa]"
          >
            Class Timetable ↗
          </Link>
        </div>
      </div>

      <SchoolSettingsWorkspace
        school={school}
        initialAcademicYears={academicYears}
        notificationPref={notificationPref}
      />
    </div>
  )
}
