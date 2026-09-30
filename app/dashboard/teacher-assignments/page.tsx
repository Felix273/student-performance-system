import { redirect } from "next/navigation"
import { auth } from "@/lib/auth-config"
import TeacherAssignmentsClient from "./TeacherAssignmentsClient"

export default async function TeacherAssignmentsPage() {
  const session = await auth()
  if (!session || !["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(session.user.role || "")) redirect("/dashboard")
  return <TeacherAssignmentsClient />
}
