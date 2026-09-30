import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import PaymentWorkspace from "./PaymentWorkspace"

export default async function FeePaymentsPage() {
  const session = await auth()
  if (!session || !["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(session.user.role || "")) redirect("/dashboard")
  const schoolWhere = session.user.role === "SCHOOL_ADMIN" && session.user.schoolId ? { schoolId: session.user.schoolId } : {}
  const [structures, students, payments] = await Promise.all([
    prisma.feeStructure.findMany({ where: schoolWhere, select: { id: true, classId: true, term: true, academicYear: true, totalAmount: true, class: { select: { name: true } } }, orderBy: [{ academicYear: "desc" }, { term: "desc" }] }),
    prisma.student.findMany({ where: schoolWhere, select: { id: true, name: true, admissionNo: true, classId: true, class: { select: { name: true } } }, orderBy: { name: "asc" } }),
    prisma.feePayment.findMany({ where: { feeStructure: schoolWhere }, include: { student: { select: { name: true, admissionNo: true, class: { select: { name: true } } } }, feeStructure: { select: { term: true, academicYear: true, class: { select: { name: true } } } } }, orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }], take: 30 }),
  ])
  const completed = payments.filter((payment) => payment.status === "COMPLETED").reduce((sum, payment) => sum + payment.amountPaid, 0)
  return <div className="space-y-10 animate-fade-in"><section className="flex flex-col justify-between gap-6 border-b border-[#e0e2e8] pb-8 sm:flex-row sm:items-end"><div><Link href="/dashboard/fees" className="text-xs font-medium text-[#4262ff]">← Fees</Link><p className="mb-4 mt-5 text-[11px] font-semibold uppercase tracking-[.2em] text-[#187574]">Money & accountability</p><h1 className="text-4xl font-medium tracking-[-.055em] text-[#1c1c1e] sm:text-5xl">Record payments.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b6f7e]">Capture school collections against the right learner and fee plan, with a receipt trail ready for reconciliation.</p></div><Link href="/dashboard/fees/reports" className="miro-pill inline-flex items-center justify-center border border-[#c7cad5] px-5 py-3 text-sm font-medium text-[#1c1c1e]">View collection report →</Link></section><section className="grid gap-3 sm:grid-cols-3"><div className="rounded-[20px] bg-[#c3faf5] p-5"><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#187574]">Collected here</p><p className="mt-4 font-mono text-3xl font-medium text-[#187574]">KES {completed.toLocaleString()}</p><p className="mt-2 text-xs text-[#555a6a]">From the latest 30 records</p></div><div className="rounded-[20px] bg-[#e7edff] p-5"><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#4262ff]">Fee plans</p><p className="mt-4 font-mono text-4xl font-medium text-[#4262ff]">{structures.length}</p><p className="mt-2 text-xs text-[#555a6a]">Available for collection</p></div><div className="rounded-[20px] bg-[#fff4c4] p-5"><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#746019]">Learners</p><p className="mt-4 font-mono text-4xl font-medium text-[#746019]">{students.length}</p><p className="mt-2 text-xs text-[#555a6a]">Eligible school records</p></div></section><PaymentWorkspace structures={structures} students={students} initialPayments={payments.map((payment) => ({ ...payment, paymentDate: payment.paymentDate.toISOString() }))} /></div>
}
