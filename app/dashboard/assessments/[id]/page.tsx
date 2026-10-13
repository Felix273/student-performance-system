import { redirect } from "next/navigation"

export default async function AssessmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/dashboard/assessments/${encodeURIComponent(id)}/record`)
}