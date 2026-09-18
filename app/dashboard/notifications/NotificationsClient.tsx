"use client"

import { useState } from "react"

interface Student {
  id: string
  name: string
  admissionNo: string
  class: { name: string }
  parents: Array<{
    parent: {
      id: string
      name: string
      email: string
    }
  }>
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface Props {
  students: Student[]
  users: User[]
  userRole: string
}

export default function NotificationsClient({ students, users, userRole }: Props) {
  const [notificationType, setNotificationType] = useState<"welcome" | "report" | "custom">("welcome")
  const [selectedUser, setSelectedUser] = useState("")
  const [selectedStudent, setSelectedStudent] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")
  const [previewUrl, setPreviewUrl] = useState("")

  const handleSendWelcome = async () => {
    if (!selectedUser) {
      setError("Please select a user")
      return
    }

    setLoading(true)
    setError("")
    setSuccess("")
    setPreviewUrl("")

    try {
      const user = users.find(u => u.id === selectedUser)
      if (!user) throw new Error("User not found")

      const response = await fetch("/api/email/send-welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          name: user.name,
          role: user.role
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to send email")
      }

      setSuccess(`✓ Welcome email sent to ${user.name}`)
      if (result.previewUrl) {
        setPreviewUrl(result.previewUrl)
      }
      setSelectedUser("")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSendReportCard = async () => {
    if (!selectedStudent) {
      setError("Please select a student")
      return
    }

    setLoading(true)
    setError("")
    setSuccess("")
    setPreviewUrl("")

    try {
      const student = students.find(s => s.id === selectedStudent)
      if (!student) throw new Error("Student not found")

      const response = await fetch("/api/email/send-report-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: student.id })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to send email")
      }

      setSuccess(`✓ ${result.message}`)
      if (result.previewUrls && result.previewUrls.length > 0) {
        setPreviewUrl(result.previewUrls[0])
      }
      setSelectedStudent("")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Email Notifications 📧</h2>
        <p className="text-gray-800 mt-1 font-medium">Send automated emails to users and parents</p>
      </div>

      {/* Notification Type Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <label className="block text-sm font-bold text-gray-800 mb-2">
          Notification Type
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setNotificationType("welcome")}
            className={`p-4 border-2 rounded-lg transition ${
              notificationType === "welcome"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
          >
            <div className="text-3xl mb-2">👋</div>
            <div className="font-bold text-gray-900">Welcome Email</div>
            <div className="text-sm text-gray-800 font-medium">New user onboarding</div>
          </button>

          <button
            onClick={() => setNotificationType("report")}
            className={`p-4 border-2 rounded-lg transition ${
              notificationType === "report"
                ? "border-green-500 bg-green-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
          >
            <div className="text-3xl mb-2">📊</div>
            <div className="font-bold text-gray-900">Report Card</div>
            <div className="text-sm text-gray-800 font-medium">Send to parents</div>
          </button>

          <button
            onClick={() => setNotificationType("custom")}
            className={`p-4 border-2 rounded-lg transition ${
              notificationType === "custom"
                ? "border-purple-500 bg-purple-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
          >
            <div className="text-3xl mb-2">✉️</div>
            <div className="font-bold text-gray-900">Custom Email</div>
            <div className="text-sm text-gray-800 font-medium">Compose message</div>
          </button>
        </div>
      </div>

      {/* Welcome Email Form */}
      {notificationType === "welcome" && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="text-xl font-bold text-gray-900">Send Welcome Email</h3>
          
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1">
              Select User
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
            >
              <option value="">-- Select User --</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email}) - {user.role}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSendWelcome}
            disabled={loading || !selectedUser}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Welcome Email"}
          </button>
        </div>
      )}

