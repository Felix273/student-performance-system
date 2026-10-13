require("dotenv").config({ quiet: true })

const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")
const crypto = require("node:crypto")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")

const TARGET_HOST = "ep-icy-wind-b5ps40rx-pooler.c-7.us-east-2.aws.neon.tech"
const TARGET_DATABASE = "neondb"
const CONFIRMATION = "ERASE PRODUCTION neondb AND REBUILD MILIMANI"
const SCHOOL_NAME = "Milimani Comprehensive School"
const SCHOOL_DOMAIN = "milimani-comprehensive"
const EMAIL_DOMAIN = "milimani-comprehensive.test"
const passwordCost = 12

const stages = [
  { code: "PRE-PRIMARY", title: "Pre-Primary", sequence: 0, grades: [{ code: "PP1", title: "PP1" }, { code: "PP2", title: "PP2" }] },
  { code: "LOWER-PRIMARY", title: "Lower Primary", sequence: 1, grades: [1, 2, 3].map((grade) => ({ code: `G${grade}`, title: `Grade ${grade}` })) },
  { code: "UPPER-PRIMARY", title: "Upper Primary", sequence: 2, grades: [4, 5, 6].map((grade) => ({ code: `G${grade}`, title: `Grade ${grade}` })) },
  { code: "JUNIOR-SCHOOL", title: "Junior School", sequence: 3, grades: [7, 8, 9].map((grade) => ({ code: `G${grade}`, title: `Grade ${grade}` })) },
  { code: "SENIOR-SCHOOL", title: "Senior School", sequence: 4, grades: [10, 11, 12].map((grade) => ({ code: `G${grade}`, title: `Grade ${grade}` })) },
]

const nameParts = [
  ["Amani", "Baraka", "Chao", "Doto", "Eshe", "Faraji", "Imani", "Jabari", "Kamau", "Lela", "Malaika", "Nia", "Omari", "Pendo", "Rafiki", "Sade", "Taji", "Zawadi", "Kito", "Neema"],
  ["Abara", "Adhiambo", "Akinyi", "Biko", "Chebet", "Kamau", "Kariuki", "Kendi", "Kiptoo", "Mbugua", "Moraa", "Muthoni", "Njoroge", "Odhiambo", "Omondi", "Rotich", "Wanjiku", "Wekesa", "Were", "Mwangi"],
]

function databaseTarget() {
  const raw = process.env.DATABASE_URL
  if (!raw) throw new Error("DATABASE_URL is not configured")
  const url = new URL(raw)
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""))
  if (url.hostname !== TARGET_HOST || database !== TARGET_DATABASE) {
    throw new Error(`Refusing database target ${url.hostname}/${database}; expected the explicitly approved Neon target`)
  }
  return { host: url.hostname, database }
}

function learnerName(grade, index) {
  const first = nameParts[0][(index - 1) % nameParts[0].length]
  const last = nameParts[1][(index * 7 - 1) % nameParts[1].length]
  return `Simulated ${first} ${last} (${grade.code} ${String(index).padStart(3, "0")})`
}

function makeCredentialsFile(credentials) {
  const directory = path.join(os.homedir(), ".local", "share", "student-performance-system")
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 })
  fs.chmodSync(directory, 0o700)
  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  const filePath = path.join(directory, `milimani-initial-credentials-${stamp}.txt`)
  const content = [
    `${SCHOOL_NAME} initial staff credentials`,
    "Store in a password manager and remove this file after secure import.",
    "",
    `School admin: ${credentials.admin.email}`,
    `School admin password: ${credentials.admin.password}`,
    "",
    ...Object.values(credentials.teachers).flatMap((teacher) => [`${teacher.name}: ${teacher.email}`, `Password: ${teacher.password}`, ""]),
  ].join("\n")
  fs.writeFileSync(filePath, content, { flag: "wx", mode: 0o600 })
  fs.chmodSync(filePath, 0o600)
  return filePath
}

async function snapshot(db) {
  const cbc = await db.curriculum.findUnique({
    where: { code: "CBC" },
    include: { versions: { where: { version: "2026.1", status: "PUBLISHED" }, select: { id: true } } },
  })
  if (!cbc || cbc.versions.length !== 1) throw new Error("Published CBC 2026.1 master curriculum is missing or ambiguous")
  const [schools, users, classes, students, gradeNodes] = await Promise.all([
    db.school.findMany({ select: { name: true, domain: true } }),
    db.user.count(),
    db.class.count(),
    db.student.count(),
    db.curriculumNode.count({ where: { curriculumVersionId: cbc.versions[0].id, nodeType: "GRADE" } }),
  ])
  return { cbcVersionId: cbc.versions[0].id, schools, users, classes, students, existingCbcGradeNodes: gradeNodes }
}

