/**
 * Normalizes Kenyan phone numbers to standard E.164 format (+254...)
 * Supports Safaricom, Airtel (including 01xx series), Telkom, and Equitel.
 *
 * Examples:
 *   "0712345678" -> "+254712345678"
 *   "0112345678" -> "+254112345678"
 *   "254712345678" -> "+254712345678"
 *   "+254 712 345 678" -> "+254712345678"
 */
export function normalizeKenyanPhone(input?: string | null): string | null {
  if (!input) return null

  // Strip all whitespace, dashes, brackets, and non-digit characters except leading '+'
  let clean = input.trim().replace(/[\s\-()]/g, "")

  if (clean.startsWith("+")) {
    clean = clean.slice(1)
  }

  // Matches 07xx, 01xx (10 digits)
  if (/^0[17]\d{8}$/.test(clean)) {
    return `+254${clean.slice(1)}`
  }

  // Matches 7xx, 1xx (9 digits)
  if (/^[17]\d{8}$/.test(clean)) {
    return `+254${clean}`
  }

  // Matches 2547xx, 2541xx (12 digits)
  if (/^254[17]\d{8}$/.test(clean)) {
    return `+${clean}`
  }

  // Already international format with other country codes (e.g. diaspora parents)
  if (/^\d{10,15}$/.test(clean)) {
    return `+${clean}`
  }

  return null
}
