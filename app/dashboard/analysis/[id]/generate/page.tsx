import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import GenerateAnalysisForm from "./GenerateAnalysisForm"

export const metadata = {
  title: "Generate Learning Diagnostics | Fentech StudentOS",
}

export default async function GenerateAnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session || !["SCHOOL_ADMIN", "TEACHER"].includes(session.user.role || "")) {
    redirect("/dashboard")
  }

  const { id } = await params

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      class: { select: { id: true, name: true, grade: true } },
      school: { select: { id: true, name: true, county: true } },
      assessments: {
        include: {
          assessment: {
            include: {
              subject: { select: { id: true, name: true, code: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      performances: {
        orderBy: { analysisDate: "desc" },
        take: 1,
      },
    },
  })

  if (!student) {
    redirect("/dashboard/analysis")
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Breadcrumb Navigation */}
      <div>
        <Link
          href="/dashboard/analysis"
          className="text-xs font-bold text-[#4262ff] hover:underline inline-flex items-center gap-1.5"
        >
          ← Back to Insights Directory
        </Link>
      </div>

      {/* Hero Header Card */}
      <section className="relative overflow-hidden rounded-[28px] bg-[#ffd02f] p-6 sm:p-9 text-[#1c1c1e]">
        <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full border-[28px] border-[#fcb900]/50" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-[10px] font-bold uppercase tracking-[.2em] text-[#746019]">
              Diagnostic Engine
            </span>
            <span className="miro-pill bg-[#1c1c1e] text-[#ffd02f] px-2.5 py-0.5 text-[11px] font-bold">
              {student.class.name}
            </span>
            <span className="miro-pill bg-white/70 text-[#1c1c1e] px-2.5 py-0.5 text-[11px] font-semibold">
              Adm: {student.admissionNo}
            </span>
          </div>

          <h1 className="text-3xl font-medium tracking-tight text-[#1c1c1e] sm:text-4xl">
            {student.name}
          </h1>
          <p className="mt-2 max-w-xl text-xs sm:text-sm text-[#746019] leading-relaxed">
            Run a pedagogical diagnosis across continuous assessment checkpoints to surface strengths, intervention priorities, and actionable study directives.
          </p>
        </div>
      </section>

      {/* Interactive Form Component */}
      <GenerateAnalysisForm student={student as any} />
    </div>
  )
}