async function rebuild(tx, cbcVersionId, staff, hashes) {
  await tx.$executeRawUnsafe('TRUNCATE TABLE "School", "User" RESTART IDENTITY CASCADE')

  const school = await tx.school.create({ data: { name: SCHOOL_NAME, domain: SCHOOL_DOMAIN } })
  const academicYear = await tx.academicYear.create({
    data: {
      schoolId: school.id,
      name: "2026",
      startsOn: new Date("2026-01-01T00:00:00.000Z"),
      endsOn: new Date("2026-12-31T23:59:59.999Z"),
      isCurrent: true,
    },
  })
  const periods = await Promise.all([
    ["TERM_1", "Term 1", "2026-01-01", "2026-04-30", 1],
    ["TERM_2", "Term 2", "2026-05-01", "2026-08-31", 2],
    ["TERM_3", "Term 3", "2026-09-01", "2026-12-31", 3],
  ].map(([code, name, startsOn, endsOn, sequence]) => tx.academicPeriod.create({
    data: {
      academicYearId: academicYear.id,
      code,
      name,
      startsOn: new Date(`${startsOn}T00:00:00.000Z`),
      endsOn: new Date(`${endsOn}T23:59:59.999Z`),
      sequence,
    },
  })))
  const activePeriod = periods.find((period) => period.code === "TERM_3")
  const curriculum = await tx.curriculum.findUniqueOrThrow({ where: { code: "CBC" } })
  const offering = await tx.curriculumOffering.create({
    data: {
      schoolId: school.id,
      curriculumId: curriculum.id,
      curriculumVersionId: cbcVersionId,
      academicYearId: academicYear.id,
      name: "Kenya CBC 2026",
      code: "KE_CBC_2026",
      status: "ACTIVE",
      isDefault: true,
    },
  })

  const schoolClasses = []
  let sequence = 0
  for (const stage of stages) {
    const stageNode = await tx.curriculumNode.upsert({
      where: { curriculumVersionId_code: { curriculumVersionId: cbcVersionId, code: stage.code } },
      create: {
        curriculumVersionId: cbcVersionId,
        code: stage.code,
        title: stage.title,
        nodeType: "PATHWAY",
        sequence: stage.sequence,
        gradeFrom: stage.grades[0].title,
        gradeTo: stage.grades[stage.grades.length - 1].title,
        isAssessable: false,
        metadata: { grades: stage.grades.map((grade) => grade.title) },
      },
      update: { title: stage.title, sequence: stage.sequence },
    })

    for (const grade of stage.grades) {
      sequence += 1
      await tx.curriculumNode.upsert({
        where: { curriculumVersionId_code: { curriculumVersionId: cbcVersionId, code: grade.code } },
        create: {
          curriculumVersionId: cbcVersionId,
          parentId: stageNode.id,
          code: grade.code,
          title: grade.title,
          nodeType: "GRADE",
          sequence,
          gradeFrom: grade.title,
          gradeTo: grade.title,
        },
        update: { parentId: stageNode.id, title: grade.title, sequence, gradeFrom: grade.title, gradeTo: grade.title },
      })

      const offeringGrade = await tx.offeringGrade.create({
        data: { offeringId: offering.id, gradeCode: grade.code, displayName: grade.title, sequence },
      })
      const teacherData = staff.teachers[grade.code]
      const teacher = await tx.user.create({
        data: {
          email: teacherData.email,
          name: teacherData.name,
          password: hashes.teachers[grade.code],
          role: "TEACHER",
          schoolId: school.id,
        },
      })
      const schoolClass = await tx.class.create({
        data: {
          name: `${grade.title} A`,
          grade: grade.title,
          schoolId: school.id,
        },
      })
      await tx.teacherClass.create({ data: { teacherId: teacher.id, classId: schoolClass.id } })
      const assignment = await tx.classCurriculumAssignment.create({
        data: {
          schoolId: school.id,
          classId: schoolClass.id,
          offeringId: offering.id,
          offeringGradeId: offeringGrade.id,
          academicYearId: academicYear.id,
          periodId: activePeriod.id,
          status: "ACTIVE",
        },
      })
      schoolClasses.push({ grade, schoolClass, assignment })
    }
  }

  await tx.user.create({
    data: {
      email: staff.admin.email,
      name: "School Administrator",
      password: hashes.admin,
      role: "SCHOOL_ADMIN",
      schoolId: school.id,
    },
  })

  for (const { grade, schoolClass, assignment } of schoolClasses) {
    const records = Array.from({ length: 20 }, (_, index) => ({
      name: learnerName(grade, index + 1),
      admissionNo: `MIL-${grade.code}-${String(index + 1).padStart(3, "0")}`,
      classId: schoolClass.id,
      schoolId: school.id,
    }))
    const learners = await Promise.all(records.map((data) => tx.student.create({ data })))
    await tx.learnerCurriculumEnrollment.createMany({
      data: learners.map((student) => ({
        schoolId: school.id,
        studentId: student.id,
        offeringId: offering.id,
        assignmentId: assignment.id,
        startsOn: new Date("2026-01-01T00:00:00.000Z"),
      })),
    })
  }

  const [schoolCount, userCount, classCount, studentCount, gradeNodeCount, offeringGradeCount] = await Promise.all([
    tx.school.count(),
    tx.user.count(),
    tx.class.count({ where: { schoolId: school.id } }),
    tx.student.count({ where: { schoolId: school.id } }),
    tx.curriculumNode.count({ where: { curriculumVersionId: cbcVersionId, nodeType: "GRADE" } }),
    tx.offeringGrade.count({ where: { offeringId: offering.id } }),
  ])
  if (schoolCount !== 1 || userCount !== 15 || classCount !== 14 || studentCount !== 280 || gradeNodeCount < 14 || offeringGradeCount !== 14) {
    throw new Error("Rebuild invariants failed; transaction will be rolled back")
  }

  return { schoolId: school.id, gradeCount: stages.reduce((total, stage) => total + stage.grades.length, 0), classCount: schoolClasses.length, learnerCount: schoolClasses.length * 20 }
}

