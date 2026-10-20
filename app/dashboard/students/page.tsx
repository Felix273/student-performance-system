import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import StudentsDirectoryClient from "./StudentsDirectoryClient"

export const metadata = {
  title: "Learner Directory | Fentech StudentOS",
}

export default async function StudentsPage() {
  const session = await auth()
  if (!session || session.user.role !== "SCHOOL_ADMIN") redirect("/dashboard")

  const students = await prisma.student.findMany({
    where: session.user.schoolId ? { schoolId: session.user.schoolId } : undefined,
    include: {
      class: { select: { id: true, name: true, grade: true } },
      school: { select: { name: true } },
      _count: { select: { assessments: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const withRecordsCount = students.filter((s) => s._count.assessments > 0).length

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-[#4262ff]">People & records</p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight text-slate-950 sm:text-4xl">
            Learner Directory
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Keep every learner record clear, current, and connected to CBC assessment performance.
          </p>
        </div>
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <Link
            href="/dashboard/bulk-upload"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Bulk upload (CSV / Excel)
          </Link>
          <Link
            href="/dashboard/students/new"
            className="inline-flex items-center justify-center rounded-xl miro-pill bg-[#1c1c1e] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#2c2c34]"
          >
            + Add individual learner
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="miro-surface p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Total enrolled</p>
          <p className="mt-2 font-mono text-3xl font-bold text-slate-950">{students.length}</p>
          <p className="mt-1 text-xs text-slate-400">Active school roster</p>
        </div>
        <div className="miro-surface p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">With assessment data</p>
          <p className="mt-2 font-mono text-3xl font-bold text-emerald-600">{withRecordsCount}</p>
          <p className="mt-1 text-xs text-slate-400">
            {students.length > 0 ? Math.round((withRecordsCount / students.length) * 100) : 0}% coverage
          </p>
        </div>
        <div className="miro-surface p-5 col-span-2 sm:col-span-1">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Missing assessments</p>
          <p className="mt-2 font-mono text-3xl font-bold text-amber-600">
            {students.length - withRecordsCount}
          </p>
          <p className="mt-1 text-xs text-slate-400">Awaiting score entry</p>
        </div>
      </div>

      {/* Interactive Directory Table with Search & Class Filter */}
      <StudentsDirectoryClient students={students} />
    </div>
  )
}
