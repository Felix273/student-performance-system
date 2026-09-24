import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query', 'error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Multi-tenant helper function
export async function getSchoolByDomain(domain: string) {
  return await prisma.school.findUnique({
    where: { domain },
  })
}

// Get school context from request headers or subdomain
export function extractTenantFromRequest(hostname: string): string {
  // Extract subdomain from hostname
  // Example: school1.yourdomain.com -> school1
  const parts = hostname.split('.')
  if (parts.length > 2) {
    return parts[0]
  }
  return 'default'
}
