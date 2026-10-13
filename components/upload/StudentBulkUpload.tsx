"use client"

import { useState } from "react"
import Papa from "papaparse"
import { readSheet } from "read-excel-file/browser"

interface ParsedStudent {
  name: string
  admissionNo: string
  className: string
  grade: string
}

interface Props {
  schoolId: string
  onUploadComplete: () => void
}

export default function StudentBulkUpload({ schoolId, onUploadComplete }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [preview, setPreview] = useState<ParsedStudent[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [rowCount, setRowCount] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const loadFile = async (selectedFile?: File) => {
    if (!selectedFile) return

    setFile(selectedFile)
    setError("")
    setSuccess("")
    setPreview([])
    setShowPreview(false)
    setRowCount(0)

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

  const parseFile = async (file: File): Promise<ParsedStudent[]> => {
    return new Promise((resolve, reject) => {
      const fileType = file.name.split('.').pop()?.toLowerCase()

      if (fileType === 'csv') {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            try {
              const students = results.data.map((row: any) => ({
                name: String(row.name || row.Name || row.NAME || ""),
                admissionNo: String(row.admissionNo || row['Admission No'] || row.admission_no || ""),
                className: String(row.className || row['Class Name'] || row.class || ""),
                grade: String(row.grade || row.Grade || row.GRADE || "")
              }))
              resolve(students)
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
          const students = jsonData.map((row) => ({
            name: String(row.name || row.Name || row.NAME || ""),
            admissionNo: String(row.admissionNo || row['Admission No'] || row.admission_no || ""),
            className: String(row.className || row['Class Name'] || row.class || ""),
            grade: String(row.grade || row.Grade || row.GRADE || "")
          }))
          resolve(students)
        }).catch(() => reject(new Error("Failed to parse XLSX file")))
      } else {
        reject(new Error("Unsupported file type. Please use CSV or Excel (.xlsx)"))
      }
    })
  }

  const handleUpload = async () => {
    if (!file) return

    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const students = await parseFile(file)

      // Validate data
      const errors: string[] = []
      students.forEach((student, index) => {
        if (!student.name) errors.push(`Row ${index + 1}: Missing name`)
        if (!student.admissionNo) errors.push(`Row ${index + 1}: Missing admission number`)
        if (!student.className) errors.push(`Row ${index + 1}: Missing class name`)
        if (!student.grade) errors.push(`Row ${index + 1}: Missing grade`)
      })

      if (errors.length > 0) {
        throw new Error("Validation errors:\n" + errors.slice(0, 5).join("\n") + (errors.length > 5 ? `\n...and ${errors.length - 5} more` : ""))
      }

      // Upload to server
      const response = await fetch("/api/students/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          students
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Upload failed")
      }

      setSuccess(`✓ Successfully imported ${result.created} student(s)! ${result.updated > 0 ? `Updated ${result.updated} existing student(s).` : ''}`)
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
      { name: "John Doe", admissionNo: "2024001", className: "Grade 10A", grade: "10" },
      { name: "Jane Smith", admissionNo: "2024002", className: "Grade 10A", grade: "10" },
      { name: "Bob Johnson", admissionNo: "2024003", className: "Grade 9B", grade: "9" }
    ]

    const csv = Papa.unparse(template)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'students_template.csv'
    a.click()
  }

  return (
    <section className="rounded-2xl border border-[#e0e2e8] bg-white p-5 shadow-[0_8px_30px_rgba(28,28,30,.04)] sm:p-7">
      <div className="flex flex-col gap-4 border-b border-[#eef0f3] pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#8e91a0]">Learner records</p>
          <h2 className="mt-1 text-lg font-semibold text-[#1c1c1e]">Import learners</h2>
          <p className="mt-1 text-sm text-[#6b6f7e]">Add or update learners from a CSV or Excel workbook.</p>
        </div>
        <button
          type="button"
          onClick={downloadTemplate}
          className="min-h-10 inline-flex w-fit items-center gap-2 rounded-lg border border-[#c7dcd7] bg-white px-3 text-sm font-semibold text-[#176f69] transition hover:bg-[#f2faf8]"
        >
          <span aria-hidden="true">↓</span> Download template
        </button>
      </div>

      <div className="mt-5">
        <label className="mb-2 block text-xs font-semibold text-[#4f5664]">Choose a file <span className="text-[#c83b46">*</span></label>
        <input
          type="file"
          accept=".csv,.xlsx"
          onChange={handleFileChange}
          className="sr-only"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          onDragOver={(event) => { event.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-5 py-6 text-center transition ${isDragging ? "border-[#187574] bg-[#eff9f6]" : "border-[#b8c9c5] bg-[#fafcfb] hover:border-[#187574] hover:bg-[#f5faf8]"}`}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#e5f7f3] text-lg font-semibold text-[#187574]">↑</span>
          <span className="mt-3 text-sm font-semibold text-[#273333]">{file ? file.name : "Drop a file here or browse"}</span>
          <span className="mt-1 text-xs text-[#8e91a0]">CSV or XLSX</span>
        </label>
      </div>

      <div className="mt-5 rounded-lg border border-[#e0e2e8] bg-[#fafbfc] p-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-[#4f5664]">Required columns</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {["name", "admissionNo", "className", "grade"].map((column) => <code key={column} className="rounded-md border border-[#e0e2e8] bg-white px-2 py-1 text-xs font-semibold text-[#335452]">{column}</code>)}
        </div>
        <p className="mt-3 text-xs leading-5 text-[#6b6f7e]">Admission numbers should be unique. Classes will be matched or created during import.</p>
      </div>

      {showPreview && preview.length > 0 && (
        <div className="mt-5 overflow-hidden rounded-xl border border-[#e0e2e8]">
          <div className="flex flex-col gap-1 border-b border-[#e0e2e8] bg-[#fafbfc] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold text-[#1c1c1e]">Preview</h3>
            <span className="text-xs text-[#6b6f7e]">Showing {preview.length} of {rowCount} rows</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#e8ebee]">
              <thead className="bg-white"><tr>{["Name", "Admission no.", "Class", "Grade"].map((heading) => <th key={heading} className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-[#8e91a0]">{heading}</th>)}</tr></thead>
              <tbody className="divide-y divide-[#eef0f3] bg-white">{preview.map((student, idx) => <tr key={`${student.admissionNo}-${idx}`} className="hover:bg-[#fafcfb]"><td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-[#273333]">{student.name || <span className="text-[#b34b52]">Missing</span>}</td><td className="whitespace-nowrap px-4 py-3 text-sm text-[#4f5664]">{student.admissionNo || <span className="text-[#b34b52]">Missing</span>}</td><td className="whitespace-nowrap px-4 py-3 text-sm text-[#4f5664]">{student.className || <span className="text-[#b34b52]">Missing</span>}</td><td className="whitespace-nowrap px-4 py-3 text-sm text-[#4f5664]">{student.grade || <span className="text-[#b34b52]">Missing</span>}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      )}

      {error && <div role="alert" className="mt-5 whitespace-pre-line rounded-lg border border-[#f0b7bb] bg-[#fff5f5] px-4 py-3 text-sm text-[#9b3030]">{error}</div>}
      {success && <div role="status" className="mt-5 rounded-lg border border-[#b7e1d9] bg-[#eaf8f5] px-4 py-3 text-sm font-medium text-[#17645f]">{success}</div>}

      {file && showPreview && (
        <div className="mt-5 flex flex-col gap-3 border-t border-[#eef0f3] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[#6b6f7e]">Review the sample rows before importing all {rowCount} records.</p>
          <button type="button" onClick={handleUpload} disabled={loading} className="min-h-11 w-full rounded-lg bg-[#176f69] px-5 text-sm font-semibold text-white transition hover:bg-[#125e59] disabled:cursor-wait disabled:opacity-60 sm:w-auto">
            {loading ? "Importing…" : `Import ${rowCount} learners`}
          </button>
        </div>
      )}
    </section>
  )
}
