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
          setSuccess(`Synced ${result.success} record(s)`)
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

        setSuccess(`Successfully saved ${results.length} score(s) online.`)
      } else {
        // Offline: Save to IndexedDB
        await offlineStorage.saveAssessmentResult({
          assessmentId: assessment.id,
          results: results
        })

        setSuccess(`Saved ${results.length} score(s) offline. They will sync when you are back online.`)
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
      setSuccess(`Synced ${result.success} record(s)`)
    } else if (result.failed > 0) {
      setError(`Failed to sync ${result.failed} record(s)`)
    } else {
      setSuccess("All data is synced!")
    }
    
    await updateUnsyncedCount()
  }

  const enteredCount = students.filter((student) => scores[student.id] !== undefined && scores[student.id] !== "").length

  return (
    <form onSubmit={handleSubmit} className="overflow-hidden rounded-xl border border-[#e0e2e8] bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-[#e0e2e8] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#68767b]">Class roster</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="text-base font-semibold text-[#172c36]">Student scores</h3>
            <p className="text-xs text-[#68767b]">Enter a score from 0 to {assessment.maxScore}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className={`inline-flex h-8 items-center gap-2 rounded-md px-3 text-xs font-medium ${isOnline ? "bg-[#e8f5ef] text-[#28634d]" : "bg-[#fff4c4] text-[#746019]"}`}>
            <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${isOnline ? "bg-[#2e8b62]" : "bg-[#b08014]"}`} />
            {isOnline ? "Online" : "Offline"}
          </div>
          {unsyncedCount > 0 && (
            <button
              type="button"
              onClick={handleManualSync}
              className="h-8 rounded-md border border-[#e0e2e8] bg-white px-3 text-xs font-medium text-[#172c36] transition hover:bg-[#f7f8fa] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#172c36]"
            >
              Sync {unsyncedCount} pending
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-2 sm:px-6">
        <div className="max-h-[min(60vh,34rem)] divide-y divide-[#eef0f3] overflow-y-auto">
          {students.map((student) => (
            <div key={student.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-2 py-3.5 transition-colors hover:bg-[#f7f8fa] sm:px-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-[#172c36]">{student.name}</div>
                <div className="mt-1 text-xs text-[#68767b]">Adm. No: {student.admissionNo}</div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  max={assessment.maxScore}
                  step="0.01"
                  value={scores[student.id] || ""}
                  onChange={(e) => handleScoreChange(student.id, e.target.value)}
                  aria-label={`Score for ${student.name}`}
                  className="h-10 w-24 rounded-md border border-[#cbd1d7] bg-white px-3 text-sm text-[#172c36] outline-none transition focus:border-[#172c36] focus:ring-2 focus:ring-[#172c36]/15"
                  placeholder="Score"
                />
                <span className="w-8 text-xs text-[#68767b]">/ {assessment.maxScore}</span>
              </div>
            </div>
          ))}

          {students.length === 0 && (
            <div className="px-4 py-12 text-center">
              <p className="text-sm font-medium text-[#172c36]">No students in this class yet.</p>
              <p className="mt-1 text-xs text-[#68767b]">Add students to the class before recording scores.</p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="mx-5 mb-4 rounded-md border border-[#efcaca] bg-[#fff4f4] px-4 py-3 text-sm text-[#8a3434] sm:mx-6">
          {error}
        </div>
      )}

      {success && (
        <div role="status" className="mx-5 mb-4 rounded-md border border-[#c8e5d6] bg-[#f1faf5] px-4 py-3 text-sm text-[#28634d] sm:mx-6">
          {success}
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-[#e0e2e8] bg-[#f7f8fa] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-xs text-[#68767b]" aria-live="polite">{enteredCount} of {students.length} scores entered</p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => router.back()}
            className="h-10 rounded-md border border-[#cbd1d7] bg-white px-4 text-sm font-medium text-[#172c36] transition hover:bg-[#f7f8fa]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || students.length === 0}
            className="h-10 rounded-md bg-[#172c36] px-5 text-sm font-semibold text-white transition hover:bg-[#263f49] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8bd52] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Saving..." : isOnline ? "Save scores" : "Save offline"}
          </button>
        </div>
      </div>
    </form>
  )
}
