import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"

export default async function FeeStructureDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || !["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(session.user.role || "")) redirect("/dashboard")
  const { id } = await params
  const structure = await prisma.feeStructure.findFirst({
    where: {
      id,
      ...(session.user.role === "SCHOOL_ADMIN" && session.user.schoolId ? { schoolId: session.user.schoolId } : {}),
    },
    include: {
      class: { select: { id: true, name: true, grade: true } },
      school: { select: { id: true, name: true } },
      payments: {
        include: { student: { select: { id: true, name: true, admissionNo: true } } },
        orderBy: { paymentDate: "desc" },
      },
    },
  })
  if (!structure) notFound()

  const completedPayments = structure.payments.filter((payment) => payment.status === "COMPLETED")
  const totalPaid = completedPayments.reduce((sum, payment) => sum + payment.amountPaid, 0)
  const outstanding = Math.max(structure.totalAmount - totalPaid, 0)

  return <div className="space-y-8 animate-fade-in">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><Link href="/dashboard/fees/structures" className="text-xs font-bold text-blue-600 hover:text-blue-800">← Fee structures</Link><p className="mt-5 text-xs font-bold uppercase tracking-[.16em] text-emerald-600">Fee management</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{structure.class.name} fees</h1><p className="mt-2 text-sm font-medium text-slate-500">{structure.term} · {structure.academicYear}{session.user.role === "SUPER_ADMIN" ? ` · ${structure.school.name}` : ""}</p></div><Link href="/dashboard/fees" className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700">Back to fees</Link>
    </div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Total due</p><p className="mt-2 text-3xl font-black text-slate-950">KES {structure.totalAmount.toLocaleString()}</p></div><div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Collected</p><p className="mt-2 text-3xl font-black text-emerald-600">KES {totalPaid.toLocaleString()}</p></div><div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Outstanding</p><p className="mt-2 text-3xl font-black text-amber-600">KES {outstanding.toLocaleString()}</p></div></div>
    <div className="grid gap-6 xl:grid-cols-[.85fr_1.5fr]"><section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_rgb(15,23,42,0.04)]"><div className="mb-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">Structure breakdown</p><h2 className="mt-1 text-xl font-black text-slate-950">What students owe</h2></div><div className="space-y-3">{[["Tuition", structure.tuitionFee], ["Laboratory", structure.labFee], ["Library", structure.libraryFee], ["Sports", structure.sportsFee], ["Exams", structure.examFee], ["Other fees", structure.otherFees]].map(([label, amount]) => <div key={String(label)} className="flex items-center justify-between border-b border-slate-100 pb-3 text-sm"><span className="font-semibold text-slate-500">{label}</span><span className="font-bold text-slate-950">KES {Number(amount).toLocaleString()}</span></div>)}<div className="flex items-center justify-between pt-2"><span className="font-black text-slate-950">Total</span><span className="font-black text-blue-600">KES {structure.totalAmount.toLocaleString()}</span></div></div><div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm"><p className="font-bold text-slate-700">Due date</p><p className="mt-1 font-medium text-slate-500">{new Date(structure.dueDate).toLocaleDateString(undefined, { dateStyle: "long" })}</p></div></section><section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgb(15,23,42,0.04)]"><div className="flex items-center justify-between border-b border-slate-100 px-6 py-5"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">Payment activity</p><h2 className="mt-1 text-xl font-black text-slate-950">Recent payments</h2></div><span className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700">{completedPayments.length} completed</span></div>{structure.payments.length ? <div className="overflow-x-auto"><table className="min-w-[620px] w-full"><thead className="bg-slate-50/80"><tr>{["Student", "Amount", "Date", "Method", "Status"].map((heading) => <th key={heading} className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-[.12em] text-slate-400">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{structure.payments.map((payment) => <tr key={payment.id} className="hover:bg-slate-50"><td className="px-6 py-4"><p className="text-sm font-bold text-slate-950">{payment.student.name}</p><p className="text-xs font-medium text-slate-400">{payment.student.admissionNo}</p></td><td className="px-6 py-4 text-sm font-bold text-slate-950">KES {payment.amountPaid.toLocaleString()}</td><td className="px-6 py-4 text-sm font-medium text-slate-500">{new Date(payment.paymentDate).toLocaleDateString()}</td><td className="px-6 py-4 text-xs font-bold text-slate-600">{payment.paymentMethod.replaceAll("_", " ")}</td><td className="px-6 py-4"><span className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${payment.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{payment.status}</span></td></tr>)}</tbody></table></div> : <div className="px-6 py-16 text-center"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-500">$</div><h3 className="font-black text-slate-950">No payments yet</h3><p className="mt-1 text-sm font-medium text-slate-500">Payments recorded against this structure will appear here.</p></div>}</section></div>
  </div>
}
