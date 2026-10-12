import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

export default async function ParentDashboardPage() {
  const session = await auth()
  
  if (!session || session.user.role !== "PARENT") {
    redirect("/dashboard")
  }

  // Get parent's children
  const parentStudents = await prisma.parentStudent.findMany({
    where: { parentId: session.user.id },
    include: {
      student: {
        include: {
          class: true,
          school: true,
          assessments: {
            include: {
              assessment: {
                include: {
                  subject: true
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 5
          },
          performances: {
            orderBy: {
              analysisDate: 'desc'
            },
            take: 1
          },
          _count: {
            select: {
              assessments: true,
              performances: true
            }
          }
        }
      }
    }
  })
  const publishedCbcCounts = parentStudents.length ? await prisma.assessmentEvidence.groupBy({
    by: ["studentId"],
    where: {
      status: "PUBLISHED",
      OR: parentStudents.map(({ student }) => ({ studentId: student.id, schoolId: student.schoolId })),
    },
    _count: { _all: true },
  }) : []
  const publishedCbcCountByStudent = new Map(publishedCbcCounts.map((item) => [item.studentId, item._count._all]))

  return (
    <div className="space-y-10 animate-fade-in">
      <header className="relative overflow-hidden rounded-[28px] bg-[#ffd02f] px-6 py-8 sm:px-10 sm:py-10">
        <div className="relative max-w-3xl">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[.2em] text-[#746019]">Parent workspace</p>
          <h1 className="text-4xl font-medium leading-tight text-[#1c1c1e]">Learning, made clear.</h1>
          <p className="mt-3 text-sm leading-6 text-[#746019]">Welcome back, {session.user.name}. Published CBC evidence and legacy score records are kept distinct.</p>
        </div>
      </header>

      {parentStudents.length === 0 && (
        <div className="miro-surface border-dashed bg-[#fffdf5] p-8 sm:p-12">
          <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#8e91a0]">Parent account</p>
          <h2 className="mt-2 text-2xl font-medium text-[#1c1c1e]">No learners linked yet</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#6b6f7e]">Ask your school administrator to link a learner to your parent account.</p>
        </div>
      )}

      {/* Children Overview */}
      {parentStudents.map((ps) => {
        const student = ps.student
        const latestAnalysis = student.performances[0]
        const recentScores = student.assessments.slice(0, 5)
        const average = recentScores.length > 0
          ? (recentScores.reduce((sum, a) => sum + (a.score / a.assessment.maxScore * 100), 0) / recentScores.length).toFixed(1)
          : null
        const publishedCbcCount = publishedCbcCountByStudent.get(student.id) || 0

        return (
          <section key={ps.id} className="miro-surface overflow-hidden">
            <header className="flex flex-col gap-5 border-b border-[#eef0f3] px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#ffd02f] text-lg font-bold text-[#1c1c1e]">{student.name.charAt(0).toUpperCase()}</div>
                <div className="min-w-0">
                  <h2 className="truncate text-2xl font-medium text-[#1c1c1e]">{student.name}</h2>
                  <p className="mt-1 text-sm text-[#555a6a]">{student.class.name} <span className="px-1 text-[#a5a8b5]">·</span> {student.school.name}</p>
                  <p className="mt-1 text-xs text-[#8e91a0]">Admission No: {student.admissionNo}</p>
                </div>
              </div>
              <Link href={`/dashboard/parent/student/${student.id}`} className="miro-pill inline-flex items-center justify-center bg-[#1c1c1e] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2c2c34]">Learner details <span className="ml-2" aria-hidden="true">↗</span></Link>
            </header>

            {/* Latest AI Analysis */}
            <section className="grid gap-3 border-b border-[#eef0f3] p-5 sm:grid-cols-2 sm:p-7">
              <div className="rounded-[20px] bg-[#e7edff] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#555a6a]">Legacy score average</p>
                <p className="mt-4 font-mono text-3xl font-medium text-[#4262ff]">{average === null ? "No scores" : `${average}%`}</p>
                <p className="mt-2 text-xs text-[#6b6f7e]">{student._count.assessments} legacy score {student._count.assessments === 1 ? "record" : "records"}</p>
              </div>
              <div className="rounded-[20px] bg-[#c3faf5] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#3d6967]">Published CBC evidence</p>
                <p className="mt-4 font-mono text-3xl font-medium text-[#187574]">{publishedCbcCount}</p>
                <p className="mt-2 text-xs text-[#4e6b69]">{publishedCbcCount === 1 ? "official learning update" : "official learning updates"}</p>
              </div>
            </section>

            <section className="border-b border-[#eef0f3] bg-[#fffdf5] px-5 py-6 sm:px-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#8c7318]">CBC competency reporting</p>
                  <h3 className="mt-2 text-xl font-medium text-[#1c1c1e]">Published learning updates</h3>
                  <p className="mt-1 text-sm text-[#6b6f7e]">School-reviewed evidence, kept separate from legacy scores.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href="/dashboard/parent/learning-updates" className="miro-pill border border-[#d7c66c] bg-white px-4 py-2.5 text-sm font-semibold text-[#4e451e] transition hover:bg-[#fff4c4]">Learning updates</Link>
                  <Link href={`/dashboard/parent/student/${student.id}`} className="miro-pill bg-[#ffd02f] px-4 py-2.5 text-sm font-semibold text-[#1c1c1e] transition hover:bg-[#fcb900]">Term report <span className="ml-1" aria-hidden="true">↗</span></Link>
                </div>
              </div>
              {publishedCbcCount === 0 && <p className="mt-5 border-t border-[#ece8d7] pt-4 text-sm text-[#6b6f7e]">Published learning evidence will appear here after school review.</p>}
            </section>

            {latestAnalysis && <section className="border-b border-[#eef0f3] px-5 py-6 sm:px-7">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-lg font-medium text-[#1c1c1e]">Latest AI analysis</h3>
                <Link href={`/dashboard/parent/student/${student.id}#analysis`} className="text-sm font-semibold text-[#4262ff] hover:underline">View analysis ↗</Link>
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#555a6a]">{latestAnalysis.aiInsights}</p>
            </section>}

            {student.assessments.length > 0 && <section className="px-5 py-6 sm:px-7">
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-lg font-medium text-[#1c1c1e]">Recent legacy score records</h3>
                <span className="text-xs text-[#8e91a0]">Separate from CBC evidence</span>
              </div>
              <div className="divide-y divide-[#eef0f3]">
                {student.assessments.map((result) => <div key={result.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div><p className="text-sm font-semibold text-[#1c1c1e]">{result.assessment.subject.name}</p><p className="mt-1 text-xs text-[#6b6f7e]">{result.assessment.title}</p></div>
                  <div className="text-right"><p className="font-mono text-sm font-semibold text-[#1c1c1e]">{result.score}/{result.assessment.maxScore}</p><p className="mt-1 text-xs text-[#6b6f7e]">{((result.score / result.assessment.maxScore) * 100).toFixed(1)}%</p></div>
                </div>)}
              </div>
            </section>}

            {student.assessments.length === 0 && latestAnalysis && <div className="px-5 py-5 text-sm text-[#8e91a0] sm:px-7">No legacy score records yet. CBC updates are available above.</div>}
          </section>
        )
      })}
    </div>
  )
}
