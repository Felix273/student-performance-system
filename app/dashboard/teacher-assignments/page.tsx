import { redirect } from "next/navigation"
import { auth } from "@/lib/auth-config"
import TeacherAssignmentsClient from "./TeacherAssignmentsClient"

export default async function TeacherAssignmentsPage() {
  const session = await auth()
  if (!session || session.user.role !== "SCHOOL_ADMIN" || !session.user.schoolId) redirect("/dashboard")
  return <TeacherAssignmentsClient />
}
