"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import StudentBulkUpload from "@/components/upload/StudentBulkUpload"
import AssessmentBulkUpload from "@/components/upload/AssessmentBulkUpload"

interface School {
  id: string
  name: string
}

export default function BulkUploadPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"students" | "scores">("students")
  const [schools, setSchools] = useState<School[]>([])
  const [selectedSchool, setSelectedSchool] = useState("")
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [userSchoolId, setUserSchoolId] = useState("")

  useEffect(() => {
    fetchSession()
  }, [])

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/debug/session")
      const session = await res.json()
      
      if (session.user.role === "SUPER_ADMIN") {
        setIsSuperAdmin(true)
        fetchSchools()
      } else if (session.user.schoolId) {
        setUserSchoolId(session.user.schoolId)
        setSelectedSchool(session.user.schoolId)
      }
    } catch (err) {
      console.error("Failed to fetch session", err)
    }
  }

  const fetchSchools = async () => {
    try {
      const res = await fetch("/api/schools")
      if (res.ok) {
        const data = await res.json()
        setSchools(data)
      }
    } catch (err) {
      console.error("Failed to fetch schools", err)
    }
  }

  const handleUploadComplete = () => {
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Bulk Upload</h2>
        <p className="text-gray-600 mt-1">Import students and assessment scores from CSV or Excel files</p>
      </div>

      {/* School Selector for Super Admin */}
      {isSuperAdmin && (
        <div className="bg-white rounded-lg shadow p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select School *
          </label>
          <select
            value={selectedSchool}
            onChange={(e) => setSelectedSchool(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option value="">-- Select School --</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedSchool && (
        <>
          {/* Tabs */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab("students")}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition ${
                    activeTab === "students"
                      ? "border-green-500 text-green-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  👨‍🎓 Import Students
                </button>
                <button
                  onClick={() => setActiveTab("scores")}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition ${
                    activeTab === "scores"
                      ? "border-purple-500 text-purple-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  📊 Import Scores
                </button>
              </nav>
            </div>

            <div className="p-6">
              {activeTab === "students" && (
                <StudentBulkUpload 
                  schoolId={selectedSchool}
                  onUploadComplete={handleUploadComplete}
                />
              )}

              {activeTab === "scores" && (
                <AssessmentBulkUpload 
                  schoolId={selectedSchool}
                  onUploadComplete={handleUploadComplete}
                />
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-3">📋 Instructions</h3>
            <div className="space-y-2 text-sm text-blue-800">
              <p><strong>Step 1:</strong> Download the template file for the type of data you want to import</p>
              <p><strong>Step 2:</strong> Fill in your data following the template format exactly</p>
              <p><strong>Step 3:</strong> Save as CSV or Excel (.xlsx, .xls) format</p>
              <p><strong>Step 4:</strong> Upload the file using the form above</p>
              <p><strong>Step 5:</strong> Review the preview and click Upload to import</p>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="font-semibold text-yellow-900 mb-3">💡 Tips</h3>
            <ul className="space-y-1 text-sm text-yellow-800 list-disc list-inside">
              <li>Ensure all required columns are present in your file</li>
              <li>Use the exact column names from the template</li>
              <li>For students: Classes will be auto-created if they don't exist</li>
              <li>For scores: Students must already exist in the system</li>
              <li>Remove any extra columns or formatting from your file</li>
              <li>Test with a small batch first before uploading large files</li>
            </ul>
          </div>
        </>
      )}

      {!selectedSchool && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">🏫</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a School First</h3>
          <p className="text-gray-600">
            Please select a school above to start bulk uploading data.
          </p>
        </div>
      )}
    </div>
  )
}
