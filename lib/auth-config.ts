import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import { isUserRole } from "./authorization"
import { verifyCredentials } from "./auth/credentials"
import { clientIp } from "./platform/audit"

const SUPER_ADMIN_MAX_SESSION_MS = 4 * 60 * 60 * 1000

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        code: { label: "Verification code", type: "text" }
      },
      async authorize(credentials, request) {
        if (typeof credentials?.email !== "string" || typeof credentials?.password !== "string" || !credentials.email || !credentials.password) {
          return null
        }

        return verifyCredentials({
          email: credentials.email,
          password: credentials.password,
          code: typeof credentials.code === "string" ? credentials.code : undefined,
          ip: request ? clientIp(request.headers) : null,
        })
      }
    })
  ],
  pages: {
    signIn: "/login",
    signOut: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
        maxAge: 8 * 60 * 60, // Revalidate privileges during the workday
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === "production"
      }
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === "production"
      }
    }
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.loginAt = Date.now()
        const fresh = user.id ? await prisma.user.findUnique({ where: { id: user.id }, select: { sessionVersion: true } }) : null
        token.sessionVersion = fresh?.sessionVersion ?? 0
      }

      // Privileges are re-read from the database on every check, so role changes,
      // deleted accounts and "sign out everywhere" take effect immediately.
      const userId = typeof token.id === "string" ? token.id : null
      if (!userId) return null
      const current = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, schoolId: true, sessionVersion: true, mustChangePassword: true, mfaEnabled: true, school: { select: { name: true } } },
      })
      if (!current || !isUserRole(current.role)) return null
      if (current.sessionVersion !== (typeof token.sessionVersion === "number" ? token.sessionVersion : 0)) return null
      const loginAt = typeof token.loginAt === "number" ? token.loginAt : 0
      if (current.role === "SUPER_ADMIN" && Date.now() - loginAt > SUPER_ADMIN_MAX_SESSION_MS) return null

      token.role = current.role
      token.schoolId = current.schoolId
      token.schoolName = current.school?.name
      token.mustChangePassword = current.mustChangePassword
      token.mfaEnabled = current.mfaEnabled
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = isUserRole(token.role) ? token.role : undefined
        session.user.schoolId = token.schoolId as string | undefined
        session.user.schoolName = token.schoolName as string | undefined
        session.user.mustChangePassword = token.mustChangePassword === true
        session.user.mfaEnabled = token.mfaEnabled === true
      }
      return session
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: false, // Turn off debug logs
  trustHost: true,
})
