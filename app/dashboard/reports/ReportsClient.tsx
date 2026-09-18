"use client"

import { useState } from "react"

interface School {
  id: string
  name: string
}

interface Class {
  id: string
  name: string
  school: {
    name: string
  }
}

interface Student {
  id: string
  name: string
  admissionNo: string
  class: {
    name: string
  }
  school: {
    name: string
  }
}

interface Props {
  schools: School[]
  classes: Class[]
  students: Student[]
  userRole: string
  userSchoolId: string
}

export default function ReportsClient({ schools, classes, students, userRole, userSchoolId }: Props) {
  const [reportType, setReportType] = useState<"student" | "class" | "assessment">("student")
  const [selectedSchool, setSelectedSchool] = useState(userSchoolId || "")
  const [selectedClass, setSelectedClass] = useState("")
  const [selectedStudent, setSelectedStudent] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const filteredClasses = selectedSchool 
    ? classes.filter(c => c.school.name === schools.find(s => s.id === selectedSchool)?.name)
    : classes

  const filteredStudents = selectedClass
    ? students.filter(s => s.class.name === classes.find(c => c.id === selectedClass)?.name)
    : selectedSchool
      ? students.filter(s => s.school.name === schools.find(sc => sc.id === selectedSchool)?.name)
      : students

  const handleGeneratePDF = async () => {
    setLoading(true)
    setError("")

    try {
      if (reportType === "student" && !selectedStudent) {
        throw new Error("Please select a student")
      }
      if (reportType === "class" && !selectedClass) {
        throw new Error("Please select a class")
      }

      const endpoint = reportType === "student" 
        ? `/api/reports/student-pdf?studentId=${selectedStudent}`
        : `/api/reports/class-pdf?classId=${selectedClass}`

      const response = await fetch(endpoint)
      
      if (!response.ok) {
        throw new Error("Failed to generate report")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = reportType === "student" 
        ? `student-report-${Date.now()}.pdf`
        : `class-report-${Date.now()}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleExportExcel = async () => {
    setLoading(true)
    setError("")

    try {
      const endpoint = reportType === "assessment"
        ? `/api/reports/assessment-excel?schoolId=${selectedSchool}${selectedClass ? `&classId=${selectedClass}` : ''}`
        : `/api/reports/students-excel?schoolId=${selectedSchool}${selectedClass ? `&classId=${selectedClass}` : ''}`

      const response = await fetch(endpoint)
      
      if (!response.ok) {
        throw new Error("Failed to export data")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = reportType === "assessment"
        ? `assessment-data-${Date.now()}.xlsx`
        : `students-list-${Date.now()}.xlsx`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Reports & Export</h2>
        <p className="text-gray-600 mt-1">Generate PDF reports and export data to Excel</p>
      </div>

      {/* Report Type Selection */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Report Type
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setReportType("student")}
              className={`p-4 border-2 rounded-lg transition ${
                reportType === "student"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="text-3xl mb-2">👨‍🎓</div>
              <div className="font-semibold">Student Report Card</div>
              <div className="text-sm text-gray-600">Individual PDF report</div>
            </button>

            <button
              onClick={() => setReportType("class")}
              className={`p-4 border-2 rounded-lg transition ${
                reportType === "class"
                  ? "border-green-500 bg-green-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="text-3xl mb-2">📚</div>
              <div className="font-semibold">Class Report</div>
              <div className="text-sm text-gray-600">Class performance PDF</div>
            </button>

            <button
              onClick={() => setReportType("assessment")}
              className={`p-4 border-2 rounded-lg transition ${
                reportType === "assessment"
                  ? "border-purple-500 bg-purple-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="text-3xl mb-2">📊</div>
              <div className="font-semibold">Data Export</div>
              <div className="text-sm text-gray-600">Excel spreadsheet</div>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-4 pt-4 border-t">
          {userRole === "SUPER_ADMIN" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select School *
              </label>
              <select
                value={selectedSchool}
                onChange={(e) => {
                  setSelectedSchool(e.target.value)
                  setSelectedClass("")
                  setSelectedStudent("")
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Class {reportType === "class" ? "*" : "(Optional)"}
              </label>
              <select
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value)
                  setSelectedStudent("")
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">-- All Classes --</option>
                {filteredClasses.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {reportType === "student" && selectedSchool && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Student *
              </label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">-- Select Student --</option>
                {filteredStudents.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} ({student.admissionNo}) - {student.class.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Generate Button */}
        <div className="flex gap-3 pt-4">
          {(reportType === "student" || reportType === "class") && (
            <button
              onClick={handleGeneratePDF}
              disabled={loading || !selectedSchool || (reportType === "student" && !selectedStudent) || (reportType === "class" && !selectedClass)}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <span>📄</span>
                  <span>Generate PDF Report</span>
                </>
              )}
            </button>
          )}

          {reportType === "assessment" && (
            <button
              onClick={handleExportExcel}
              disabled={loading || !selectedSchool}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <span>📊</span>
                  <span>Export to Excel</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">📋 Report Types</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p><strong>Student Report Card:</strong> Comprehensive PDF with all assessments, performance summary, and AI analysis (if available)</p>
          <p><strong>Class Report:</strong> Class-wide performance PDF with rankings and summary statistics</p>
          <p><strong>Data Export:</strong> Excel spreadsheet with all assessment data for further analysis</p>
        </div>
      </div>
    </div>
  )
}
