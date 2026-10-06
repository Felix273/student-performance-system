import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth-config"
import { canAccessClass } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import PlanEvidenceEntryForm from "./PlanEvidenceEntryForm"

const formatGrade = (grade: string) => /^grade\s/i.test(grade.trim()) ? grade.trim() : `Grade ${grade.trim()}`

export default async function PlanEvidenceRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || !["TEACHER", "SCHOOL_ADMIN"].includes(session.user.role || "")) redirect("/dashboard")
  const { id } = await params
  const plan = await prisma.assessmentPlan.findUnique({
    where: { id },
    include: {
      classAssignment: { include: { class: { include: { students: { orderBy: { name: "asc" }, select: { id: true, name: true, admissionNo: true } } } } } },
      period: true,
      rubric: { include: { criteria: { orderBy: { sequence: "asc" }, include: { levels: { orderBy: { sequence: "asc" } } } } } },
      gradeScale: { include: { bands: { orderBy: { sequence: "asc" } } } },
      nodes: { include: { learningOutcome: true, curriculumNode: { include: { competencies: { include: { competency: true } } } } } },
      components: { orderBy: { sequence: "asc" } },
    },
  })
  if (!plan) redirect("/dashboard/teacher/assessment-plans")
  const access = await canAccessClass(session, plan.classAssignment.classId)
  if (!access.ok) redirect("/dashboard/teacher/assessment-plans")
  if (session.user.role === "TEACHER" && plan.status !== "OPEN") return <div className="rounded-[28px] bg-[#fff4c4] p-10 text-sm font-semibold text-[#746019]">This plan is not open for evidence entry. Move it to <strong>OPEN</strong> from the assessment-plan register first.<div className="mt-4"><Link href="/dashboard/teacher/assessment-plans" className="font-bold underline">Back to assessment plans</Link></div></div>
  const outcomes = plan.nodes.flatMap((node) => node.learningOutcome ? [node.learningOutcome] : [])
  const competencies = [...new Map(plan.nodes.flatMap((node) => node.curriculumNode?.competencies.map((link) => link.competency) || []).map((competency) => [competency.id, competency])).values()]
  return <div className="space-y-7"><div><Link href="/dashboard/teacher/assessment-plans" className="text-xs font-bold text-[#9a3d76]">← Assessment plans</Link><p className="mt-6 text-[11px] font-bold uppercase tracking-[.2em] text-[#9a3d76]">Evidence entry · {plan.period.name}</p><h1 className="mt-2 text-4xl font-medium tracking-[-.05em] text-[#1c1c1e]">{plan.title}</h1><p className="mt-3 text-sm text-[#6b6f7e]">{plan.classAssignment.class.name} · {formatGrade(plan.classAssignment.class.grade)} · {plan.components.length ? `${plan.components[0].name} / ${plan.components[0].maxScore ?? "graded"}` : "Performance evidence"}</p></div><PlanEvidenceEntryForm assessmentPlanId={plan.id} students={plan.classAssignment.class.students} componentId={plan.components[0]?.id} maxScore={plan.components[0]?.maxScore ?? undefined} outcomes={outcomes} competencies={competencies} rubric={plan.rubric} gradeBands={plan.gradeScale?.bands || []} /></div>
}
