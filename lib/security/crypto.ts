import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto"

export function sha256Hex(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

export function randomUrlToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url")
}

export function safeEqualHex(a: string, b: string) {
  const left = Buffer.from(a, "utf8")
  const right = Buffer.from(b, "utf8")
  return left.length === right.length && timingSafeEqual(left, right)
}

// Rotating this secret makes stored MFA secrets undecryptable, so MFA_ENCRYPTION_KEY can be pinned separately.
function encryptionKey() {
  const secret = process.env.MFA_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error("NEXTAUTH_SECRET or MFA_ENCRYPTION_KEY must be set to protect MFA secrets")
  return createHash("sha256").update(`fentech-studentos:mfa:${secret}`).digest()
}

export function encryptSecret(plain: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv)
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), body.toString("base64url")].join(".")
}

export function decryptSecret(payload: string) {
  const [version, iv, tag, body] = payload.split(".")
  if (version !== "v1" || !iv || !tag || !body) throw new Error("Unsupported secret format")
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"))
  decipher.setAuthTag(Buffer.from(tag, "base64url"))
  return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8")
}
