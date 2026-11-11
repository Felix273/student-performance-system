import "dotenv/config"
import dns from "node:dns"

// Force IPv4 first to avoid IPv6 ENETUNREACH on Kenyan ISPs
dns.setDefaultResultOrder("ipv4first")

function normalizeKenyanPhone(input) {
  if (!input) return null
  let clean = input.trim().replace(/[\s\-()]/g, "")
  if (clean.startsWith("+")) clean = clean.slice(1)
  if (/^0[17]\d{8}$/.test(clean)) return `+254${clean.slice(1)}`
  if (/^[17]\d{8}$/.test(clean)) return `+254${clean}`
  if (/^254[17]\d{8}$/.test(clean)) return `+${clean}`
  if (/^\d{10,15}$/.test(clean)) return `+${clean}`
  return null
}

const targetPhone = process.argv[2] || "+254114295869"
const testMessage = process.argv[3] || "Ongata Academy: This is a live test SMS alert from Fentech StudentOS. Gateway is operational."

const normalized = normalizeKenyanPhone(targetPhone)
console.log("\n==============================================")
console.log("🚀 TESTING AFRICA'S TALKING SMS GATEWAY")
console.log("==============================================")
console.log(`Input Phone:      ${targetPhone}`)
console.log(`Normalized E.164: ${normalized}`)
console.log(`Message:          "${testMessage}"`)

const apiKey = (process.env.AT_API_KEY || process.env.AFRICAS_TALKING_API_KEY || "").trim()
const username = (process.env.AT_USERNAME || process.env.AFRICAS_TALKING_USERNAME || "sandbox").trim()

console.log(`Username:         ${username}`)
console.log(`API Key:          ${apiKey ? apiKey.slice(0, 8) + "..." : "NOT FOUND"}`)
console.log("----------------------------------------------")

if (!apiKey) {
  console.log("❌ Error: AT_API_KEY is missing in your .env file.")
  process.exit(1)
}

const isSandbox = username.toLowerCase() === "sandbox"
const endpoint = isSandbox
  ? "https://api.sandbox.africastalking.com/version1/messaging"
  : "https://api.africastalking.com/version1/messaging"

console.log(`Connecting to:    ${endpoint} ...`)

const params = new URLSearchParams()
params.append("username", username)
params.append("to", normalized)
params.append("message", testMessage)

try {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      apiKey: apiKey,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  })

  const data = await res.json()
  console.log("\n📡 GATEWAY RESPONSE:")
  console.log(JSON.stringify(data, null, 2))

  const recipients = data?.SMSMessageData?.Recipients || []
  if (recipients.length > 0) {
    const r = recipients[0]
    if (r.status === "Success") {
      console.log(`\n✅ SUCCESS! Message sent to ${r.number}. Cost: ${r.cost || "KES 0.00"}`)
      console.log(`📱 Check your Africa's Talking simulator tab now!`)
    } else {
      console.log(`\n⚠️ Gateway status: ${r.status}`)
    }
  } else {
    console.log(`\n⚠️ ${data?.SMSMessageData?.Message || "No recipient status returned."}`)
  }
} catch (err) {
  console.error("\n❌ Network / Request Error:", err.message)
  if (err.cause) console.error("Cause:", err.cause)
}
console.log("==============================================\n")
