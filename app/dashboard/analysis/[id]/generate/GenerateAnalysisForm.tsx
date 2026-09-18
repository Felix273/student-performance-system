"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface Assessment {
  score: number
  assessment: {
    title: string
    maxScore: number
    type: string
    subject: {
      name: string
    }
  }
}

interface Student {
  id: string
  name: string
  admissionNo: string
  assessments: Assessment[]
}

interface Props {
  student: Student
}

export default function GenerateAnalysisForm({ student }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [analysis, setAnalysis] = useState<any>(null)

  const handleGenerate = async () => {
    setError("")
    setLoading(true)
    setAnalysis(null)

    try {
      const response = await fetch(`/api/analysis/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: student.id })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate analysis")
      }

      setAnalysis(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      router.push("/dashboard/analysis")
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Calculate current average
  const currentAverage = student.assessments.length > 0
    ? (student.assessments.reduce((sum, a) => sum + (a.score / a.assessment.maxScore * 100), 0) / student.assessments.length).toFixed(1)
    : "N/A"

  return (
    <div className="space-y-6">
      {/* Student Performance Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Summary</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm text-blue-600 font-medium">Total Assessments</div>
            <div className="text-3xl font-bold text-blue-900 mt-1">{student.assessments.length}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-sm text-green-600 font-medium">Current Average</div>
            <div className="text-3xl font-bold text-green-900 mt-1">{currentAverage}%</div>
          </div>
        </div>

        {student.assessments.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Recent Assessments</h4>
            <div className="space-y-2">
              {student.assessments.slice(0, 5).map((result, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{result.assessment.subject.name}</div>
                    <div className="text-sm text-gray-600">{result.assessment.title}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">
                      {result.score}/{result.assessment.maxScore}
                    </div>
                    <div className="text-sm text-gray-600">
                      {((result.score / result.assessment.maxScore) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {student.assessments.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No assessment records found for this student.
          </div>
        )}
      </div>

      {/* Generate Button */}
      {student.assessments.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                <span>Analyzing with AI...</span>
              </>
            ) : (
              <>
                <span className="text-xl">🤖</span>
                <span>Generate AI Analysis</span>
              </>
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Analysis Results */}
      {analysis && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="flex justify-between items-start">
            <h3 className="text-xl font-bold text-gray-900">AI Analysis Results</h3>
            <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
              ✓ Saved
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-blue-600 font-medium">Overall Grade</div>
              <div className="text-2xl font-bold text-blue-900 mt-1">{analysis.overallGrade}</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm text-purple-600 font-medium">Trend</div>
              <div className="text-2xl font-bold text-purple-900 mt-1">{analysis.trend}</div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">💪 Strengths</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              {JSON.parse(analysis.strengths).map((strength: string, idx: number) => (
                <li key={idx}>{strength}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">📈 Areas for Improvement</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              {JSON.parse(analysis.weaknesses).map((weakness: string, idx: number) => (
                <li key={idx}>{weakness}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">💡 AI Recommendations</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              {JSON.parse(analysis.recommendations).map((rec: string, idx: number) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">🤖 AI Insights</h4>
            <p className="text-gray-700 whitespace-pre-line">{analysis.aiInsights}</p>
          </div>

          <button
            onClick={handleSave}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
          >
            Return to Analysis Dashboard
          </button>
        </div>
      )}
    </div>
  )
}