      {/* Report Card Email Form */}
      {notificationType === "report" && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="text-xl font-bold text-gray-900">Send Report Card to Parents</h3>
          
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1">
              Select Student
            </label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-gray-900"
            >
              <option value="">-- Select Student --</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} ({student.admissionNo}) - {student.class.name} 
                  {student.parents.length > 0 ? ` - ${student.parents.length} parent(s)` : ' - No parents linked'}
                </option>
              ))}
            </select>
          </div>

          {selectedStudent && (
            <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-lg">
              <p className="text-sm text-gray-900 font-bold">
                📧 Email will be sent to:
              </p>
              {students.find(s => s.id === selectedStudent)?.parents.length === 0 ? (
                <p className="mt-2 text-sm text-red-700 font-bold">⚠️ No parents linked to this student</p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {students
                    .find(s => s.id === selectedStudent)
                    ?.parents.map(p => (
                      <li key={p.parent.id} className="text-sm text-gray-800 font-medium">
                        • {p.parent.name} ({p.parent.email})
                      </li>
                    ))}
                </ul>
              )}
            </div>
          )}

          <button
            onClick={handleSendReportCard}
            disabled={loading || !selectedStudent}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Report Card Email"}
          </button>
        </div>
      )}

      {/* Custom Email Form */}
      {notificationType === "custom" && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="text-xl font-bold text-gray-900">Compose Custom Email</h3>
          <p className="text-sm text-gray-800 font-medium">Coming soon - Custom email composer with rich text editor</p>
        </div>
      )}

      {/* Success Message with Preview URL */}
      {success && (
        <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 space-y-3">
          <p className="text-green-900 font-bold">{success}</p>
          {previewUrl && (
            <div className="bg-white p-3 rounded border border-green-300">
              <p className="text-sm text-gray-900 font-bold mb-2">📧 Email Preview (Test Mode):</p>
              <a 
                href={previewUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline text-sm font-medium break-all"
              >
                {previewUrl}
              </a>
              <p className="text-xs text-gray-700 mt-2 font-medium">Click to view the email in your browser</p>
            </div>
          )}
        </div>
      )}

      {/* Error Messages */}
      {error && (
        <div className="bg-red-50 border-2 border-red-300 text-red-800 p-4 rounded-lg font-bold">
          {error}
        </div>
      )}

      {/* Email Setup Instructions */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
        <h3 className="font-bold text-blue-900 mb-3">📧 Email Setup Guide</h3>
        <div className="space-y-3 text-sm text-blue-900">
          <div className="bg-white p-3 rounded border border-blue-200">
            <p className="font-bold mb-1">🧪 TEST MODE (Current)</p>
            <p>Emails are being captured by Ethereal Email (test service). Click the preview link to see how emails look.</p>
            <p className="mt-1 text-xs">No actual emails are sent in test mode.</p>
          </div>
          
          <p className="font-bold mt-4">Production Setup Options:</p>
          
          <div className="bg-white p-3 rounded border border-blue-200">
            <p className="font-bold">Option 1: Resend (Recommended)</p>
            <ol className="list-decimal list-inside space-y-1 ml-4 mt-1">
              <li>Sign up at <a href="https://resend.com" target="_blank" className="underline">resend.com</a></li>
              <li>Get your API key</li>
              <li>Add to .env: <code className="bg-blue-100 px-2 py-1 rounded">RESEND_API_KEY=your_key</code></li>
              <li>Set: <code className="bg-blue-100 px-2 py-1 rounded">EMAIL_PROVIDER=resend</code></li>
            </ol>
          </div>
          
          <div className="bg-white p-3 rounded border border-blue-200">
            <p className="font-bold">Option 2: Gmail</p>
            <ol className="list-decimal list-inside space-y-1 ml-4 mt-1">
              <li>Enable 2-Factor Authentication on Gmail</li>
              <li>Generate App Password in Google Account settings</li>
              <li>Add to .env: <code className="bg-blue-100 px-2 py-1 rounded">GMAIL_USER=your@gmail.com</code></li>
              <li>Add: <code className="bg-blue-100 px-2 py-1 rounded">GMAIL_APP_PASSWORD=your_app_password</code></li>
              <li>Set: <code className="bg-blue-100 px-2 py-1 rounded">EMAIL_PROVIDER=gmail</code></li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
