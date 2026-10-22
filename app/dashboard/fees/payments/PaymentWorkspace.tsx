"use client"

import { useMemo, useState } from "react"

type Structure = {
  id: string
  classId: string
  term: string
  academicYear: string
  totalAmount: number
  class: { name: string }
}

type Student = {
  id: string
  name: string
  admissionNo: string
  classId: string
  class: { name: string }
}

type Payment = {
  id: string
  receiptNumber: string
  amountPaid: number
  paymentDate: string
  paymentMethod: string
  status: string
  transactionId?: string | null
  remarks?: string | null
  paidBy?: string
  collectedBy?: string
  student: { name: string; admissionNo: string; class: { name: string } }
  feeStructure: { term: string; academicYear: string; totalAmount: number; class: { name: string } }
}

type SchoolInfo = {
  id: string
  name: string
  logoUrl?: string | null
  county?: string | null
  contactPhone?: string | null
  contactEmail?: string | null
} | null

const METHODS = [
  { id: "MOBILE_MONEY", label: "M-PESA" },
  { id: "CASH", label: "Cash" },
  { id: "BANK_TRANSFER", label: "Bank Transfer / Deposit" },
  { id: "CHEQUE", label: "Cheque" },
  { id: "ONLINE", label: "Online Payment" },
]

