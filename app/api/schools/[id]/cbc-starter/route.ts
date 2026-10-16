import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { clientIp, recordPlatformEvent } from "@/lib/platform/audit"
import { prisma } from "@/lib/prisma"
import { cbcGradeSequence } from "@/lib/curriculum/kenyaCbcReference"

function dateAtUtc(year: number, month: number, day: number, endOfDay = false) {
  return new Date(Date.UTC(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0))
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = requireRole(await auth(), ["SUPER_ADMIN"])
  if (!access.ok) return access.response
  const { id } = await params
  const body = await request.json().catch(() => null)
  const yearName = typeof body?.year === "string" ? body.year.trim() : ""
  if (!/^20\d{2}$/.test(yearName)) return NextResponse.json({ error: "Enter a four-digit academic year" }, { status: 400 })

  const yearNumber = Number(yearName)
  const startsOn = dateAtUtc(yearNumber, 1, 1)
  const endsOn = dateAtUtc(yearNumber, 12, 31, true)
  const terms = [
    { code: "TERM_1", name: "Term 1", startsOn: dateAtUtc(yearNumber, 1, 1), endsOn: dateAtUtc(yearNumber, 4, 30, true), sequence: 1 },
    { code: "TERM_2", name: "Term 2", startsOn: dateAtUtc(yearNumber, 5, 1), endsOn: dateAtUtc(yearNumber, 8, 31, true), sequence: 2 },
    { code: "TERM_3", name: "Term 3", startsOn: dateAtUtc(yearNumber, 9, 1), endsOn: dateAtUtc(yearNumber, 12, 31, true), sequence: 3 },
  ]

  try {
    const school = await prisma.school.findUnique({ where: { id }, select: { id: true, name: true } })
    if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 })

    const curriculum = await prisma.curriculum.findUnique({ where: { code: "CBC" }, select: { id: true } })
    if (!curriculum) return NextResponse.json({ error: "The CBC catalog is not installed" }, { status: 409 })
    const version = await prisma.curriculumVersion.findFirst({
      where: { curriculumId: curriculum.id, status: "PUBLISHED" },
      orderBy: [{ effectiveFrom: { sort: "desc", nulls: "last" } }, { version: "desc" }],
      select: { id: true, version: true },
    })
    if (!version) return NextResponse.json({ error: "There is no published CBC version to adopt" }, { status: 409 })

    const result = await prisma.$transaction(async (tx) => {
      await tx.academicYear.updateMany({ where: { schoolId: id, isCurrent: true }, data: { isCurrent: false } })
      const academicYear = await tx.academicYear.upsert({
        where: { schoolId_name: { schoolId: id, name: yearName } },
        update: { startsOn, endsOn, isCurrent: true },
        create: { schoolId: id, name: yearName, startsOn, endsOn, isCurrent: true },
      })

      for (const term of terms) {
        await tx.academicPeriod.upsert({
          where: { academicYearId_code: { academicYearId: academicYear.id, code: term.code } },
          update: { name: term.name, startsOn: term.startsOn, endsOn: term.endsOn, sequence: term.sequence },
          create: { academicYearId: academicYear.id, ...term },
        })
      }

      const code = `CBC_${yearName}`
      await tx.curriculumOffering.updateMany({ where: { schoolId: id, academicYearId: academicYear.id, isDefault: true }, data: { isDefault: false } })
      const offering = await tx.curriculumOffering.upsert({
        where: { schoolId_academicYearId_code: { schoolId: id, academicYearId: academicYear.id, code } },
        update: { name: `Kenya CBC ${yearName}`, curriculumId: curriculum.id, curriculumVersionId: version.id, status: "ACTIVE", isDefault: true },
        create: { schoolId: id, academicYearId: academicYear.id, curriculumId: curriculum.id, curriculumVersionId: version.id, code, name: `Kenya CBC ${yearName}`, status: "ACTIVE", isDefault: true },
      })
      const grades = await tx.curriculumNode.findMany({ where: { curriculumVersionId: version.id, nodeType: "GRADE" }, select: { code: true, title: true, sequence: true }, orderBy: { sequence: "asc" } })
      for (const grade of grades) {
        const sequence = cbcGradeSequence(grade.title)
        await tx.offeringGrade.upsert({
          where: { offeringId_gradeCode: { offeringId: offering.id, gradeCode: grade.code } },
          update: { displayName: grade.title, sequence },
          create: { offeringId: offering.id, gradeCode: grade.code, displayName: grade.title, sequence },
        })
      }
      return { academicYear, offering, termCount: terms.length, gradeCount: grades.length }
    })

    await recordPlatformEvent({
      actor: { id: access.user.id, email: access.user.email },
      action: "school.cbc_starter_created",
      targetType: "School",
      targetId: id,
      schoolId: id,
      metadata: { academicYear: yearName, curriculumVersion: version.version, terms: result.termCount, grades: result.gradeCount },
      ip: clientIp(request.headers),
    })
    return NextResponse.json({ ok: true, academicYear: result.academicYear.name, curriculum: result.offering.name, termsCreated: result.termCount, gradesAdded: result.gradeCount })
  } catch (error) {
    console.error("CBC starter provisioning error:", error)
    return NextResponse.json({ error: "Unable to create the CBC starter setup" }, { status: 500 })
  }
}