async function main() {
  const target = databaseTarget()
  const db = new PrismaClient()
  let credentialsFile
  try {
    const before = await snapshot(db)
    console.log(JSON.stringify({ target, current: before, planned: { school: SCHOOL_NAME, grades: 14, classes: 14, students: 280, staffAccounts: 15, sharedCurriculumPreserved: true } }, null, 2))

    if (!process.argv.includes("--execute")) {
      console.log("Dry run only. No records were changed. Use --execute with the exact approval argument to perform the reset.")
      return
    }
    if (!process.argv.includes(`--confirm=${CONFIRMATION}`)) throw new Error("Execution requires the exact approved confirmation argument")
    const expectedDomains = ["demo-school", "elitesch", "qa-platform-health-20261006"]
    if (before.schools.length !== 3 || expectedDomains.some((domain) => !before.schools.some((school) => school.domain === domain)) || before.users !== 10 || before.classes !== 2 || before.students !== 2) {
      throw new Error("Database preflight no longer matches the approved three-school state")
    }

    const staff = {
      admin: { email: `admin@${EMAIL_DOMAIN}`, password: crypto.randomBytes(24).toString("base64url") },
      teachers: Object.fromEntries(stages.flatMap((stage) => stage.grades.map((grade) => {
        const slug = grade.code.toLowerCase().replace(/[^a-z0-9]+/g, "-")
        return [grade.code, { email: `teacher-${slug}@${EMAIL_DOMAIN}`, name: `${grade.title} Teacher`, password: crypto.randomBytes(24).toString("base64url") }]
      }))),
    }
    credentialsFile = makeCredentialsFile(staff)
    const hashes = {
      admin: await bcrypt.hash(staff.admin.password, passwordCost),
      teachers: Object.fromEntries(await Promise.all(Object.entries(staff.teachers).map(async ([gradeCode, teacher]) => [gradeCode, await bcrypt.hash(teacher.password, passwordCost)]))),
    }

    const result = await db.$transaction((tx) => rebuild(tx, before.cbcVersionId, staff, hashes), { maxWait: 10_000, timeout: 120_000 })
    const after = await snapshot(db)
    const gradeCount = await db.curriculumNode.count({ where: { curriculumVersionId: before.cbcVersionId, nodeType: "GRADE" } })
    if (result.classCount !== 14 || result.learnerCount !== 280 || after.users !== 15 || after.schools.length !== 1 || gradeCount < 14) {
      console.error("Post-commit read-back differs from the transaction checks; inspect the database before further use")
      process.exitCode = 1
    }
    console.log(JSON.stringify({ result, remainingSchools: after.schools, users: after.users, curriculumGradeNodes: gradeCount, credentialsFile }, null, 2))
  } catch (error) {
    if (credentialsFile && fs.existsSync(credentialsFile)) fs.unlinkSync(credentialsFile)
    console.error(error.message)
    process.exitCode = 1
  } finally {
    await db.$disconnect()
  }
}

main()