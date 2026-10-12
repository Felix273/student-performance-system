import assert from "node:assert/strict"
import test from "node:test"
import { createRequire } from "node:module"
import path from "node:path"
import { randomUUID } from "node:crypto"
import { fileURLToPath } from "node:url"
import "dotenv/config"

const testDatabaseUrl = process.env.TEST_DATABASE_URL
const databaseIdentity = (value) => {
  const url = new URL(value)
  return `${url.hostname.replace("-pooler.", ".")}:${url.port}${url.pathname}`
}
if (testDatabaseUrl && process.env.DATABASE_URL && databaseIdentity(testDatabaseUrl) === databaseIdentity(process.env.DATABASE_URL)) {
  throw new Error("TEST_DATABASE_URL must be a dedicated database, not DATABASE_URL")
}

const request = (url, body) => ({
  url,
  nextUrl: new URL(url),
  json: async () => body,
})

test("two-school API authorization and publication boundaries", { skip: !testDatabaseUrl && "Set TEST_DATABASE_URL to a dedicated pre-migrated database" }, async () => {
  process.env.DATABASE_URL = testDatabaseUrl
  process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: "CommonJS", moduleResolution: "node" })

  const require = createRequire(import.meta.url)
  const Module = require("node:module")
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
  const resolveFilename = Module._resolveFilename
  Module._resolveFilename = function (specifier, parent, isMain, options) {
    const mapped = specifier.startsWith("@/") ? path.join(root, specifier.slice(2)) : specifier
    return resolveFilename.call(this, mapped, parent, isMain, options)
  }
  require("ts-node/register/transpile-only")

  let activeSession = null
  const authPath = require.resolve("../lib/auth-config.ts")
  require.cache[authPath] = { id: authPath, filename: authPath, loaded: true, exports: { auth: async () => activeSession } }

  const { prisma } = require("../lib/prisma.ts")
  const authorization = require("../lib/authorization.ts")
  const studentsRoute = require("../app/api/students/route.ts")
  const usersRoute = require("../app/api/users/route.ts")
  const classesRoute = require("../app/api/classes/route.ts")
  const attendanceRoute = require("../app/api/attendance/route.ts")
  const analyticsRoute = require("../app/api/analytics/[studentId]/route.ts")
  const feesRoute = require("../app/api/fees/structures/route.ts")
  const assessmentsRoute = require("../app/api/assessments/route.ts")
  const assessmentResultsRoute = require("../app/api/assessments/[id]/results/route.ts")
  const notificationsRoute = require("../app/api/notifications/route.ts")
  const evidenceRoute = require("../app/api/evidence/route.ts")
  const publishedEvidenceRoute = require("../app/api/parent/published-evidence/route.ts")
  const competencyProgressRoute = require("../app/api/students/[id]/competency-progress/route.ts")
  const planRoute = require("../app/api/assessment-plans/[id]/route.ts")
  const curriculumTreeRoute = require("../app/api/curriculum/tree/route.ts")
  const publishRoute = require("../app/api/evidence/[id]/publish/route.ts")
  const reviewRoute = require("../app/api/evidence/[id]/review/route.ts")
  const studentReportRoute = require("../app/api/reports/students-excel/route.ts")
  const cbcTermReportRoute = require("../app/api/reports/cbc-student-pdf/route.ts")
  const cbcBandMapsRoute = require("../app/api/settings/cbc-band-maps/route.ts")
  const cbcBandMapDetailRoute = require("../app/api/settings/cbc-band-maps/[id]/route.ts")
  const lessonRoute = require("../app/api/teacher/lesson/[timetableEntryId]/route.ts")
  const lessonAttendanceRoute = require("../app/api/teacher/lesson/[timetableEntryId]/attendance/route.ts")
  const lessonEvidenceRoute = require("../app/api/teacher/lesson/[timetableEntryId]/evidence/[studentId]/route.ts")
  const lessonSubmitRoute = require("../app/api/teacher/lesson/[timetableEntryId]/submit/route.ts")

  const suffix = randomUUID()
  const schoolIds = []
  const curriculumIds = []
  const versionIds = []

  async function createTenant(label) {
    const school = await prisma.school.create({ data: { name: `Security ${label} ${suffix}`, domain: `${label}-${suffix}.security.test` } })
    schoolIds.push(school.id)
    const [admin, teacher, parent] = await Promise.all([
      prisma.user.create({ data: { email: `admin-${label}-${suffix}@security.test`, name: `Admin ${label}`, password: "not-used", role: "SCHOOL_ADMIN", schoolId: school.id } }),
      prisma.user.create({ data: { email: `teacher-${label}-${suffix}@security.test`, name: `Teacher ${label}`, password: "not-used", role: "TEACHER", schoolId: school.id } }),
      prisma.user.create({ data: { email: `parent-${label}-${suffix}@security.test`, name: `Parent ${label}`, password: "not-used", role: "PARENT", schoolId: school.id } }),
    ])
    const classData = await prisma.class.create({ data: { name: `Class ${label}`, grade: "Grade 1", schoolId: school.id } })
    const subject = await prisma.subject.create({ data: { name: `Subject ${label}`, code: `S-${label}-${suffix}`, schoolId: school.id } })
    const otherSubject = await prisma.subject.create({ data: { name: `Other Subject ${label}`, code: `OS-${label}-${suffix}`, schoolId: school.id } })
    await prisma.teacherClass.create({ data: { teacherId: teacher.id, classId: classData.id, subjectId: subject.id } })
    const student = await prisma.student.create({ data: { name: `Student ${label}`, admissionNo: `A-${label}-${suffix}`, classId: classData.id, schoolId: school.id } })
    const peerStudent = await prisma.student.create({ data: { name: `Peer ${label}`, admissionNo: `P-${label}-${suffix}`, classId: classData.id, schoolId: school.id } })
    await prisma.parentStudent.create({ data: { parentId: parent.id, studentId: student.id } })
    const assessment = await prisma.assessment.create({ data: { title: `Assessment ${label}`, type: "QUIZ", maxScore: 10, classId: classData.id, subjectId: subject.id, schoolId: school.id, date: new Date("2026-10-01T00:00:00.000Z") } })
    await Promise.all([
      prisma.assessmentResult.create({ data: { studentId: student.id, assessmentId: assessment.id, score: 8 } }),
      prisma.assessmentResult.create({ data: { studentId: peerStudent.id, assessmentId: assessment.id, score: 1 } }),
    ])
    const attendance = await prisma.attendance.create({ data: { studentId: student.id, date: new Date("2026-10-01T00:00:00.000Z"), status: "PRESENT", createdBy: admin.id } })
    const fee = await prisma.feeStructure.create({ data: { schoolId: school.id, classId: classData.id, term: "Term 1", academicYear: "2026", tuitionFee: 10, totalAmount: 10, dueDate: new Date("2026-12-01T00:00:00.000Z") } })
    const notification = await prisma.notification.create({ data: { schoolId: school.id, recipientId: parent.id, studentId: student.id, type: "REPORT_PUBLISHED", title: "Test", message: "Test notification", eventKey: `security-${label}-${suffix}` } })
    const year = await prisma.academicYear.create({ data: { schoolId: school.id, name: "2026", startsOn: new Date("2026-01-01T00:00:00.000Z"), endsOn: new Date("2026-12-31T00:00:00.000Z"), isCurrent: true } })
    const period = await prisma.academicPeriod.create({ data: { academicYearId: year.id, name: "Term 1", code: `T1-${label}-${suffix}`, startsOn: new Date("2026-01-01T00:00:00.000Z"), endsOn: new Date("2026-04-30T00:00:00.000Z"), sequence: 1 } })
    const curriculum = await prisma.curriculum.create({ data: { code: `CUR-${label}-${suffix}`, name: `Curriculum ${label}` } })
    curriculumIds.push(curriculum.id)
    const version = await prisma.curriculumVersion.create({ data: { curriculumId: curriculum.id, version: "1", status: "DRAFT" } })
    versionIds.push(version.id)
    const rubric = await prisma.rubric.create({
      data: {
        curriculumVersionId: version.id,
        code: `R-${label}-${suffix}`,
        name: `Rubric ${label}`,
        criteria: {
          create: {
            code: `C-${label}`,
            name: "Observation",
            levels: { create: [{ code: "ME", label: "Meets expectations", points: 3 }] },
          },
        },
      },
      include: { criteria: { include: { levels: true } } },
    })
    const offering = await prisma.curriculumOffering.create({ data: { schoolId: school.id, curriculumId: curriculum.id, curriculumVersionId: version.id, academicYearId: year.id, name: `Offering ${label}`, code: `O-${label}-${suffix}` } })
    const offeringGrade = await prisma.offeringGrade.create({ data: { offeringId: offering.id, gradeCode: "G1", displayName: "Grade 1", sequence: 1 } })
    const assignment = await prisma.classCurriculumAssignment.create({ data: { schoolId: school.id, classId: classData.id, offeringId: offering.id, offeringGradeId: offeringGrade.id, academicYearId: year.id, periodId: period.id } })
    const plan = await prisma.assessmentPlan.create({ data: { schoolId: school.id, classAssignmentId: assignment.id, periodId: period.id, title: `Plan ${label}`, assessmentType: "FORMATIVE", status: "OPEN", rubricId: rubric.id, date: new Date("2026-10-01T00:00:00.000Z"), createdById: admin.id } })
    const timetableEntry = await prisma.timetableEntry.create({ data: { schoolId: school.id, academicYearId: year.id, periodId: period.id, classId: classData.id, teacherId: teacher.id, subjectId: subject.id, curriculumAssignmentId: assignment.id, day: "MONDAY", startTime: "08:00", endTime: "08:40" } })
    const evidence = await prisma.assessmentEvidence.create({ data: { schoolId: school.id, assessmentPlanId: plan.id, studentId: student.id, evidenceType: "SCORE", numericScore: 8, maxScore: 10, capturedById: teacher.id, status: "VERIFIED" } })
    return { school, admin, teacher, parent, classData, subject, otherSubject, student, peerStudent, assessment, attendance, fee, notification, year, period, curriculum, version, rubric, assignment, plan, timetableEntry, evidence }
  }

  const sessionFor = (user, role = user.role) => ({ user: { id: user.id, email: user.email, name: user.name, role, schoolId: user.schoolId } })

  try {
    const tenantA = await createTenant("a")
    const tenantB = await createTenant("b")
    const superAdmin = await prisma.user.create({ data: { email: `super-${suffix}@security.test`, name: "Platform Admin", password: "not-used", role: "SUPER_ADMIN" } })
    const studentUser = await prisma.user.create({ data: { email: `student-${suffix}@security.test`, name: "Student Account", password: "not-used", role: "STUDENT", schoolId: tenantA.school.id } })
    const routeResponse = async (response) => ({ status: response.status, body: await response.json() })

    activeSession = sessionFor(tenantB.teacher)
    assert.equal((await routeResponse(await lessonRoute.GET(request(`http://local/api/teacher/lesson/${tenantA.timetableEntry.id}`), { params: Promise.resolve({ timetableEntryId: tenantA.timetableEntry.id }) }))).status, 404)
    activeSession = sessionFor(tenantA.teacher)
    const lessonContext = await routeResponse(await lessonRoute.GET(request(`http://local/api/teacher/lesson/${tenantA.timetableEntry.id}`), { params: Promise.resolve({ timetableEntryId: tenantA.timetableEntry.id }) }))
    assert.equal(lessonContext.status, 200)
    assert.equal(lessonContext.body.context.curriculum.status, "ready")
    assert.equal(lessonContext.body.learners.length, 2)

    const savedLessonAttendance = await routeResponse(await lessonAttendanceRoute.PUT(request(`http://local/api/teacher/lesson/${tenantA.timetableEntry.id}/attendance`, {
      date: "2026-10-12",
      expectedRevision: lessonContext.body.session.revision,
      records: [
        { studentId: tenantA.student.id, status: "PRESENT" },
        { studentId: tenantB.student.id, status: "PRESENT" },
      ],
    }), { params: Promise.resolve({ timetableEntryId: tenantA.timetableEntry.id }) }))
    assert.equal(savedLessonAttendance.status, 207)
    assert.equal(savedLessonAttendance.body.savedCount, 1)
    assert.equal(savedLessonAttendance.body.failures.length, 1)

    const studentDraft = await routeResponse(await lessonEvidenceRoute.PUT(request(`http://local/api/teacher/lesson/${tenantA.timetableEntry.id}/evidence/${tenantA.student.id}`, {
      assessmentPlanId: tenantA.plan.id,
      evidenceType: "RUBRIC",
      narrative: "Lesson workspace draft",
      rubricScores: [{ criterionId: tenantA.rubric.criteria[0].id, levelId: tenantA.rubric.criteria[0].levels[0].id }],
      expectedRevision: savedLessonAttendance.body.revision,
    }), { params: Promise.resolve({ timetableEntryId: tenantA.timetableEntry.id, studentId: tenantA.student.id }) }))
    assert.equal(studentDraft.status, 201)
    assert.equal(studentDraft.body.status, "DRAFT")

    const incompleteSubmit = await routeResponse(await lessonSubmitRoute.POST(request(`http://local/api/teacher/lesson/${tenantA.timetableEntry.id}/submit`, {
      assessmentPlanId: tenantA.plan.id,
      expectedRevision: studentDraft.body.workspaceRevision,
    }), { params: Promise.resolve({ timetableEntryId: tenantA.timetableEntry.id }) }))
    assert.equal(incompleteSubmit.status, 409)
    assert.deepEqual(incompleteSubmit.body.missingStudentIds, [tenantA.peerStudent.id])

    const peerDraft = await routeResponse(await lessonEvidenceRoute.PUT(request(`http://local/api/teacher/lesson/${tenantA.timetableEntry.id}/evidence/${tenantA.peerStudent.id}`, {
      assessmentPlanId: tenantA.plan.id,
      evidenceType: "RUBRIC",
      narrative: "Peer learner draft",
      rubricScores: [{ criterionId: tenantA.rubric.criteria[0].id, levelId: tenantA.rubric.criteria[0].levels[0].id }],
      expectedRevision: studentDraft.body.workspaceRevision,
    }), { params: Promise.resolve({ timetableEntryId: tenantA.timetableEntry.id, studentId: tenantA.peerStudent.id }) }))
    assert.equal(peerDraft.status, 201)

    const submittedLesson = await routeResponse(await lessonSubmitRoute.POST(request(`http://local/api/teacher/lesson/${tenantA.timetableEntry.id}/submit`, {
      assessmentPlanId: tenantA.plan.id,
      expectedRevision: peerDraft.body.workspaceRevision,
    }), { params: Promise.resolve({ timetableEntryId: tenantA.timetableEntry.id }) }))
    assert.equal(submittedLesson.status, 200)
    assert.equal(submittedLesson.body.submittedCount, 2)
    assert.equal(await prisma.assessmentEvidence.count({ where: { assessmentPlanId: tenantA.plan.id, studentId: { in: [tenantA.student.id, tenantA.peerStudent.id] }, status: "SUBMITTED" } }), 2)
    assert.equal(await prisma.evidenceAuditEvent.count({ where: { planId: tenantA.plan.id, action: "SUBMITTED" } }), 2)
    assert.equal(await prisma.rubricCriterionScore.count({ where: { evidence: { assessmentPlanId: tenantA.plan.id, studentId: { in: [tenantA.student.id, tenantA.peerStudent.id] } } } }), 2)

    const submittedStudentEvidence = await prisma.assessmentEvidence.findFirst({ where: { assessmentPlanId: tenantA.plan.id, studentId: tenantA.student.id, capturedById: tenantA.teacher.id, status: "SUBMITTED" }, select: { id: true, updatedAt: true } })
    activeSession = sessionFor(tenantA.admin)
    assert.equal((await routeResponse(await reviewRoute.PATCH(request(`http://local/api/evidence/${submittedStudentEvidence.id}`, { decision: "RETURNED", reason: "Add a clearer observation" }), { params: Promise.resolve({ id: submittedStudentEvidence.id }) }))).status, 200)
    activeSession = sessionFor(tenantA.teacher)
    const returnedWorkspace = await routeResponse(await lessonRoute.GET(request(`http://local/api/teacher/lesson/${tenantA.timetableEntry.id}`), { params: Promise.resolve({ timetableEntryId: tenantA.timetableEntry.id }) }))
    assert.equal(returnedWorkspace.body.session.state, "RETURNED")
    const returnedEvidence = returnedWorkspace.body.learners.find((learner) => learner.id === tenantA.student.id).evidence.find((item) => item.id === submittedStudentEvidence.id)
    const correctedDraft = await routeResponse(await lessonEvidenceRoute.PUT(request(`http://local/api/teacher/lesson/${tenantA.timetableEntry.id}/evidence/${tenantA.student.id}`, {
      evidenceId: submittedStudentEvidence.id,
      expectedUpdatedAt: returnedEvidence.updatedAt,
      expectedRevision: returnedWorkspace.body.session.revision,
      assessmentPlanId: tenantA.plan.id,
      evidenceType: "RUBRIC",
      narrative: "Updated after moderator feedback",
      rubricScores: [{ criterionId: tenantA.rubric.criteria[0].id, levelId: tenantA.rubric.criteria[0].levels[0].id }],
    }), { params: Promise.resolve({ timetableEntryId: tenantA.timetableEntry.id, studentId: tenantA.student.id }) }))
    assert.equal(correctedDraft.status, 200)
    assert.equal(correctedDraft.body.status, "DRAFT")
    const resubmittedLesson = await routeResponse(await lessonSubmitRoute.POST(request(`http://local/api/teacher/lesson/${tenantA.timetableEntry.id}/submit`, {
      assessmentPlanId: tenantA.plan.id,
      studentIds: [tenantA.student.id],
      expectedRevision: correctedDraft.body.workspaceRevision,
    }), { params: Promise.resolve({ timetableEntryId: tenantA.timetableEntry.id }) }))
    assert.equal(resubmittedLesson.status, 200)
    assert.equal(resubmittedLesson.body.submittedCount, 1)

    activeSession = sessionFor(tenantA.admin)
    const studentAccount = await routeResponse(await usersRoute.POST(request("http://local/api/users", {
      email: `linked-student-${suffix}@security.test`,
      password: "secure-test-password",
      name: "Linked Student",
      role: "STUDENT",
      studentIds: [tenantA.student.id],
    })))
    assert.equal(studentAccount.status, 201)
    const linkedStudent = await prisma.student.findUnique({ where: { id: tenantA.student.id }, select: { userId: true } })
    assert.equal(linkedStudent.userId, studentAccount.body.user.id)

    const crossSchoolStudentAccount = await routeResponse(await usersRoute.POST(request("http://local/api/users", {
      email: `foreign-student-${suffix}@security.test`,
      password: "secure-test-password",
      name: "Foreign Student",
      role: "STUDENT",
      studentIds: [tenantB.student.id],
    })))
    assert.equal(crossSchoolStudentAccount.status, 400)

    const duplicateStudentAccount = await routeResponse(await usersRoute.POST(request("http://local/api/users", {
      email: `duplicate-student-${suffix}@security.test`,
      password: "secure-test-password",
      name: "Duplicate Student",
      role: "STUDENT",
      studentIds: [tenantA.student.id],
    })))
    assert.equal(duplicateStudentAccount.status, 400)

    const createdBandMap = await routeResponse(await cbcBandMapsRoute.POST(request("http://local/api/settings/cbc-band-maps", { academicYearId: tenantA.year.id, scope: "GRADE", scopeCode: "Grade 1", subjectId: tenantA.subject.id })))
    assert.equal(createdBandMap.status, 201)
    assert.equal(createdBandMap.body.subject.id, tenantA.subject.id)
    const secondSubjectBandMap = await routeResponse(await cbcBandMapsRoute.POST(request("http://local/api/settings/cbc-band-maps", { academicYearId: tenantA.year.id, scope: "GRADE", scopeCode: "Grade 1", subjectId: tenantA.otherSubject.id })))
    assert.equal(secondSubjectBandMap.status, 201)
    assert.equal(secondSubjectBandMap.body.subject.id, tenantA.otherSubject.id)
    const foreignYearMap = await routeResponse(await cbcBandMapsRoute.POST(request("http://local/api/settings/cbc-band-maps", { academicYearId: tenantB.year.id, scope: "SCHOOL" })))
    assert.equal(foreignYearMap.status, 404)
    const savedBandMap = await routeResponse(await cbcBandMapDetailRoute.PATCH(request("http://local/api/settings/cbc-band-maps/" + createdBandMap.body.id, { bands: [{ code: "SCHOOL_DEFINED", label: "Policy supplied label", parentLevelCode: "EE", minPercent: 31.25, maxPercent: 63.75 }] }), { params: Promise.resolve({ id: createdBandMap.body.id }) }))
    assert.equal(savedBandMap.status, 200)
    assert.equal(savedBandMap.body.bands[0].code, "SCHOOL_DEFINED")
    assert.equal(savedBandMap.body.bands[0].parentLevelCode, "EE")
    assert.equal(savedBandMap.body.bands[0].minPercent, 31.25)
    activeSession = sessionFor(tenantA.teacher)
    const teacherClassMap = await routeResponse(await cbcBandMapsRoute.POST(request("http://local/api/settings/cbc-band-maps", { academicYearId: tenantA.year.id, scope: "CLASS", classId: tenantA.classData.id, subjectId: tenantA.subject.id })))
    assert.equal(teacherClassMap.status, 201)
    assert.equal(teacherClassMap.body.class.id, tenantA.classData.id)
    assert.equal(teacherClassMap.body.subject.id, tenantA.subject.id)
    const unassignedSubjectMap = await routeResponse(await cbcBandMapsRoute.POST(request("http://local/api/settings/cbc-band-maps", { academicYearId: tenantA.year.id, scope: "CLASS", classId: tenantA.classData.id, subjectId: tenantA.otherSubject.id })))
    assert.equal(unassignedSubjectMap.status, 403)
    const teacherSchoolMap = await routeResponse(await cbcBandMapsRoute.POST(request("http://local/api/settings/cbc-band-maps", { academicYearId: tenantA.year.id, scope: "SCHOOL" })))
    assert.equal(teacherSchoolMap.status, 403)
    const teacherMaps = await routeResponse(await cbcBandMapsRoute.GET())
    assert.equal(teacherMaps.status, 200)
    assert.equal(teacherMaps.body.maps.length, 1)
    assert.equal(teacherMaps.body.maps[0].id, teacherClassMap.body.id)
    const teacherSavedBandMap = await routeResponse(await cbcBandMapDetailRoute.PATCH(request("http://local/api/settings/cbc-band-maps/" + teacherClassMap.body.id, { bands: [{ code: "TEACHER_DEFINED", label: "Teacher supplied label", minPercent: 0, maxPercent: 100 }] }), { params: Promise.resolve({ id: teacherClassMap.body.id }) }))
    assert.equal(teacherSavedBandMap.status, 200)
    activeSession = sessionFor(tenantB.admin)
    const crossTenantMapUpdate = await routeResponse(await cbcBandMapDetailRoute.PATCH(request("http://local/api/settings/cbc-band-maps/" + createdBandMap.body.id, { bands: [] }), { params: Promise.resolve({ id: createdBandMap.body.id }) }))
    assert.equal(crossTenantMapUpdate.status, 404)
    activeSession = sessionFor(tenantA.admin)

    activeSession = sessionFor(tenantA.admin)
    assert.equal((await routeResponse(await curriculumTreeRoute.POST(request("http://local/api/curriculum/tree", { curriculumVersionId: tenantA.version.id, title: "Unauthorized edit", code: "NOPE", nodeType: "STRAND" })))).status, 403)
    activeSession = sessionFor(superAdmin)
    assert.equal((await routeResponse(await curriculumTreeRoute.GET(request(`http://local/api/curriculum/tree?versionId=${tenantA.version.id}`)))).status, 200)
    const rootNode = await routeResponse(await curriculumTreeRoute.POST(request("http://local/api/curriculum/tree", { curriculumVersionId: tenantA.version.id, title: "Root A", code: `ROOT-A-${suffix}`, nodeType: "STRAND" })))
    const foreignParent = await routeResponse(await curriculumTreeRoute.POST(request("http://local/api/curriculum/tree", { curriculumVersionId: tenantB.version.id, title: "Root B", code: `ROOT-B-${suffix}`, nodeType: "STRAND" })))
    assert.equal(rootNode.status, 201)
    assert.equal(foreignParent.status, 201)
    assert.equal((await routeResponse(await curriculumTreeRoute.POST(request("http://local/api/curriculum/tree", { curriculumVersionId: tenantA.version.id, parentId: foreignParent.body.id, title: "Cross-version child", code: `CHILD-${suffix}`, nodeType: "STRAND" })))).status, 400)

    activeSession = sessionFor(tenantA.admin)
    const schoolScope = authorization.schoolScope(activeSession, tenantB.school.id)
    assert.equal(schoolScope.ok, true)
    assert.equal(schoolScope.schoolId, tenantA.school.id)

    for (const [route, url, collection] of [
      [studentsRoute, "http://local/api/students?schoolId=" + tenantB.school.id, true],
      [classesRoute, "http://local/api/classes?schoolId=" + tenantB.school.id, true],
      [assessmentsRoute, "http://local/api/assessments?schoolId=" + tenantB.school.id, true],
      [feesRoute, "http://local/api/fees/structures?schoolId=" + tenantB.school.id, true],
    ]) {
      const result = await routeResponse(await route.GET(request(url)))
      assert.equal(result.status, 200)
      assert.ok(result.body.length > 0)
      assert.ok(result.body.every((item) => item.schoolId === tenantA.school.id))
      assert.equal(result.body.some((item) => item.schoolId === tenantB.school.id), false)
    }

    assert.equal((await routeResponse(await studentsRoute.POST(request("http://local/api/students", { name: "Injected", admissionNo: `X-${suffix}`, classId: tenantB.classData.id, schoolId: tenantB.school.id })))).status, 400)
    const scopedClass = await routeResponse(await classesRoute.POST(request("http://local/api/classes", { name: `Scoped ${suffix}`, grade: "Grade 1", schoolId: tenantB.school.id })))
    assert.equal(scopedClass.status, 201)
    assert.equal(scopedClass.body.schoolId, tenantA.school.id)
    assert.equal((await routeResponse(await assessmentsRoute.POST(request("http://local/api/assessments", { title: "Injected", type: "QUIZ", maxScore: 10, classId: tenantB.classData.id, subjectId: tenantB.subject.id, schoolId: tenantB.school.id, date: "2026-10-01" })))).status, 400)
    assert.equal((await routeResponse(await assessmentResultsRoute.POST(request("http://local/api/assessments/" + tenantB.assessment.id + "/results", { results: [{ studentId: tenantB.student.id, score: 5 }] }), { params: Promise.resolve({ id: tenantB.assessment.id }) }))).status, 403)
    assert.equal((await routeResponse(await feesRoute.POST(request("http://local/api/fees/structures", { schoolId: tenantB.school.id, classId: tenantB.classData.id, term: "Term 2", academicYear: "2026", tuitionFee: 1, labFee: 0, libraryFee: 0, sportsFee: 0, examFee: 0, otherFees: 0, totalAmount: 1, dueDate: "2026-12-01" })))).status, 404)
    activeSession = sessionFor(tenantA.teacher)
    assert.equal((await routeResponse(await studentReportRoute.GET(request(`http://local/api/reports/students-excel?schoolId=${tenantA.school.id}&classId=${tenantB.classData.id}`)))).status, 404)
    activeSession = sessionFor(tenantA.admin)
    assert.equal((await routeResponse(await evidenceRoute.GET(request(`http://local/api/evidence?assessmentId=${tenantB.assessment.id}`)))).status, 404)
    assert.equal((await routeResponse(await planRoute.GET(request("http://local/api/assessment-plans/" + tenantB.plan.id), { params: Promise.resolve({ id: tenantB.plan.id }) }))).status, 404)

    activeSession = sessionFor(tenantA.teacher)
    assert.equal((await authorization.canAccessClass(activeSession, tenantB.classData.id)).ok, false)
    assert.equal((await routeResponse(await attendanceRoute.GET(request(`http://local/api/attendance?classId=${tenantB.classData.id}`)))).status, 403)
    assert.equal((await routeResponse(await attendanceRoute.POST(request("http://local/api/attendance", { classId: tenantB.classData.id, records: [{ studentId: tenantB.student.id, date: "2026-10-02", status: "PRESENT" }] })))).status, 403)
    assert.equal((await routeResponse(await evidenceRoute.POST(request("http://local/api/evidence", { assessmentPlanId: tenantB.plan.id, studentId: tenantB.student.id, evidenceType: "SCORE" })))).status, 403)
    assert.equal((await routeResponse(await assessmentsRoute.POST(request("http://local/api/assessments", {})))).status, 403)
    assert.equal((await routeResponse(await feesRoute.POST(request("http://local/api/fees/structures", {})))).status, 403)

    activeSession = sessionFor(tenantA.parent)
    assert.equal((await authorization.canAccessStudent(activeSession, tenantA.student.id)).ok, true)
    assert.equal((await authorization.canAccessStudent(activeSession, tenantB.student.id)).ok, false)
    assert.equal((await routeResponse(await publishedEvidenceRoute.GET(request(`http://local/api/parent/published-evidence?studentId=${tenantB.student.id}`)))).status, 403)
    const parentAnalytics = await routeResponse(await analyticsRoute.GET(request(`http://local/api/analytics/${tenantA.student.id}`), { params: Promise.resolve({ studentId: tenantA.student.id }) }))
    assert.equal(parentAnalytics.status, 200)
    assert.equal("average" in parentAnalytics.body.performanceTrend[0], false)
    const pendingProgress = await routeResponse(await competencyProgressRoute.GET(request(`http://local/api/students/${tenantA.student.id}/competency-progress`), { params: Promise.resolve({ id: tenantA.student.id }) }))
    assert.equal(pendingProgress.status, 200)
    assert.equal(pendingProgress.body.summary.evidenceCount, 0)
    const parentNotifications = await routeResponse(await notificationsRoute.GET(request("http://local/api/notifications")))
    assert.equal(parentNotifications.status, 200)
    assert.ok(parentNotifications.body.notifications.every((item) => item.id !== tenantB.notification.id))
    assert.equal((await routeResponse(await notificationsRoute.PATCH(request("http://local/api/notifications", { ids: [tenantB.notification.id] })))).body.updated, 0)

    activeSession = sessionFor(tenantA.admin)
    assert.equal((await routeResponse(await publishRoute.PATCH(request("http://local/api/evidence/" + tenantB.evidence.id, {}), { params: Promise.resolve({ id: tenantB.evidence.id }) }))).status, 404)
    assert.equal((await prisma.assessmentEvidence.findUnique({ where: { id: tenantB.evidence.id }, select: { status: true } })).status, "VERIFIED")
    activeSession = sessionFor(tenantA.parent)
    assert.equal((await routeResponse(await publishRoute.PATCH(request("http://local/api/evidence/" + tenantA.evidence.id, {}), { params: Promise.resolve({ id: tenantA.evidence.id }) }))).status, 403)
    assert.equal((await routeResponse(await reviewRoute.PATCH(request("http://local/api/evidence/" + tenantA.evidence.id, { decision: "VERIFIED" }), { params: Promise.resolve({ id: tenantA.evidence.id }) }))).status, 403)
    activeSession = sessionFor(studentUser)
    assert.equal((await routeResponse(await studentsRoute.GET(request("http://local/api/students")))).status, 403)
    activeSession = sessionFor(superAdmin)
    assert.equal((await routeResponse(await studentsRoute.GET(request("http://local/api/students")))).status, 403)

    activeSession = sessionFor(tenantA.admin)
    const beforePublication = await prisma.notification.count({ where: { studentId: tenantA.student.id, evidenceId: tenantA.evidence.id } })
    assert.equal(beforePublication, 0)
    activeSession = sessionFor(tenantA.parent)
    const unpublishedReport = await cbcTermReportRoute.GET(request(`http://local/api/reports/cbc-student-pdf?studentId=${tenantA.student.id}&periodId=${tenantA.period.id}`))
    assert.equal(unpublishedReport.status, 404)
    activeSession = sessionFor(tenantA.admin)
    assert.equal((await routeResponse(await publishRoute.PATCH(request("http://local/api/evidence/" + tenantA.evidence.id, {}), { params: Promise.resolve({ id: tenantA.evidence.id }) }))).status, 200)
    const publishedEvidence = await prisma.assessmentEvidence.findUnique({ where: { id: tenantA.evidence.id }, select: { status: true, publishedVersion: true, publishedSnapshot: true } })
    assert.equal(publishedEvidence.status, "PUBLISHED")
    assert.equal(publishedEvidence.publishedVersion, 1)
    assert.ok(publishedEvidence.publishedSnapshot)
    assert.equal(await prisma.evidenceAuditEvent.count({ where: { evidenceId: tenantA.evidence.id, schoolId: tenantA.school.id, action: "PUBLISHED" } }), 1)
    assert.equal(await prisma.notification.count({ where: { studentId: tenantA.student.id, evidenceId: tenantA.evidence.id, recipientId: tenantA.parent.id } }), 1)
    activeSession = sessionFor(tenantA.parent)
    const cbcReport = await cbcTermReportRoute.GET(request(`http://local/api/reports/cbc-student-pdf?studentId=${tenantA.student.id}&periodId=${tenantA.period.id}`))
    assert.equal(cbcReport.status, 200)
    assert.equal(cbcReport.headers.get("content-type"), "application/pdf")
    assert.equal(Buffer.from(await cbcReport.arrayBuffer()).subarray(0, 4).toString(), "%PDF")
    const foreignCbcReport = await cbcTermReportRoute.GET(request(`http://local/api/reports/cbc-student-pdf?studentId=${tenantB.student.id}&periodId=${tenantB.period.id}`))
    assert.equal(foreignCbcReport.status, 403)
    const visibleEvidence = await routeResponse(await publishedEvidenceRoute.GET(request(`http://local/api/parent/published-evidence?studentId=${tenantA.student.id}`)))
    assert.equal(visibleEvidence.status, 200)
    assert.equal(visibleEvidence.body.length, 1)
    const publishedProgress = await routeResponse(await competencyProgressRoute.GET(request(`http://local/api/students/${tenantA.student.id}/competency-progress`), { params: Promise.resolve({ id: tenantA.student.id }) }))
    assert.equal(publishedProgress.body.summary.evidenceCount, 1)
  } finally {
    if (schoolIds.length) {
      await prisma.evidenceAuditEvent.deleteMany({ where: { schoolId: { in: schoolIds } } })
      await prisma.cbcPerformanceBandMap.deleteMany({ where: { schoolId: { in: schoolIds } } })
      await prisma.curriculumNode.deleteMany({ where: { curriculumVersionId: { in: versionIds } } })
      await prisma.notification.deleteMany({ where: { schoolId: { in: schoolIds } } })
      await prisma.assessmentEvidence.deleteMany({ where: { schoolId: { in: schoolIds } } })
      await prisma.assessmentResult.deleteMany({ where: { student: { schoolId: { in: schoolIds } } } })
      await prisma.attendance.deleteMany({ where: { student: { schoolId: { in: schoolIds } } } })
      await prisma.feeStructure.deleteMany({ where: { schoolId: { in: schoolIds } } })
      await prisma.assessmentPlan.deleteMany({ where: { schoolId: { in: schoolIds } } })
      await prisma.classCurriculumAssignment.deleteMany({ where: { schoolId: { in: schoolIds } } })
      await prisma.curriculumOffering.deleteMany({ where: { schoolId: { in: schoolIds } } })
      await prisma.offeringGrade.deleteMany({ where: { offering: { schoolId: { in: schoolIds } } } })
      await prisma.academicPeriod.deleteMany({ where: { academicYear: { schoolId: { in: schoolIds } } } })
      await prisma.academicYear.deleteMany({ where: { schoolId: { in: schoolIds } } })
      await prisma.assessment.deleteMany({ where: { schoolId: { in: schoolIds } } })
      await prisma.parentStudent.deleteMany({ where: { student: { schoolId: { in: schoolIds } } } })
      await prisma.teacherClass.deleteMany({ where: { class: { schoolId: { in: schoolIds } } } })
      await prisma.student.deleteMany({ where: { schoolId: { in: schoolIds } } })
      await prisma.class.deleteMany({ where: { schoolId: { in: schoolIds } } })
      await prisma.subject.deleteMany({ where: { schoolId: { in: schoolIds } } })
      await prisma.user.deleteMany({ where: { OR: [{ schoolId: { in: schoolIds } }, { email: `super-${suffix}@security.test` }] } })
      await prisma.rubric.deleteMany({ where: { curriculumVersionId: { in: versionIds } } })
      await prisma.curriculumVersion.deleteMany({ where: { curriculumId: { in: curriculumIds } } })
      await prisma.curriculum.deleteMany({ where: { id: { in: curriculumIds } } })
      await prisma.school.deleteMany({ where: { id: { in: schoolIds } } })
    }
    await prisma.$disconnect()
    Module._resolveFilename = resolveFilename
  }
})