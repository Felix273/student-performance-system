import { auth } from "@/lib/auth-config"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import EditFeeStructureForm from "./EditFeeStructureForm"

export default async function EditFeeStructurePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || !["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(session.user.role || "")) redirect("/dashboard")
  const { id } = await params
  const whereScope = session.user.role === "SCHOOL_ADMIN" && session.user.schoolId ? { schoolId: session.user.schoolId } : {}
  const [structure, schools, classes] = await Promise.all([
    prisma.feeStructure.findFirst({ where: { id, ...whereScope }, select: { id: true, schoolId: true, classId: true, term: true, academicYear: true, tuitionFee: true, labFee: true, libraryFee: true, sportsFee: true, examFee: true, otherFees: true, dueDate: true, class: { select: { name: true } }, school: { select: { name: true } } } }),
    session.user.role === "SUPER_ADMIN" ? prisma.school.findMany({ orderBy: { name: "asc" } }) : session.user.schoolId ? prisma.school.findMany({ where: { id: session.user.schoolId }, orderBy: { name: "asc" } }) : [],
    prisma.class.findMany({ where: whereScope, include: { school: true }, orderBy: { name: "asc" } }),
  ])
  if (!structure) notFound()
  return <div className="space-y-10 animate-fade-in"><div className="border-b border-[#e0e2e8] pb-8"><p className="mb-4 text-[11px] font-semibold uppercase tracking-[.2em] text-[#4262ff]">Planning & pricing</p><h1 className="text-4xl font-medium tracking-[-.055em] text-[#1c1c1e] sm:text-5xl">Edit fee plan.</h1><p className="mt-3 text-sm text-[#6b6f7e]">Update the structure for {structure.class.name} · {structure.term} {structure.academicYear}.</p></div><EditFeeStructureForm structure={{ ...structure, dueDate: structure.dueDate.toISOString() }} schools={schools as { id: string; name: string }[]} classes={classes as { id: string; name: string; school: { id: string; name: string } }[]} userRole={session.user.role || ""} /></div>
}
