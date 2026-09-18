"use client"

import { useState } from "react"
import Papa from "papaparse"
import * as XLSX from "xlsx"

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setError("")
    setSuccess("")
    setPreview([])

    // Parse and preview
    try {
      const data = await parseFile(selectedFile)
      setPreview(data.slice(0, 5)) // Show first 5 rows
      setShowPreview(true)
    } catch (err: any) {
      setError(err.message)
    }
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
      } else if (fileType === 'xlsx' || fileType === 'xls') {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const data = e.target?.result
            const workbook = XLSX.read(data, { type: 'binary' })
            const sheetName = workbook.SheetNames[0]
            const sheet = workbook.Sheets[sheetName]
            const jsonData: any[] = XLSX.utils.sheet_to_json(sheet)

            const students = jsonData.map((row: any) => ({
              name: String(row.name || row.Name || row.NAME || ""),
              admissionNo: String(row.admissionNo || row['Admission No'] || row.admission_no || ""),
              className: String(row.className || row['Class Name'] || row.class || ""),
              grade: String(row.grade || row.Grade || row.GRADE || "")
            }))
            resolve(students)
          } catch (err: any) {
            reject(new Error("Failed to parse Excel file"))
          }
        }
        reader.onerror = () => reject(new Error("Failed to read file"))
        reader.readAsBinaryString(file)
      } else {
        reject(new Error("Unsupported file type. Please use CSV or Excel (.xlsx, .xls)"))
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
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Bulk Import Students</h3>
          <p className="text-sm text-gray-600 mt-1">Upload CSV or Excel file to import multiple students</p>
        </div>
        <button
          onClick={downloadTemplate}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          📥 Download Template
        </button>
      </div>

      {/* File Upload */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition">
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer"
        >
          <div className="text-4xl mb-2">📄</div>
          <div className="text-sm text-gray-600">
            {file ? (
              <span className="font-medium text-gray-900">{file.name}</span>
            ) : (
              <>
                <span className="text-blue-600 hover:text-blue-800 font-medium">Click to upload</span>
                {" or drag and drop"}
              </>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-1">CSV or Excel (.xlsx, .xls)</div>
        </label>
      </div>

      {/* Format Requirements */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 text-sm mb-2">Required Columns:</h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• <strong>name</strong> - Student's full name</li>
          <li>• <strong>admissionNo</strong> - Unique admission number</li>
          <li>• <strong>className</strong> - Class name (e.g., "Grade 10A")</li>
          <li>• <strong>grade</strong> - Grade level (e.g., "10")</li>
        </ul>
      </div>

      {/* Preview */}
      {showPreview && preview.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b">
            <h4 className="text-sm font-semibold text-gray-900">Preview (First 5 rows)</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Admission No</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Class</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Grade</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {preview.map((student, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2 text-sm text-gray-900">{student.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{student.admissionNo}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{student.className}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{student.grade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm whitespace-pre-line">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Upload Button */}
      {file && showPreview && (
        <button
          onClick={handleUpload}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50"
        >
          {loading ? "Uploading..." : `Upload ${preview.length}+ Students`}
        </button>
      )}
    </div>
  )
}
