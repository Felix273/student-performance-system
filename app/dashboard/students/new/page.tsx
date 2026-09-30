import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import NewStudentClient from "./NewStudentClient"

export default async function NewStudentPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role !== "SCHOOL_ADMIN" || !session.user.schoolId) redirect("/dashboard")
  return <NewStudentClient />
}
