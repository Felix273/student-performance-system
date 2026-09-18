"use client"

import { useState, useEffect } from "react"
import Papa from "papaparse"
import * as XLSX from "xlsx"

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

  useEffect(() => {
    fetchAssessments()
  }, [schoolId])

  const fetchAssessments = async () => {
    try {
      const res = await fetch(`/api/assessments?schoolId=${schoolId}`)
      if (res.ok) {
        const data = await res.json()
        setAssessments(data)
      }
    } catch (err) {
      console.error("Failed to fetch assessments", err)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setError("")
    setSuccess("")
    setPreview([])

    try {
      const data = await parseFile(selectedFile)
      setPreview(data.slice(0, 5))
      setShowPreview(true)
    } catch (err: any) {
      setError(err.message)
    }
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
      } else if (fileType === 'xlsx' || fileType === 'xls') {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const data = e.target?.result
            const workbook = XLSX.read(data, { type: 'binary' })
            const sheetName = workbook.SheetNames[0]
            const sheet = workbook.Sheets[sheetName]
            const jsonData: any[] = XLSX.utils.sheet_to_json(sheet)

            const scores = jsonData.map((row: any) => ({
              admissionNo: row.admissionNo || row['Admission No'] || row.admission_no || "",
              score: parseFloat(row.score || row.Score || row.SCORE || "0")
            }))
            resolve(scores)
          } catch (err: any) {
            reject(new Error("Failed to parse Excel file"))
          }
        }
        reader.onerror = () => reject(new Error("Failed to read file"))
        reader.readAsBinaryString(file)
      } else {
        reject(new Error("Unsupported file type"))
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
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Bulk Import Assessment Scores</h3>
          <p className="text-sm text-gray-600 mt-1">Upload CSV or Excel file with student scores</p>
        </div>
        <button
          onClick={downloadTemplate}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          📥 Download Template
        </button>
      </div>

      {/* Select Assessment */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Select Assessment *
        </label>
        <select
          value={selectedAssessment}
          onChange={(e) => setSelectedAssessment(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
        >
          <option value="">-- Select Assessment --</option>
          {assessments.map((assessment) => (
            <option key={assessment.id} value={assessment.id}>
              {assessment.title} - {assessment.class.name} - {assessment.subject.name} (Max: {assessment.maxScore})
            </option>
          ))}
        </select>
      </div>

      {selectedAssessment && (
        <>
          {/* File Upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="scores-file-upload"
            />
            <label htmlFor="scores-file-upload" className="cursor-pointer">
              <div className="text-4xl mb-2">📊</div>
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
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h4 className="font-semibold text-purple-900 text-sm mb-2">Required Columns:</h4>
            <ul className="text-xs text-purple-800 space-y-1">
              <li>• <strong>admissionNo</strong> - Student's admission number</li>
              <li>• <strong>score</strong> - Score value (0 to {assessments.find(a => a.id === selectedAssessment)?.maxScore || 100})</li>
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
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Admission No</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Score</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {preview.map((score, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 text-sm text-gray-900">{score.admissionNo}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{score.score}</td>
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
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50"
            >
              {loading ? "Uploading..." : `Upload ${preview.length}+ Scores`}
            </button>
          )}
        </>
      )}
    </div>
  )
}
