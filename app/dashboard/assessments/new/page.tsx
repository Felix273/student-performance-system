import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import NewAssessmentClient from "./NewAssessmentClient"

export default async function NewAssessmentPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role !== "SCHOOL_ADMIN" || !session.user.schoolId) redirect("/dashboard")
  return <NewAssessmentClient />
}
