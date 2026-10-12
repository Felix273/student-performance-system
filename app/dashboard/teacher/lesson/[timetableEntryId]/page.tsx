import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"
import LessonWorkspaceClient from "./LessonWorkspaceClient"

export default async function LessonWorkspacePage({ params }: { params: Promise<{ timetableEntryId: string }> }) {
  const session = await auth()
  if (!session?.user || !["TEACHER", "SCHOOL_ADMIN"].includes(session.user.role || "")) redirect("/dashboard")
  const { timetableEntryId } = await params
  return <LessonWorkspaceClient timetableEntryId={timetableEntryId} role={session.user.role || "TEACHER"} />
}