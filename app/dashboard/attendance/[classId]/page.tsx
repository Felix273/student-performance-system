import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import AttendanceForm from "./AttendanceForm"

export default async function ClassAttendancePage({ 
  params 
}: { 
  params: Promise<{ classId: string }> 
}) {
  const session = await auth()
  
  if (!session) {
    redirect("/login")
  }

  const { classId } = await params

  const classData = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      school: true,
      students: {
        orderBy: { name: 'asc' }
      }
    }
  })

  if (!classData) {
    redirect("/dashboard/attendance")
  }

  // Get today's attendance
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const existingAttendance = await prisma.attendance.findMany({
    where: {
      studentId: { in: classData.students.map(s => s.id) },
      date: today
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Mark Attendance</h2>
          <p className="text-gray-600 mt-1">
            {classData.name} - {classData.school.name}
          </p>
        </div>
        <Link
          href="/dashboard/attendance"
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          &larr; Back to Classes
        </Link>
      </div>

      <AttendanceForm 
        classData={classData}
        existingAttendance={existingAttendance}
        userId={session.user.id}
      />
    </div>
  )
}
