import { UserRole } from "@prisma/client"
import { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface User {
    id: string
    role?: UserRole | string
    schoolId?: string
    schoolName?: string
  }

  interface Session {
    user: {
      id: string
      role?: UserRole | string
      schoolId?: string
      schoolName?: string
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    role?: UserRole | string
    schoolId?: string
    schoolName?: string
  }
}
