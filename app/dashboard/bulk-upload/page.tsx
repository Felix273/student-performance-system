import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import BulkUploadClient from "./BulkUploadClient"

export default async function BulkUploadPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role !== "SCHOOL_ADMIN" || !session.user.schoolId) redirect("/dashboard")
  return <BulkUploadClient />
}
