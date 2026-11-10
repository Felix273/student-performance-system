"use client"

import { useState } from "react"

type Payment = {
  id: string
  receiptNumber: string
  amountPaid: number
  paymentDate: string
  paymentMethod: string
  transactionId?: string | null
  paidBy?: string | null
  collectedBy?: string | null
  remarks?: string | null
  feeStructure: { term: string; academicYear: string; class: { name: string } }
}

type School = {
  id: string
  name: string
  logoUrl?: string | null
  county?: string | null
  contactPhone?: string | null
  contactEmail?: string | null
}

type Student = {
  id: string
  name: string
  admissionNo: string
  class: { name: string }
}

type FeeStructure = {
  totalAmount: number
  academicYear: string
  term: string
  dueDate: Date | string
} | null

export default function ParentReceiptsClient({
  school,
  student,
  currentFeeStructure,
  payments,
}: {
  school: School
  student: Student
  currentFeeStructure: FeeStructure
  payments: Payment[]
}) {
  const [activeReceipt, setActiveReceipt] = useState<Payment | null>(null)

  const totalPaid = payments.reduce((sum, p) => sum + p.amountPaid, 0)
  const totalInvoiced = currentFeeStructure?.totalAmount || 0
  const outstanding = Math.max(0, totalInvoiced - totalPaid)
  const isCleared = currentFeeStructure && outstanding === 0

  const printReceipt = () => {
    window.print()
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
          body * {
            visibility: hidden !important;
          }
          #parent-receipt-modal,
          #parent-receipt-modal * {
            visibility: visible !important;
          }
          #parent-receipt-modal {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
          }
          #parent-receipt-card {
            max-width: 620px !important;
            margin: 0 auto !important;
            padding: 24px !important;
            border: 1.5px solid #1c1c1e !important;
            border-radius: 16px !important;
            background: white !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Fee Statement & Official Receipts</h3>
            <p className="text-xs text-gray-500">Official fees billed and verified payment records for {student.name}.</p>
          </div>
          {currentFeeStructure && (
            <div className="self-start sm:self-auto">
              {isCleared ? (
                <span className="miro-pill bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                  Fees Cleared ✓
                </span>
              ) : (
                <span className="miro-pill bg-red-100 px-3 py-1 text-xs font-bold text-red-800">
                  Balance: KES {outstanding.toLocaleString()}
                </span>
              )}
            </div>
          )}
        </div>

        {currentFeeStructure ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-gray-50 p-4">
              <span className="text-xs text-gray-500 uppercase font-semibold">Total Invoiced</span>
              <p className="text-2xl font-bold text-gray-900 mt-1">KES {currentFeeStructure.totalAmount.toLocaleString()}</p>
              <p className="text-[11px] text-gray-500 mt-1">
                {currentFeeStructure.academicYear} · {currentFeeStructure.term}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-4">
              <span className="text-xs text-emerald-700 uppercase font-semibold">Total Paid</span>
              <p className="text-2xl font-bold text-emerald-800 mt-1">KES {totalPaid.toLocaleString()}</p>
              <p className="text-[11px] text-emerald-600 mt-1">{payments.length} verified payment(s)</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-4">
              <span className="text-xs text-amber-700 uppercase font-semibold">Outstanding Balance</span>
              <p className="text-2xl font-bold text-amber-900 mt-1">KES {outstanding.toLocaleString()}</p>
              <p className="text-[11px] text-amber-700 mt-1">
                Due Date: {new Date(currentFeeStructure.dueDate).toLocaleDateString()}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-xs text-gray-500">No active fee structure published for this class yet.</p>
        )}

        {/* Payment Receipts History */}
        {payments.length > 0 && (
          <div className="mt-6 border-t border-gray-100 pt-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
              Payment Receipts History ({payments.length})
            </h4>
            <div className="divide-y divide-gray-100 text-xs">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-3 hover:bg-slate-50 transition px-2 rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{p.receiptNumber}</span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                        {p.paymentMethod.replace(/_/g, " ")}
                      </span>
                      {p.transactionId && (
                        <span className="font-mono text-[11px] text-slate-400">({p.transactionId})</span>
                      )}
                    </div>
                    <span className="block text-[11px] text-slate-400 mt-0.5">
                      {new Date(p.paymentDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-emerald-700">
                      KES {p.amountPaid.toLocaleString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveReceipt(p)}
                      className="rounded-lg border border-[#e0e2e8] bg-white px-2.5 py-1 text-xs font-semibold text-[#1c1c1e] hover:bg-[#f7f8fa]"
                    >
                      View Receipt 🧾
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Printable Receipt Modal */}
      {activeReceipt && (
        <div
          id="parent-receipt-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:static print:p-0 print:bg-transparent"
        >
          <div
            id="parent-receipt-card"
            className="w-full max-w-lg rounded-[24px] bg-white p-6 sm:p-7 shadow-2xl animate-fade-in max-h-[95vh] overflow-y-auto print:max-h-none print:shadow-none print:border-none print:p-0"
          >
            {/* Modal Controls */}
            <div className="flex items-center justify-between border-b border-[#e0e2e8] pb-3 print:hidden">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8e91a0]">
                Official School Receipt
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

            {/* Receipt Printable Card Area */}
            <div className="mt-4 border border-[#e0e2e8] p-5 sm:p-6 rounded-2xl bg-[#fafcfb] print:border-none print:p-0">
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3">
                <div>
                  <h1 className="text-lg font-black uppercase tracking-tight text-slate-900">
                    {school.name}
                  </h1>
                  {school.county && <p className="text-xs text-slate-600">{school.county} County, Kenya</p>}
                  {school.contactPhone && <p className="text-[11px] text-slate-500">Tel: {school.contactPhone}</p>}
                </div>
                {school.logoUrl && (
                  <div className="h-12 w-12 overflow-hidden rounded-xl bg-white p-1 border border-slate-200 shrink-0">
                    <img src={school.logoUrl} alt="Logo" className="h-full w-full object-contain" />
                  </div>
                )}
              </div>

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

              <div className="mt-3 rounded-xl bg-white p-3.5 border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Learner Name:</span>
                  <strong className="text-slate-900 font-bold">{student.name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Admission No:</span>
                  <span className="font-mono font-semibold">{student.admissionNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Class / Stream:</span>
                  <span className="font-medium text-slate-800">{student.class.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Academic Term:</span>
                  <span className="font-medium text-slate-800">
                    {activeReceipt.feeStructure?.term} · {activeReceipt.feeStructure?.academicYear}
                  </span>
                </div>
              </div>

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
              </div>

              <div className="mt-5 border-t border-dashed border-slate-300 pt-3 text-[11px] text-slate-500 flex justify-between items-end">
                <div>
                  <p>Issued By: {activeReceipt.collectedBy || "School Accounts Office"}</p>
                  <p className="mt-0.5 text-[9px] text-slate-400">Official Computer-Generated Receipt.</p>
                </div>
                <div className="text-center">
                  <div className="w-24 border-b border-slate-400 mb-1" />
                  <span className="text-[10px] text-slate-400">Authorized Stamp</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
