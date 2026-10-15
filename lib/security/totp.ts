import { createHmac, randomBytes } from "node:crypto"

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
const STEP_SECONDS = 30
const DIGITS = 6

export function base32Encode(buffer: Buffer) {
  let bits = 0
  let value = 0
  let output = ""
  for (const byte of buffer) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) output += ALPHABET[(value << (5 - bits)) & 31]
  return output
}

export function base32Decode(input: string) {
  let bits = 0
  let value = 0
  const bytes: number[] = []
  for (const char of input.replace(/=+$/, "").toUpperCase()) {
    const index = ALPHABET.indexOf(char)
    if (index === -1) throw new Error("Invalid base32 character")
    value = (value << 5) | index
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(bytes)
}

export function generateTotpSecret() {
  return base32Encode(randomBytes(20))
}

export function totpStep(timeMs = Date.now()) {
  return Math.floor(timeMs / 1000 / STEP_SECONDS)
}

function codeForStep(secret: string, step: number) {
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(step))
  const hmac = createHmac("sha1", base32Decode(secret)).update(counter).digest()
  const offset = hmac[hmac.length - 1] & 0x0f
  const binary = ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3]
  return String(binary % 10 ** DIGITS).padStart(DIGITS, "0")
}

export function totpCode(secret: string, timeMs = Date.now()) {
  return codeForStep(secret, totpStep(timeMs))
}

/** Returns the matched step so callers can reject a replay of the same code, or null when invalid. */
export function verifyTotp(secret: string, code: string, options: { timeMs?: number; lastStep?: number | null; window?: number } = {}) {
  const cleaned = code.replace(/\s/g, "")
  if (!/^\d{6}$/.test(cleaned)) return null
  const current = totpStep(options.timeMs)
  const window = options.window ?? 1
  for (let step = current - window; step <= current + window; step++) {
    if (options.lastStep != null && step <= options.lastStep) continue
    if (codeForStep(secret, step) === cleaned) return step
  }
  return null
}

export function otpauthUri(secret: string, accountEmail: string, issuer = "Fentech StudentOS") {
  const label = encodeURIComponent(`${issuer}:${accountEmail}`)
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`
}
