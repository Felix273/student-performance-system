"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { offlineStorage } from "@/lib/offline/storage"
import { syncManager } from "@/lib/offline/syncManager"

interface Student {
  id: string
  name: string
  admissionNo: string
}

interface ExistingResult {
  id: string
  studentId: string
  score: number
}

interface Assessment {
  id: string
  title: string
  maxScore: number
}

interface Props {
  assessment: Assessment
  students: Student[]
  existingResults: ExistingResult[]
}

export default function RecordScoresFormOffline({ assessment, students, existingResults }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isOnline, setIsOnline] = useState(true)
  const [unsyncedCount, setUnsyncedCount] = useState(0)
  
  const [scores, setScores] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    existingResults.forEach(result => {
      initial[result.studentId] = result.score.toString()
    })
    return initial
  })

  useEffect(() => {
    // Initialize offline storage
    offlineStorage.init()

    // Check online status
    setIsOnline(navigator.onLine)

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true)
      setSuccess("Back online! Syncing data...")
      syncManager.syncAll().then(result => {
        if (result.success > 0) {
          setSuccess(`✓ Synced ${result.success} record(s)`)
          updateUnsyncedCount()
        }
      })
    }

    const handleOffline = () => {
      setIsOnline(false)
      setError("You're offline. Data will be saved locally and synced when online.")
      setTimeout(() => setError(""), 5000)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Update unsynced count
    updateUnsyncedCount()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const updateUnsyncedCount = async () => {
    const count = await offlineStorage.getUnsyncedCount()
    setUnsyncedCount(count)
  }

  const handleScoreChange = (studentId: string, value: string) => {
    setScores(prev => ({ ...prev, [studentId]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)

    try {
      const results = Object.entries(scores)
        .filter(([_, score]) => score !== "")
        .map(([studentId, score]) => ({
          studentId,
          score: parseFloat(score)
        }))

      if (results.length === 0) {
        throw new Error("Please enter at least one score")
      }

      // Validate scores
      for (const result of results) {
        if (result.score < 0 || result.score > assessment.maxScore) {
          throw new Error(`Score must be between 0 and ${assessment.maxScore}`)
        }
      }

      if (navigator.onLine) {
        // Online: Send to server directly
        const response = await fetch(`/api/assessments/${assessment.id}/results`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ results })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Failed to save scores")
        }

        setSuccess(`✓ Successfully saved ${results.length} score(s) online!`)
      } else {
        // Offline: Save to IndexedDB
        await offlineStorage.saveAssessmentResult({
          assessmentId: assessment.id,
          results: results
        })

        setSuccess(`💾 Saved ${results.length} score(s) offline. Will sync when online.`)
        await updateUnsyncedCount()
      }
      
      setTimeout(() => {
        router.push("/dashboard/assessments")
        router.refresh()
      }, 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleManualSync = async () => {
    setSuccess("Syncing...")
    const result = await syncManager.syncAll()
    
    if (result.success > 0) {
      setSuccess(`✓ Synced ${result.success} record(s)`)
    } else if (result.failed > 0) {
      setError(`Failed to sync ${result.failed} record(s)`)
    } else {
      setSuccess("All data is synced!")
    }
    
    await updateUnsyncedCount()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Student Scores</h3>
            <p className="text-sm text-gray-600 mt-1">
              Enter scores for each student (0 - {assessment.maxScore})
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Online/Offline Indicator */}
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
              isOnline 
                ? 'bg-green-100 text-green-800' 
                : 'bg-orange-100 text-orange-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-600' : 'bg-orange-600'}`} />
              {isOnline ? 'Online' : 'Offline'}
            </div>

            {/* Unsynced Count */}
            {unsyncedCount > 0 && (
              <button
                type="button"
                onClick={handleManualSync}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium hover:bg-blue-200 transition"
              >
                🔄 {unsyncedCount} unsynced
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {students.map((student) => (
            <div key={student.id} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="font-medium text-gray-900">{student.name}</div>
                <div className="text-sm text-gray-500">Adm. No: {student.admissionNo}</div>
              </div>
              <div className="w-32">
                <input
                  type="number"
                  min="0"
                  max={assessment.maxScore}
                  step="0.01"
                  value={scores[student.id] || ""}
                  onChange={(e) => handleScoreChange(student.id, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  placeholder="Score"
                />
              </div>
              <div className="w-20 text-sm text-gray-500">
                / {assessment.maxScore}
              </div>
            </div>
          ))}

          {students.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No students in this class yet.
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mx-6 mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mx-6 mb-4 bg-green-50 text-green-600 p-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      <div className="p-6 border-t bg-gray-50 flex gap-3">
        <button
          type="submit"
          disabled={loading || students.length === 0}
          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Saving..." : isOnline ? "Save Scores" : "Save Offline"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
