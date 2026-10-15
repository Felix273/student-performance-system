import { randomBytes } from "node:crypto"
import { hash } from "bcryptjs"

export const MIN_PASSWORD_LENGTH = 12
const COMMON = new Set(["password1234", "123456789012", "qwertyuiop12", "letmein12345", "welcome12345", "admin1234567", "iloveyou1234", "password12345"])

/** Returns a user-facing problem, or null when the password is acceptable. */
export function passwordProblem(password: unknown, context: { email?: string | null; name?: string | null } = {}) {
  if (typeof password !== "string") return "Enter a password"
  if (password.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters`
  if (password.length > 200) return "Use fewer than 200 characters"
  const lower = password.toLowerCase()
  if (COMMON.has(lower) || /^(.)\1+$/.test(password)) return "That password is too easy to guess"
  const local = context.email?.split("@")[0]?.toLowerCase()
  if (local && local.length >= 4 && lower.includes(local)) return "Don't include your email address in your password"
  return null
}

export function hashPassword(password: string) {
  return hash(password, 12)
}

/** A random password nobody knows, used for accounts that must set their own via an invite link. */
export function unusablePasswordHash() {
  return hash(randomBytes(32).toString("base64url"), 12)
}
