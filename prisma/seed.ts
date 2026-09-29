import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true') {
    throw new Error('Demo seeding is disabled in production. Provision a unique administrator instead.')
  }

  const superAdminPassword = process.env.DEMO_ADMIN_PASSWORD || 'admin123'
  const schoolAdminPassword = process.env.DEMO_SCHOOL_ADMIN_PASSWORD || 'school123'

  // Create Super Admin
  const hashedPassword = await bcrypt.hash(superAdminPassword, 10)
  
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@system.com' },
    update: {},
    create: {
      email: 'admin@system.com',
      password: hashedPassword,
      name: 'Super Administrator',
      role: 'SUPER_ADMIN',
    },
  })

  console.log('✅ Super Admin created:', superAdmin.email)
  
  // Create a demo school
  const demoSchool = await prisma.school.upsert({
    where: { domain: 'demo-school' },
    update: {},
    create: {
      name: 'Demo School',
      domain: 'demo-school',
    },
  })

  console.log('✅ Demo School created:', demoSchool.name)

  await prisma.schoolNotificationPreference.upsert({
    where: { schoolId: demoSchool.id },
    update: {},
    create: {
      schoolId: demoSchool.id,
      newEvidenceInApp: false,
      publishedInApp: true,
      masteryInApp: true,
      correctedInApp: true,
      emailEnabled: false,
      deliveryMode: 'IMMEDIATE',
      acknowledgementRequired: false,
    },
  })

  // Create School Admin for demo school
  const hashedSchoolAdminPassword = await bcrypt.hash(schoolAdminPassword, 10)
  
  const schoolAdmin = await prisma.user.upsert({
    where: { email: 'admin@demo-school.com' },
    update: {},
    create: {
      email: 'admin@demo-school.com',
      password: hashedSchoolAdminPassword,
      name: 'School Administrator',
      role: 'SCHOOL_ADMIN',
      schoolId: demoSchool.id,
    },
  })

  console.log('✅ School Admin created:', schoolAdmin.email)

  const cbc = await prisma.curriculum.upsert({
    where: { code: 'CBC' },
    update: { name: 'Kenya Competency Based Curriculum', provider: 'KICD / KNEC', country: 'KE', isSystem: true },
    create: { code: 'CBC', name: 'Kenya Competency Based Curriculum', provider: 'KICD / KNEC', country: 'KE', isSystem: true },
  })
  const cbcVersion = await prisma.curriculumVersion.upsert({
    where: { curriculumId_version: { curriculumId: cbc.id, version: '2026.1' } },
    update: { status: 'PUBLISHED', effectiveFrom: new Date('2026-01-01T00:00:00.000Z') },
    create: { curriculumId: cbc.id, version: '2026.1', status: 'PUBLISHED', effectiveFrom: new Date('2026-01-01T00:00:00.000Z'), sourceRef: 'KICD/KNEC CBC starter dataset' },
  })

  const competencies = [
    ['COMMUNICATION_COLLABORATION', 'Communication and collaboration'],
    ['CRITICAL_THINKING', 'Critical thinking and problem solving'],
    ['CREATIVITY', 'Creativity and imagination'],
    ['CITIZENSHIP', 'Citizenship'],
    ['DIGITAL_LITERACY', 'Digital literacy'],
    ['SELF_EFFICACY', 'Self-efficacy'],
    ['LEARNING_TO_LEARN', 'Learning to learn'],
  ] as const
  for (const [code, name] of competencies) {
    await prisma.competency.upsert({ where: { code }, update: { name, isSystem: true }, create: { code, name, isSystem: true } })
  }

  const values = [
    ['LOVE', 'Love'], ['RESPONSIBILITY', 'Responsibility'], ['RESPECT', 'Respect'],
    ['UNITY', 'Unity'], ['PEACE', 'Peace'], ['PATRIOTISM', 'Patriotism'],
    ['HONESTY', 'Honesty'], ['INTEGRITY', 'Integrity'], ['EMPATHY', 'Empathy'],
  ] as const
  for (const [code, name] of values) {
    await prisma.value.upsert({ where: { code }, update: { name, isSystem: true }, create: { code, name, isSystem: true } })
  }

  const grade4 = await prisma.curriculumNode.upsert({
    where: { curriculumVersionId_code: { curriculumVersionId: cbcVersion.id, code: 'G4' } },
    update: { title: 'Grade 4', nodeType: 'GRADE', gradeFrom: 'G4', gradeTo: 'G4' },
    create: { curriculumVersionId: cbcVersion.id, code: 'G4', title: 'Grade 4', nodeType: 'GRADE', gradeFrom: 'G4', gradeTo: 'G4' },
  })
  const mathematics = await prisma.curriculumNode.upsert({
    where: { curriculumVersionId_code: { curriculumVersionId: cbcVersion.id, code: 'G4-MATH' } },
    update: { title: 'Mathematics', nodeType: 'LEARNING_AREA', parentId: grade4.id },
    create: { curriculumVersionId: cbcVersion.id, code: 'G4-MATH', title: 'Mathematics', nodeType: 'LEARNING_AREA', parentId: grade4.id },
  })
  const numbers = await prisma.curriculumNode.upsert({
    where: { curriculumVersionId_code: { curriculumVersionId: cbcVersion.id, code: 'G4-MATH-NUMBERS' } },
    update: { title: 'Numbers', nodeType: 'STRAND', parentId: mathematics.id },
    create: { curriculumVersionId: cbcVersion.id, code: 'G4-MATH-NUMBERS', title: 'Numbers', nodeType: 'STRAND', parentId: mathematics.id },
  })
  await prisma.learningOutcome.upsert({
    where: { curriculumNodeId_code: { curriculumNodeId: numbers.id, code: 'G4-MATH-NUM-01' } },
    update: { statement: 'Reads and writes numbers up to one million and applies place value in everyday contexts.' },
    create: { curriculumNodeId: numbers.id, code: 'G4-MATH-NUM-01', statement: 'Reads and writes numbers up to one million and applies place value in everyday contexts.' },
  })
  const rubric = await prisma.rubric.upsert({
    where: { curriculumVersionId_code: { curriculumVersionId: cbcVersion.id, code: 'CBC_MASTERY_4' } },
    update: { name: 'CBC mastery rubric', description: 'Starter rubric for competency-based classroom evidence.' },
    create: { curriculumVersionId: cbcVersion.id, code: 'CBC_MASTERY_4', name: 'CBC mastery rubric', description: 'Starter rubric for competency-based classroom evidence.' },
  })
  const rubricCriteria = [
    ['UNDERSTANDING', 'Understanding', 1],
    ['APPLICATION', 'Application', 2],
    ['COMMUNICATION', 'Communication and collaboration', 3],
  ] as const
  const rubricLevels = [
    ['BE', 'Below expectation', 'Requires significant support', 1],
    ['AE', 'Approaching expectation', 'Demonstrates partially or with support', 2],
    ['ME', 'Meeting expectation', 'Demonstrates the expected outcome', 3],
    ['EE', 'Exceeding expectation', 'Independently extends learning', 4],
  ] as const
  for (const [code, name, sequence] of rubricCriteria) {
    const criterion = await prisma.rubricCriterion.upsert({ where: { rubricId_code: { rubricId: rubric.id, code } }, update: { name, sequence }, create: { rubricId: rubric.id, code, name, sequence } })
    for (const [levelCode, label, description, points] of rubricLevels) {
      await prisma.rubricLevel.upsert({ where: { criterionId_code: { criterionId: criterion.id, code: levelCode } }, update: { label, description, points, sequence: points }, create: { criterionId: criterion.id, code: levelCode, label, description, points, sequence: points } })
    }
  }
  const masteryScale = await prisma.gradeScale.upsert({
    where: { curriculumVersionId_code: { curriculumVersionId: cbcVersion.id, code: 'CBC_MASTERY' } },
    update: { name: 'CBC mastery scale', scaleType: 'MASTERY', description: 'Configurable four-band CBC mastery scale.' },
    create: { curriculumVersionId: cbcVersion.id, code: 'CBC_MASTERY', name: 'CBC mastery scale', scaleType: 'MASTERY', description: 'Configurable four-band CBC mastery scale.' },
  })
  for (const [code, label, minValue, maxValue, points, sequence] of [
    ['BE', 'Below expectation', 0, 37.49, 1, 1],
    ['AE', 'Approaching expectation', 37.5, 62.49, 2, 2],
    ['ME', 'Meeting expectation', 62.5, 87.49, 3, 3],
    ['EE', 'Exceeding expectation', 87.5, 100, 4, 4],
  ] as const) {
    await prisma.gradeScaleBand.upsert({ where: { gradeScaleId_code: { gradeScaleId: masteryScale.id, code } }, update: { label, minValue, maxValue, points, sequence }, create: { gradeScaleId: masteryScale.id, code, label, minValue, maxValue, points, sequence } })
  }

  const academicYear = await prisma.academicYear.upsert({
    where: { schoolId_name: { schoolId: demoSchool.id, name: '2026' } },
    update: { isCurrent: true },
    create: { schoolId: demoSchool.id, name: '2026', startsOn: new Date('2026-01-01T00:00:00.000Z'), endsOn: new Date('2026-12-31T23:59:59.000Z'), isCurrent: true },
  })
  const periods = [
    ['TERM_1', 'Term 1', '2026-01-01', '2026-04-30', 1],
    ['TERM_2', 'Term 2', '2026-05-01', '2026-08-31', 2],
    ['TERM_3', 'Term 3', '2026-09-01', '2026-12-31', 3],
  ] as const
  for (const [code, name, startsOn, endsOn, sequence] of periods) {
    await prisma.academicPeriod.upsert({
      where: { academicYearId_code: { academicYearId: academicYear.id, code } },
      update: { name, startsOn: new Date(`${startsOn}T00:00:00.000Z`), endsOn: new Date(`${endsOn}T23:59:59.000Z`), sequence },
      create: { academicYearId: academicYear.id, code, name, startsOn: new Date(`${startsOn}T00:00:00.000Z`), endsOn: new Date(`${endsOn}T23:59:59.000Z`), sequence },
    })
  }
  const offering = await prisma.curriculumOffering.upsert({
    where: { schoolId_academicYearId_code: { schoolId: demoSchool.id, academicYearId: academicYear.id, code: 'CBC_PRIMARY' } },
    update: { name: 'CBC Primary', curriculumVersionId: cbcVersion.id, status: 'ACTIVE', isDefault: true },
    create: { schoolId: demoSchool.id, curriculumId: cbc.id, curriculumVersionId: cbcVersion.id, academicYearId: academicYear.id, code: 'CBC_PRIMARY', name: 'CBC Primary', status: 'ACTIVE', isDefault: true },
  })
  await prisma.offeringGrade.upsert({ where: { offeringId_gradeCode: { offeringId: offering.id, gradeCode: 'G4' } }, update: { displayName: 'Grade 4', sequence: 4 }, create: { offeringId: offering.id, gradeCode: 'G4', displayName: 'Grade 4', sequence: 4 } })
  console.log('✅ CBC curriculum seeded:', cbcVersion.version)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
