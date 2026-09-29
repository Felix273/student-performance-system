import { redirect } from "next/navigation"
import { auth } from "@/lib/auth-config"
import { canAccessStudent } from "@/lib/authorization"
import CompetencyProgressClient from "./CompetencyProgressClient"

export default async function CompetencyProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect("/login")
  const { id } = await params
  const access = await canAccessStudent(session, id)
  if (!access.ok) redirect("/dashboard")
  return <CompetencyProgressClient studentId={id} />
}
