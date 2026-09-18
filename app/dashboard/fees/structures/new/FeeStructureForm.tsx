"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface School {
  id: string
  name: string
}

interface Class {
  id: string
  name: string
  school: {
    id: string
    name: string
  }
}

interface Props {
  schools: School[]
  classes: Class[]
  userRole: string
  userSchoolId: string
}

export default function FeeStructureForm({ schools, classes, userRole, userSchoolId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    schoolId: userSchoolId || "",
    classId: "",
    term: "",
    academicYear: new Date().getFullYear().toString(),
    tuitionFee: "",
    labFee: "",
    libraryFee: "",
    sportsFee: "",
    examFee: "",
    otherFees: "",
    dueDate: ""
  })

  const filteredClasses = formData.schoolId 
    ? classes.filter(c => c.school.id === formData.schoolId)
    : classes

  const calculateTotal = () => {
    const fees = [
      formData.tuitionFee,
      formData.labFee,
      formData.libraryFee,
      formData.sportsFee,
      formData.examFee,
      formData.otherFees
    ]
    return fees.reduce((sum, fee) => sum + (parseFloat(fee) || 0), 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const totalAmount = calculateTotal()

      if (totalAmount <= 0) {
        throw new Error("Total amount must be greater than 0")
      }

      const response = await fetch("/api/fees/structures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          tuitionFee: parseFloat(formData.tuitionFee) || 0,
          labFee: parseFloat(formData.labFee) || 0,
          libraryFee: parseFloat(formData.libraryFee) || 0,
          sportsFee: parseFloat(formData.sportsFee) || 0,
          examFee: parseFloat(formData.examFee) || 0,
          otherFees: parseFloat(formData.otherFees) || 0,
          totalAmount
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to create fee structure")
      }

      router.push("/dashboard/fees/structures")
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h3 className="text-lg font-bold text-gray-900">Basic Information</h3>

        {userRole === "SUPER_ADMIN" && (
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1">
              School *
            </label>
            <select
              value={formData.schoolId}
              onChange={(e) => setFormData({ ...formData, schoolId: e.target.value, classId: "" })}
              required
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
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

        <div>
          <label className="block text-sm font-bold text-gray-800 mb-1">
            Class *
          </label>
          <select
            value={formData.classId}
            onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
            required
            disabled={!formData.schoolId}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 disabled:opacity-50"
          >
            <option value="">-- Select Class --</option>
            {filteredClasses.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1">
              Term *
            </label>
            <select
              value={formData.term}
              onChange={(e) => setFormData({ ...formData, term: e.target.value })}
              required
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
            >
              <option value="">-- Select Term --</option>
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
              <option value="Semester 1">Semester 1</option>
              <option value="Semester 2">Semester 2</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1">
              Academic Year *
            </label>
            <input
              type="number"
              value={formData.academicYear}
              onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
              required
              min="2020"
              max="2099"
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-800 mb-1">
            Due Date *
          </label>
          <input
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            required
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h3 className="text-lg font-bold text-gray-900">Fee Breakdown</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1">
              Tuition Fee (KES) *
            </label>
            <input
              type="number"
              value={formData.tuitionFee}
              onChange={(e) => setFormData({ ...formData, tuitionFee: e.target.value })}
              required
              min="0"
              step="0.01"
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1">
              Lab Fee (KES)
            </label>
            <input
              type="number"
              value={formData.labFee}
              onChange={(e) => setFormData({ ...formData, labFee: e.target.value })}
              min="0"
              step="0.01"
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1">
              Library Fee (KES)
            </label>
            <input
              type="number"
              value={formData.libraryFee}
              onChange={(e) => setFormData({ ...formData, libraryFee: e.target.value })}
              min="0"
              step="0.01"
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1">
              Sports Fee (KES)
            </label>
            <input
              type="number"
              value={formData.sportsFee}
              onChange={(e) => setFormData({ ...formData, sportsFee: e.target.value })}
              min="0"
              step="0.01"
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1">
              Exam Fee (KES)
            </label>
            <input
              type="number"
              value={formData.examFee}
              onChange={(e) => setFormData({ ...formData, examFee: e.target.value })}
              min="0"
              step="0.01"
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1">
              Other Fees (KES)
            </label>
            <input
              type="number"
              value={formData.otherFees}
              onChange={(e) => setFormData({ ...formData, otherFees: e.target.value })}
              min="0"
              step="0.01"
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="bg-green-50 border-2 border-green-300 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold text-gray-900">Total Amount:</span>
            <span className="text-2xl font-bold text-green-700">
              KES {calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-300 text-red-800 p-4 rounded-lg font-bold">
          {error}
        </div>
      )}

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Fee Structure"}
        </button>
        <Link
          href="/dashboard/fees/structures"
          className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition font-bold text-gray-900"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}
