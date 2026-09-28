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
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
