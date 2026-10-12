"use client"

import { useState } from "react"

interface ReportPeriod {
  id: string
  name: string
  code: string
  academicYear: { name: string }
}

export default function CbcTermReportDownload({ studentId, periods }: { studentId: string; periods: ReportPeriod[] }) {
  const [periodId, setPeriodId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const download = async () => {
    if (!periodId) return
    setLoading(true)
    setError("")
    try {
      const query = new URLSearchParams({ studentId, periodId })
      const response = await fetch(`/api/reports/cbc-student-pdf?${query}`)
      if (!response.ok) {
        const result = await response.json().catch(() => null)
        throw new Error(result?.error || "Unable to generate the CBC report.")
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `cbc-term-report-${periodId}.pdf`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate the CBC report.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="border-b border-gray-200 bg-white px-6 py-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">CBC term report</h3>
          <p className="mt-1 text-sm text-gray-600">Download published competency evidence for a term.</p>
        </div>
        {periods.length > 0 ? (
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="text-sm font-medium text-gray-700">
              Academic term
              <select value={periodId} onChange={(event) => setPeriodId(event.target.value)} className="mt-1 block min-w-56 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
                <option value="">Choose a term</option>
                {periods.map((period) => <option key={period.id} value={period.id}>{period.academicYear.name} - {period.name}</option>)}
              </select>
            </label>
            <button type="button" onClick={download} disabled={!periodId || loading} className="inline-flex items-center justify-center rounded-md bg-teal-800 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-50">
              {loading ? "Preparing PDF..." : "Download PDF"}
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-600">No published CBC evidence is available for a term yet.</p>
        )}
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </section>
  )
}