"use client"

import { useState, useEffect } from "react"
import Papa from "papaparse"
import { readSheet } from "read-excel-file/browser"

interface ParsedScore {
  admissionNo: string
  score: number
}

interface Assessment {
  id: string
  title: string
  class: {
    name: string
  }
  subject: {
    name: string
  }
  maxScore: number
}

interface Props {
  schoolId: string
  onUploadComplete: () => void
}

export default function AssessmentBulkUpload({ schoolId, onUploadComplete }: Props) {
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [selectedAssessment, setSelectedAssessment] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [preview, setPreview] = useState<ParsedScore[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [rowCount, setRowCount] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [loadingAssessments, setLoadingAssessments] = useState(true)

  useEffect(() => {
    fetchAssessments()
  }, [schoolId])

  const fetchAssessments = async () => {
    setLoadingAssessments(true)
    try {
      const res = await fetch(`/api/assessments?schoolId=${schoolId}`)
      if (res.ok) {
        const data = await res.json()
        setAssessments(data)
      }
    } catch (err) {
      console.error("Failed to fetch assessments", err)
    } finally {
      setLoadingAssessments(false)
    }
  }

  const loadFile = async (selectedFile?: File) => {
    if (!selectedFile) return

    setFile(selectedFile)
    setError("")
    setSuccess("")
    setPreview([])
    setRowCount(0)
    setShowPreview(false)

    try {
      const data = await parseFile(selectedFile)
      setRowCount(data.length)
      setPreview(data.slice(0, 5))
      setShowPreview(true)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    void loadFile(e.target.files?.[0])
    e.target.value = ""
  }

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setIsDragging(false)
    void loadFile(event.dataTransfer.files[0])
  }

  const parseFile = async (file: File): Promise<ParsedScore[]> => {
    return new Promise((resolve, reject) => {
      const fileType = file.name.split('.').pop()?.toLowerCase()

      if (fileType === 'csv') {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            try {
              const scores = results.data.map((row: any) => ({
                admissionNo: row.admissionNo || row['Admission No'] || row.admission_no || "",
                score: parseFloat(row.score || row.Score || row.SCORE || "0")
              }))
              resolve(scores)
            } catch (err: any) {
              reject(new Error("Invalid CSV format"))
            }
          },
          error: (error) => {
            reject(new Error("Failed to parse CSV: " + error.message))
          }
        })
      } else if (fileType === 'xlsx') {
        readSheet(file).then((rows) => {
          const headers = (rows[0] || []).map((header) => String(header || "").trim())
          const jsonData = rows.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index]])))
          const scores = jsonData.map((row) => ({
            admissionNo: String(row.admissionNo || row['Admission No'] || row.admission_no || ""),
            score: parseFloat(String(row.score || row.Score || row.SCORE || "0"))
          }))
          resolve(scores)
        }).catch(() => reject(new Error("Failed to parse XLSX file")))
      } else {
        reject(new Error("Unsupported file type. Please use CSV or Excel (.xlsx)"))
      }
    })
  }

  const handleUpload = async () => {
    if (!file || !selectedAssessment) return

    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const scores = await parseFile(file)
      const assessment = assessments.find(a => a.id === selectedAssessment)

      if (!assessment) throw new Error("Assessment not found")

      // Validate scores
      const errors: string[] = []
      scores.forEach((score, index) => {
        if (!score.admissionNo) errors.push(`Row ${index + 1}: Missing admission number`)
        if (isNaN(score.score)) errors.push(`Row ${index + 1}: Invalid score`)
        if (score.score < 0 || score.score > assessment.maxScore) {
          errors.push(`Row ${index + 1}: Score must be between 0 and ${assessment.maxScore}`)
        }
      })

      if (errors.length > 0) {
        throw new Error("Validation errors:\n" + errors.slice(0, 5).join("\n"))
      }

      // Upload to server
      const response = await fetch("/api/assessments/bulk-scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentId: selectedAssessment,
          schoolId,
          scores
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Upload failed")
      }

      setSuccess(`✓ Successfully imported ${result.created} score(s)!`)
      setFile(null)
      setShowPreview(false)
      setRowCount(0)
      
      setTimeout(() => {
        onUploadComplete()
      }, 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const downloadTemplate = () => {
    const template = [
      { admissionNo: "2024001", score: 85 },
      { admissionNo: "2024002", score: 92 },
      { admissionNo: "2024003", score: 78 }
    ]

    const csv = Papa.unparse(template)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'assessment_scores_template.csv'
    a.click()
  }

  return (
    <section className="rounded-2xl border border-[#e0e2e8] bg-white p-5 shadow-[0_8px_30px_rgba(28,28,30,.04)] sm:p-7">
      <div className="flex flex-col gap-4 border-b border-[#eef0f3] pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#8e91a0]">Assessment results</p>
          <h2 className="mt-1 text-lg font-semibold text-[#1c1c1e]">Import scores</h2>
          <p className="mt-1 text-sm text-[#6b6f7e]">Add score records to an existing assessment.</p>
        </div>
        <button
          type="button"
          onClick={downloadTemplate}
          className="min-h-10 inline-flex w-fit items-center gap-2 rounded-lg border border-[#c7dcd7] bg-white px-3 text-sm font-semibold text-[#176f69] transition hover:bg-[#f2faf8]"
        >
          <span aria-hidden="true">↓</span> Download template
        </button>
      </div>

      <div className="mt-5 max-w-2xl">
        <label className="mb-2 block text-xs font-semibold text-[#4f5664]" htmlFor="bulk-assessment">Assessment <span className="text-[#c83b46">*</span></label>
        <select
          id="bulk-assessment"
          value={selectedAssessment}
          onChange={(e) => setSelectedAssessment(e.target.value)}
          disabled={loadingAssessments || assessments.length === 0}
          className="min-h-11 w-full rounded-lg border border-[#c7cad5] bg-white px-3 text-sm text-[#1c1c1e] outline-none focus:border-[#187574] focus:ring-3 focus:ring-[#187574]/10 disabled:bg-[#f5f6f7] disabled:text-[#8e91a0]"
        >
          <option value="">{loadingAssessments ? "Loading assessments…" : assessments.length ? "Choose an assessment" : "No assessments available"}</option>
          {assessments.map((assessment) => (
            <option key={assessment.id} value={assessment.id}>
              {assessment.title} - {assessment.class.name} - {assessment.subject.name} (Max: {assessment.maxScore})
            </option>
          ))}
        </select>
      </div>

      {!loadingAssessments && assessments.length === 0 && <div role="status" className="mt-4 rounded-lg border border-[#e6dfc7] bg-[#fffbeb] px-4 py-3 text-sm text-[#746019]">Create an assessment and add learners before importing scores.</div>}

      {selectedAssessment && (
        <>
          <div className="mt-5">
            <label className="mb-2 block text-xs font-semibold text-[#4f5664]">Choose a file <span className="text-[#c83b46">*</span></label>
            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFileChange}
              className="sr-only"
              id="scores-file-upload"
            />
            <label htmlFor="scores-file-upload" onDragOver={(event) => { event.preventDefault(); setIsDragging(true) }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop} className={`flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-5 py-6 text-center transition ${isDragging ? "border-[#187574] bg-[#eff9f6]" : "border-[#b8c9c5] bg-[#fafcfb] hover:border-[#187574] hover:bg-[#f5faf8]"}`}>
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#e5f7f3] text-lg font-semibold text-[#187574]">↑</span>
              <span className="mt-3 text-sm font-semibold text-[#273333]">{file ? file.name : "Drop a file here or browse"}</span>
              <span className="mt-1 text-xs text-[#8e91a0]">CSV or XLSX · maximum 10 MB</span>
            </label>
          </div>

          <div className="mt-5 rounded-lg border border-[#e0e2e8] bg-[#fafbfc] p-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-[#4f5664]">Required columns</h3>
            <div className="mt-3 flex flex-wrap gap-2"><code className="rounded-md border border-[#e0e2e8] bg-white px-2 py-1 text-xs font-semibold text-[#335452]">admissionNo</code><code className="rounded-md border border-[#e0e2e8] bg-white px-2 py-1 text-xs font-semibold text-[#335452]">score</code></div>
            <p className="mt-3 text-xs leading-5 text-[#6b6f7e]">Scores must be between 0 and {assessments.find(a => a.id === selectedAssessment)?.maxScore || 100}. Learners must already belong to this school.</p>
          </div>

          {showPreview && preview.length > 0 && (
            <div className="mt-5 overflow-hidden rounded-xl border border-[#e0e2e8]">
              <div className="flex flex-col gap-1 border-b border-[#e0e2e8] bg-[#fafbfc] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><h3 className="text-sm font-semibold text-[#1c1c1e]">Preview</h3><span className="text-xs text-[#6b6f7e]">Showing {preview.length} of {rowCount} rows</span></div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#e8ebee]">
                  <thead className="bg-white"><tr><th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-[#8e91a0]">Admission no.</th><th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-[#8e91a0]">Score</th></tr></thead>
                  <tbody className="divide-y divide-[#eef0f3] bg-white">{preview.map((score, idx) => <tr key={`${score.admissionNo}-${idx}`} className="hover:bg-[#fafcfb]"><td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-[#273333]">{score.admissionNo || <span className="text-[#b34b52">Missing</span>}</td><td className="whitespace-nowrap px-4 py-3 text-sm text-[#4f5664]">{Number.isNaN(score.score) ? <span className="text-[#b34b52">Invalid</span> : score.score}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
          )}

          {error && <div role="alert" className="mt-5 whitespace-pre-line rounded-lg border border-[#f0b7bb] bg-[#fff5f5] px-4 py-3 text-sm text-[#9b3030]">{error}</div>}
          {success && <div role="status" className="mt-5 rounded-lg border border-[#b7e1d9] bg-[#eaf8f5] px-4 py-3 text-sm font-medium text-[#17645f]">{success}</div>}

          {file && showPreview && (
            <div className="mt-5 flex flex-col gap-3 border-t border-[#eef0f3] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-[#6b6f7e]">Review the sample rows before importing all {rowCount} scores.</p>
              <button type="button" onClick={handleUpload} disabled={loading} className="min-h-11 w-full rounded-lg bg-[#176f69] px-5 text-sm font-semibold text-white transition hover:bg-[#125e59] disabled:cursor-wait disabled:opacity-60 sm:w-auto">
                {loading ? "Importing…" : `Import ${rowCount} scores`}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