export default function PaymentWorkspace({
  school,
  structures,
  students,
  initialPayments,
}: {
  school: SchoolInfo
  structures: Structure[]
  students: Student[]
  initialPayments: Payment[]
}) {
  const [payments, setPayments] = useState(initialPayments)
  const [form, setForm] = useState({
    feeStructureId: structures[0]?.id || "",
    studentId: "",
    amountPaid: "",
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentMethod: "MOBILE_MONEY",
    status: "COMPLETED",
    transactionId: "",
    receiptNumber: "",
    paidBy: "",
    remarks: "",
  })

  const [searchLedger, setSearchLedger] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [activeReceipt, setActiveReceipt] = useState<Payment | null>(null)

  const selectedStructure = structures.find((item) => item.id === form.feeStructureId)
  const eligibleStudents = useMemo(
    () => students.filter((student) => student.classId === selectedStructure?.classId),
    [students, selectedStructure]
  )
  const currentStudent = students.find((student) => student.id === form.studentId)

  // Real-time calculation of student balance
  const studentBalanceInfo = useMemo(() => {
    if (!form.studentId || !form.feeStructureId || !selectedStructure) return null

    const studentPreviousPayments = payments
      .filter((p) => p.status === "COMPLETED")
      .filter((p) => {
        const matchesStudent = p.student?.admissionNo === currentStudent?.admissionNo
        const matchesTerm =
          p.feeStructure?.term === selectedStructure.term &&
          p.feeStructure?.academicYear === selectedStructure.academicYear
        return matchesStudent && matchesTerm
      })

    const alreadyPaid = studentPreviousPayments.reduce((sum, p) => sum + p.amountPaid, 0)
    const totalAmount = selectedStructure.totalAmount
    const remaining = Math.max(totalAmount - alreadyPaid, 0)

    return {
      totalAmount,
      alreadyPaid,
      remaining,
    }
  }, [payments, form.studentId, form.feeStructureId, selectedStructure, currentStudent])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setMessage("")

    try {
      const response = await fetch("/api/fees/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const result = await response.json()
      if (!response.ok) {
        setMessage(result.error || "Unable to record payment")
        setSaving(false)
        return
      }

      setMessage("Payment recorded successfully.")
      const newPayment: Payment = {
        ...result.payment,
        paymentDate: result.payment.paymentDate,
      }
      setPayments((current) => [newPayment, ...current])
      setForm((current) => ({
        ...current,
        studentId: "",
        amountPaid: "",
        transactionId: "",
        receiptNumber: "",
        paidBy: "",
        remarks: "",
      }))
      setActiveReceipt(newPayment)
    } catch {
      setMessage("Error processing payment request.")
    } finally {
      setSaving(false)
    }
  }

  const printReceipt = () => {
    window.print()
  }

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const q = searchLedger.toLowerCase()
      return (
        p.student.name.toLowerCase().includes(q) ||
        p.student.admissionNo.toLowerCase().includes(q) ||
        p.receiptNumber.toLowerCase().includes(q) ||
        (p.transactionId || "").toLowerCase().includes(q)
      )
    })
  }, [payments, searchLedger])

  return (
    <>
      {/* Print Style Injector for 100% Single Page Fit */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
          /* Hide main dashboard layout and background elements */
          body * {
            visibility: hidden !important;
          }
          /* Unhide only the receipt modal and its children */
          #receipt-modal-container,
          #receipt-modal-container * {
            visibility: visible !important;
          }
          #receipt-modal-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
          }
          #receipt-card-wrapper {
            max-width: 620px !important;
            margin: 0 auto !important;
            padding: 24px !important;
            border: 1.5px solid #1c1c1e !important;
            border-radius: 16px !important;
            background: white !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="grid gap-7 xl:grid-cols-[.78fr_1.22fr]">
        {/* 1. Payment Recording Form */}
        <section className="miro-surface p-6 sm:p-8 self-start">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#187574]">
              Payment Entry
            </p>
            <h2 className="mt-1 text-2xl font-medium tracking-tight text-[#1c1c1e]">
              Record a Payment
            </h2>
            <p className="mt-1 text-xs text-[#6b6f7e]">
              Issue receipts against the active fee structure and track live balances.
            </p>
          </div>

          {message && (
            <div
              role="status"
              className="mt-4 rounded-xl bg-[#fff4c4] px-4 py-3 text-xs font-semibold text-[#746019]"
            >
              {message}
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block text-xs font-bold uppercase tracking-wide text-[#6b6f7e]">
              Fee Structure / Term <span className="text-red-500">*</span>
              <select
                required
                className="mt-1.5 w-full rounded-xl border border-[#dfe2e8] bg-white px-3.5 py-2.5 text-xs font-semibold text-[#1c1c1e] outline-none focus:border-[#4262ff]"
                value={form.feeStructureId}
                onChange={(e) => setForm({ ...form, feeStructureId: e.target.value, studentId: "" })}
              >
                <option value="">Select fee structure…</option>
                {structures.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.class.name} · {item.term} {item.academicYear} · KES {item.totalAmount.toLocaleString()}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-bold uppercase tracking-wide text-[#6b6f7e]">
              Learner <span className="text-red-500">*</span>
              <select
                required
                className="mt-1.5 w-full rounded-xl border border-[#dfe2e8] bg-white px-3.5 py-2.5 text-xs font-semibold text-[#1c1c1e] outline-none focus:border-[#4262ff]"
                value={form.studentId}
                onChange={(e) => setForm({ ...form, studentId: e.target.value })}
              >
                <option value="">
                  {selectedStructure ? "Select enrolled learner…" : "Choose a fee structure first"}
                </option>
                {eligibleStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.admissionNo})
                  </option>
                ))}
              </select>
            </label>

            {/* Live Student Balance Indicator Card */}
            {studentBalanceInfo && currentStudent && (
              <div className="rounded-2xl border border-[#b7e1d9] bg-[#eff9f6] p-4 text-xs animate-fade-in">
                <div className="flex items-center justify-between font-bold text-[#187574]">
                  <span>{currentStudent.name}&apos;s Term Balance</span>
                  <span className="font-mono text-sm">
                    {studentBalanceInfo.remaining === 0 ? "✓ CLEARED" : `KES ${studentBalanceInfo.remaining.toLocaleString()}`}
                  </span>
                </div>
                <div className="mt-2.5 grid grid-cols-3 gap-2 border-t border-[#b7e1d9]/60 pt-2 text-[11px] text-[#555a6a]">
                  <div>
                    <span className="block text-slate-400">Total Charge:</span>
                    <strong className="font-mono text-slate-700">
                      KES {studentBalanceInfo.totalAmount.toLocaleString()}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-slate-400">Paid so far:</span>
                    <strong className="font-mono text-emerald-700">
                      KES {studentBalanceInfo.alreadyPaid.toLocaleString()}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-slate-400">Outstanding:</span>
                    <strong className="font-mono text-amber-800">
                      KES {studentBalanceInfo.remaining.toLocaleString()}
                    </strong>
                  </div>
                </div>

                {studentBalanceInfo.remaining > 0 && (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, amountPaid: String(studentBalanceInfo.remaining) })}
                    className="mt-3 rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-[#187574] border border-[#b7e1d9] hover:bg-[#e6f4f0]"
                  >
                    Pay Full Balance (KES {studentBalanceInfo.remaining.toLocaleString()})
                  </button>
                )}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-bold uppercase tracking-wide text-[#6b6f7e]">
                Amount Paid (KES) <span className="text-red-500">*</span>
                <input
                  required
                  min="1"
                  step="0.01"
                  type="number"
                  placeholder="e.g. 5000"
                  className="mt-1.5 w-full rounded-xl border border-[#dfe2e8] px-3.5 py-2.5 font-mono text-sm outline-none focus:border-[#4262ff]"
                  value={form.amountPaid}
                  onChange={(e) => setForm({ ...form, amountPaid: e.target.value })}
                />
              </label>

              <label className="block text-xs font-bold uppercase tracking-wide text-[#6b6f7e]">
                Payment Date <span className="text-red-500">*</span>
                <input
                  required
                  type="date"
                  className="mt-1.5 w-full rounded-xl border border-[#dfe2e8] px-3.5 py-2.5 text-xs outline-none focus:border-[#4262ff]"
                  value={form.paymentDate}
                  onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-bold uppercase tracking-wide text-[#6b6f7e]">
                Payment Method
                <select
                  className="mt-1.5 w-full rounded-xl border border-[#dfe2e8] bg-white px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-[#4262ff]"
                  value={form.paymentMethod}
                  onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                >
                  {METHODS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-bold uppercase tracking-wide text-[#6b6f7e]">
                {form.paymentMethod === "MOBILE_MONEY" ? "M-PESA Reference Code" : "Ref / Bank Slip No."}
                <input
                  className="mt-1.5 w-full rounded-xl border border-[#dfe2e8] px-3.5 py-2.5 font-mono text-xs uppercase outline-none focus:border-[#4262ff]"
                  placeholder={form.paymentMethod === "MOBILE_MONEY" ? "e.g. QGH789KL2" : "e.g. CHQ-00123"}
                  value={form.transactionId}
                  onChange={(e) => setForm({ ...form, transactionId: e.target.value })}
                />
              </label>
            </div>

            <label className="block text-xs font-bold uppercase tracking-wide text-[#6b6f7e]">
              Paid By (Payer Name)
              <input
                className="mt-1.5 w-full rounded-xl border border-[#dfe2e8] px-3.5 py-2.5 text-xs outline-none focus:border-[#4262ff]"
                placeholder="e.g. Mary Wanjiku (Mother)"
                value={form.paidBy}
                onChange={(e) => setForm({ ...form, paidBy: e.target.value })}
              />
            </label>

            <label className="block text-xs font-bold uppercase tracking-wide text-[#6b6f7e]">
              Remarks / Ledger Note
              <textarea
                rows={2}
                className="mt-1.5 w-full rounded-xl border border-[#dfe2e8] px-3.5 py-2 text-xs outline-none focus:border-[#4262ff]"
                placeholder="e.g. Term 1 partial payment"
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              />
            </label>

            <button
              type="submit"
              disabled={saving}
              className="miro-pill w-full bg-[#1c1c1e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2c2c34] disabled:opacity-50"
            >
              {saving ? "Recording…" : "Record Payment & Issue Receipt →"}
            </button>
          </form>
        </section>

        {/* 2. Recent Payments Ledger with Search */}
        <section className="miro-surface overflow-hidden">
          <div className="border-b border-[#eef0f3] p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#8e91a0]">Collection Ledger</p>
                <h2 className="mt-1 text-2xl font-medium tracking-tight text-[#1c1c1e]">Recent Payments</h2>
              </div>
              <span className="miro-pill bg-[#c3faf5] px-3 py-1 text-xs font-semibold text-[#187574]">
                {filteredPayments.length} payments
              </span>
            </div>

            <div className="mt-4">
              <input
                type="search"
                value={searchLedger}
                onChange={(e) => setSearchLedger(e.target.value)}
                placeholder="Search by student, admission no, receipt no, or M-PESA code…"
                className="w-full max-w-md rounded-xl border border-[#e0e2e8] bg-white px-3.5 py-2 text-xs outline-none focus:border-[#4262ff]"
              />
            </div>
          </div>

          {filteredPayments.length === 0 ? (
            <div className="p-12 text-center text-sm text-[#8e91a0]">
              No payments found matching your search.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[760px] w-full divide-y divide-[#eef0f3]">
                <thead className="bg-[#f7f8fa]">
                  <tr>
                    {["Receipt No", "Learner", "Plan / Term", "Amount", "Method", "Date", "Action"].map((heading) => (
                      <th key={heading} className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-[.16em] text-[#8e91a0]">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef0f3]">
                  {filteredPayments.map((p) => (
                    <tr key={p.id} className="transition hover:bg-[#fafbfc]">
                      <td className="px-5 py-4 font-mono text-xs font-bold text-slate-700">
                        {p.receiptNumber}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-bold text-[#1c1c1e]">{p.student.name}</p>
                        <p className="text-xs text-[#8e91a0] font-mono">{p.student.admissionNo}</p>
                      </td>
                      <td className="px-5 py-4 text-xs text-[#555a6a]">
                        <span className="font-semibold text-[#1c1c1e]">{p.feeStructure?.class.name}</span>
                        <span className="block text-[11px] text-slate-400">
                          {p.feeStructure?.term} {p.feeStructure?.academicYear}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono text-sm font-bold text-[#187574]">
                        KES {p.amountPaid.toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-xs text-[#555a6a]">
                        <span className="font-medium">{p.paymentMethod.replace(/_/g, " ")}</span>
                        {p.transactionId && (
                          <span className="block font-mono text-[10px] text-slate-400">{p.transactionId}</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs text-[#6b6f7e]">
                        {new Date(p.paymentDate).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => setActiveReceipt(p)}
                          className="rounded-lg border border-[#e0e2e8] bg-white px-2.5 py-1 text-xs font-semibold text-[#1c1c1e] hover:bg-[#f7f8fa]"
                        >
                          Receipt 🧾
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* 3. Printable Official Receipt Modal */}
        {activeReceipt && (
          <div
            id="receipt-modal-container"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:static print:p-0 print:bg-transparent"
          >
            <div
              id="receipt-card-wrapper"
              className="w-full max-w-lg rounded-[24px] bg-white p-6 sm:p-7 shadow-2xl animate-fade-in max-h-[95vh] overflow-y-auto print:max-h-none print:shadow-none print:border-none print:p-0"
            >
              {/* Controls bar (Hidden during Print) */}
              <div className="flex items-center justify-between border-b border-[#e0e2e8] pb-3 print:hidden">
                <span className="text-xs font-bold uppercase tracking-wider text-[#8e91a0]">
                  Official Fee Receipt
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={printReceipt}
                    className="miro-pill bg-[#1c1c1e] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#2c2c34]"
                  >
                    Print Receipt 🖨️
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveReceipt(null)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Close ✕
                  </button>
                </div>
              </div>

              {/* Receipt Body */}
              <div className="mt-4 border border-[#e0e2e8] p-5 sm:p-6 rounded-2xl bg-[#fafcfb] print:border-none print:p-0">
                {/* Header: School Name, County & Logo */}
                <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3">
                  <div>
                    <h1 className="text-lg font-black uppercase tracking-tight text-slate-900">
                      {school?.name || "School Fee Receipt"}
                    </h1>
                    {school?.county && (
                      <p className="text-xs text-slate-600">{school.county} County, Kenya</p>
                    )}
                    {school?.contactPhone && (
                      <p className="text-[11px] text-slate-500">Tel: {school.contactPhone}</p>
                    )}
                  </div>
                  {school?.logoUrl && (
                    <div className="h-12 w-12 overflow-hidden rounded-xl bg-white p-1 border border-slate-200 shrink-0">
                      <img src={school.logoUrl} alt="Logo" className="h-full w-full object-contain" />
                    </div>
                  )}
                </div>

                {/* Subheader: Receipt Number & Date */}
                <div className="mt-3 flex items-center justify-between text-xs border-b border-slate-200 pb-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">RECEIPT NUMBER:</span>
                    <p className="font-mono font-bold text-sm text-slate-900">{activeReceipt.receiptNumber}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400">DATE:</span>
                    <p className="font-semibold text-slate-900">
                      {new Date(activeReceipt.paymentDate).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                {/* Learner & Class Box */}
                <div className="mt-3 rounded-xl bg-white p-3.5 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Learner Name:</span>
                    <strong className="text-slate-900 font-bold">{activeReceipt.student.name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Admission No:</span>
                    <span className="font-mono font-semibold">{activeReceipt.student.admissionNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Class / Stream:</span>
                    <span className="font-medium text-slate-800">{activeReceipt.feeStructure?.class.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Academic Term:</span>
                    <span className="font-medium text-slate-800">
                      {activeReceipt.feeStructure?.term} · {activeReceipt.feeStructure?.academicYear}
                    </span>
                  </div>
                  {activeReceipt.paidBy && (
                    <div className="flex justify-between border-t border-slate-100 pt-1 text-[11px]">
                      <span className="text-slate-500">Paid By:</span>
                      <span className="font-semibold text-slate-700">{activeReceipt.paidBy}</span>
                    </div>
                  )}
                </div>

                {/* Amount Paid Box */}
                <div className="mt-3 border-t border-slate-200 pt-3 text-xs space-y-2">
                  <div className="flex justify-between items-center text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">
                    <span>Payment Amount</span>
                    <span className="font-mono text-base font-bold text-[#187574]">
                      KES {activeReceipt.amountPaid.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600 text-xs">
                    <span>Payment Channel:</span>
                    <span className="font-semibold text-slate-800">
                      {activeReceipt.paymentMethod.replace(/_/g, " ")}
                    </span>
                  </div>
                  {activeReceipt.transactionId && (
                    <div className="flex justify-between text-slate-600 text-xs">
                      <span>M-PESA / Ref Code:</span>
                      <span className="font-mono font-bold text-slate-900">{activeReceipt.transactionId}</span>
                    </div>
                  )}
                  {activeReceipt.remarks && (
                    <div className="flex justify-between text-slate-600 text-xs">
                      <span>Remarks:</span>
                      <span className="italic">{activeReceipt.remarks}</span>
                    </div>
                  )}
                </div>

                {/* Footer Stamp & Sign */}
                <div className="mt-5 border-t border-dashed border-slate-300 pt-3 text-[11px] text-slate-500 flex justify-between items-end">
                  <div>
                    <p>Collected By: {activeReceipt.collectedBy || "Accounts Office"}</p>
                    <p className="mt-0.5 text-[9px] text-slate-400">Computer-generated official school receipt.</p>
                  </div>
                  <div className="text-center">
                    <div className="w-28 border-b border-slate-400 mb-1" />
                    <span className="text-[10px] text-slate-400">Authorized Stamp</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
