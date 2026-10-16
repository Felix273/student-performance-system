import { NextResponse } from "next/server"
import { auth } from "@/lib/auth-config"
import { requireRole } from "@/lib/authorization"
import { clientIp, recordPlatformEvent } from "@/lib/platform/audit"
import { prisma } from "@/lib/prisma"

const MAX_EXPORT_RECORDS = 100_000

export async function GET(request: Request) {
  const access = requireRole(await auth(), ["SCHOOL_ADMIN"])
  if (!access.ok) return access.response

  const schoolId = access.user.schoolId!
  const [school, usersCount, classesCount, subjectsCount, studentsCount, assessmentCount, attendanceCount, evidenceCount, feeStructureCount, timetableCount, planCount, enrollmentCount, bandMapCount, analysisCount, notificationCount, evidenceAuditCount, lessonSessionCount, lessonFocusCount] = await Promise.all([
    prisma.school.findUnique({ where: { id: schoolId }, select: { id: true, name: true, domain: true, schoolLevel: true, county: true, contactEmail: true, contactPhone: true, timezone: true, createdAt: true, subscription: { select: { status: true, startsAt: true, trialEndsAt: true, currentPeriodEndsAt: true, plan: { select: { code: true, name: true, maxStudents: true, maxStaff: true } } } } } }),
    prisma.user.count({ where: { schoolId, role: { in: ["SCHOOL_ADMIN", "TEACHER", "PARENT", "STUDENT"] } } }),
    prisma.class.count({ where: { schoolId } }),
    prisma.subject.count({ where: { schoolId } }),
    prisma.student.count({ where: { schoolId } }),
    prisma.assessment.count({ where: { schoolId } }),
    prisma.attendance.count({ where: { student: { schoolId } } }),
    prisma.assessmentEvidence.count({ where: { schoolId } }),
    prisma.feeStructure.count({ where: { schoolId } }),
    prisma.timetableEntry.count({ where: { schoolId } }),
    prisma.assessmentPlan.count({ where: { schoolId } }),
    prisma.learnerCurriculumEnrollment.count({ where: { schoolId } }),
    prisma.cbcPerformanceBandMap.count({ where: { schoolId } }),
    prisma.performanceAnalysis.count({ where: { student: { schoolId } } }),
    prisma.notification.count({ where: { schoolId } }),
    prisma.evidenceAuditEvent.count({ where: { schoolId } }),
    prisma.lessonWorkspaceSession.count({ where: { schoolId } }),
    prisma.lessonFocus.count({ where: { schoolId } }),
  ])
  const estimatedRows = usersCount + classesCount + subjectsCount + studentsCount + assessmentCount + attendanceCount + evidenceCount + feeStructureCount + timetableCount + planCount + enrollmentCount + bandMapCount + analysisCount + notificationCount + evidenceAuditCount + lessonSessionCount + lessonFocusCount
  if (estimatedRows > MAX_EXPORT_RECORDS) return NextResponse.json({ error: `This export contains ${estimatedRows} records, above the ${MAX_EXPORT_RECORDS} synchronous export limit. Contact support to arrange a secure bulk export.` }, { status: 413 })
  if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 })

  const [users, classes, subjects, students, academicYears, offerings, assignments, learnerEnrollments, cbcBandMaps, assessments, assessmentPlans, assessmentResults, attendance, evidence, analyses, feeStructures, timetable, notifications, notificationPreferences, evidenceAuditEvents, lessonSessions, lessonFocuses] = await Promise.all([
    prisma.user.findMany({ where: { schoolId, role: { in: ["SCHOOL_ADMIN", "TEACHER", "PARENT", "STUDENT"] } }, select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, lastLoginAt: true }, orderBy: { createdAt: "asc" } }),
    prisma.class.findMany({ where: { schoolId }, select: { id: true, name: true, grade: true, createdAt: true, teachers: { select: { teacher: { select: { id: true, name: true, email: true } }, subject: { select: { code: true, name: true } } } } }, orderBy: { name: "asc" } }),
    prisma.subject.findMany({ where: { schoolId }, select: { id: true, code: true, name: true, createdAt: true }, orderBy: { name: "asc" } }),
    prisma.student.findMany({ where: { schoolId }, select: { id: true, name: true, admissionNo: true, classId: true, userId: true, createdAt: true, updatedAt: true, class: { select: { name: true, grade: true } }, parents: { select: { parent: { select: { id: true, name: true, email: true } } } } }, orderBy: { admissionNo: "asc" } }),
    prisma.academicYear.findMany({ where: { schoolId }, include: { periods: { orderBy: { sequence: "asc" } } }, orderBy: { startsOn: "asc" } }),
    prisma.curriculumOffering.findMany({ where: { schoolId }, include: { curriculum: { select: { code: true, name: true } }, curriculumVersion: { select: { version: true } }, academicYear: { select: { name: true } }, grades: { orderBy: { sequence: "asc" } } }, orderBy: { createdAt: "asc" } }),
    prisma.classCurriculumAssignment.findMany({ where: { schoolId }, select: { id: true, classId: true, offeringId: true, offeringGradeId: true, academicYearId: true, periodId: true, status: true, createdAt: true } }),
    prisma.learnerCurriculumEnrollment.findMany({ where: { schoolId }, select: { id: true, studentId: true, offeringId: true, assignmentId: true, startsOn: true, endsOn: true, status: true, createdAt: true } }),
    prisma.cbcPerformanceBandMap.findMany({ where: { schoolId }, include: { bands: { orderBy: { sequence: "asc" } } }, orderBy: { createdAt: "asc" } }),
    prisma.assessment.findMany({ where: { schoolId }, select: { id: true, title: true, type: true, maxScore: true, classId: true, subjectId: true, assessmentPlanId: true, date: true, createdAt: true }, orderBy: { date: "asc" } }),
    prisma.assessmentPlan.findMany({ where: { schoolId }, select: { id: true, classAssignmentId: true, periodId: true, title: true, assessmentType: true, status: true, gradeScaleId: true, rubricId: true, weight: true, date: true, instructions: true, publicationMode: true, publishedAt: true, createdAt: true } }),
    prisma.assessmentResult.findMany({ where: { assessment: { schoolId } }, select: { id: true, score: true, studentId: true, assessmentId: true, createdAt: true, updatedAt: true }, orderBy: { createdAt: "asc" } }),
    prisma.attendance.findMany({ where: { student: { schoolId } }, select: { id: true, studentId: true, date: true, status: true, remarks: true, createdBy: true, createdAt: true }, orderBy: { date: "asc" } }),
    prisma.assessmentEvidence.findMany({ where: { schoolId }, select: { id: true, assessmentId: true, assessmentPlanId: true, studentId: true, learningOutcomeId: true, competencyId: true, evidenceType: true, numericScore: true, maxScore: true, masteryLevel: true, narrative: true, capturedById: true, capturedAt: true, status: true, reviewerId: true, reviewedAt: true, reviewReason: true, publishedAt: true, publishedVersion: true, publishedSnapshot: true, rubricScores: { select: { criterion: { select: { code: true, name: true } }, level: { select: { code: true, label: true, points: true } }, comment: true } } }, orderBy: { capturedAt: "asc" } }),
    prisma.performanceAnalysis.findMany({ where: { student: { schoolId } }, select: { id: true, studentId: true, analysisDate: true, overallGrade: true, strengths: true, weaknesses: true, recommendations: true, trend: true, aiInsights: true, createdAt: true } }),
    prisma.feeStructure.findMany({ where: { schoolId }, include: { applicableFees: true, payments: { select: { id: true, studentId: true, amountPaid: true, paymentDate: true, paymentMethod: true, transactionId: true, receiptNumber: true, status: true } } }, orderBy: { createdAt: "asc" } }),
    prisma.timetableEntry.findMany({ where: { schoolId }, select: { id: true, academicYearId: true, periodId: true, classId: true, teacherId: true, subjectId: true, day: true, startTime: true, endTime: true, room: true, notes: true, createdAt: true }, orderBy: [{ academicYearId: "asc" }, { day: "asc" }, { startTime: "asc" }] }),
    prisma.notification.findMany({ where: { schoolId }, select: { id: true, recipientId: true, studentId: true, evidenceId: true, type: true, title: true, message: true, href: true, readAt: true, createdAt: true } }),
    prisma.schoolNotificationPreference.findUnique({ where: { schoolId } }),
    prisma.evidenceAuditEvent.findMany({ where: { schoolId }, select: { id: true, evidenceId: true, planId: true, actorId: true, action: true, priorStatus: true, newStatus: true, reason: true, metadata: true, createdAt: true }, orderBy: { createdAt: "asc" } }),
    prisma.lessonWorkspaceSession.findMany({ where: { schoolId }, select: { id: true, timetableEntryId: true, teacherId: true, assessmentPlanId: true, state: true, lastClientRevision: true, lastSavedAt: true, submittedAt: true, closedAt: true, createdAt: true, updatedAt: true } }),
    prisma.lessonFocus.findMany({ where: { schoolId }, select: { id: true, timetableEntryId: true, curriculumNodeId: true, learningOutcomeId: true, competencyId: true, valueId: true, note: true, sequence: true, createdById: true, createdAt: true, updatedAt: true } }),
  ])

  await recordPlatformEvent({ actor: { id: access.user.id, email: access.user.email }, action: "school.data_exported", targetType: "School", targetId: schoolId, schoolId, metadata: { records: estimatedRows }, ip: clientIp(request.headers) })
  const payload = { format: "fentech-school-data-export-v1", generatedAt: new Date().toISOString(), school, users, classes, subjects, students, academicYears, curriculumOfferings: offerings, classCurriculumAssignments: assignments, learnerCurriculumEnrollments: learnerEnrollments, cbcPerformanceBandMaps: cbcBandMaps, assessments, assessmentPlans, assessmentResults, attendance, evidence, evidenceAuditEvents, performanceAnalyses: analyses, feeStructures, timetable, lessonSessions, lessonFocuses, notifications, notificationPreferences }
  return new NextResponse(JSON.stringify(payload), { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="${school.domain}-data-export-${new Date().toISOString().slice(0, 10)}.json"`, "Cache-Control": "private, no-store" } })
}
