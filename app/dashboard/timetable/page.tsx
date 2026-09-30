import { redirect } from "next/navigation"
import { auth } from "@/lib/auth-config"
import TimetableClient from "./TimetableClient"

export default async function TimetablePage() {
  const session = await auth()
  if (!session || !["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"].includes(session.user.role || "")) redirect("/dashboard")
  return <TimetableClient role={session.user.role || "TEACHER"} />
}
