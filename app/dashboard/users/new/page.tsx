import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import NewUserClient from "./NewUserClient"

export default async function NewUserPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role !== "SCHOOL_ADMIN" || !session.user.schoolId) redirect("/dashboard")
  return <NewUserClient />
}
