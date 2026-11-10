import { prisma } from "@/lib/prisma"
import { normalizeKenyanPhone } from "./phoneUtils"

export type SmsCategory =
  | "FEE_RECEIPT"
  | "ATTENDANCE_ALERT"
  | "REPORT_PUBLISHED"
  | "GENERAL_BROADCAST"

export interface SendSmsOptions {
  to: string | string[]
  message: string
  schoolId: string
  category?: SmsCategory
  actorId?: string
}

export interface SmsResult {
  success: boolean
  recipientsCount: number
  sentCount: number
  failedCount: number
  error?: string
}

export function isSmsConfigured(): boolean {
  const apiKey = (process.env.AT_API_KEY || process.env.AFRICAS_TALKING_API_KEY || "").trim()
  const username = (process.env.AT_USERNAME || process.env.AFRICAS_TALKING_USERNAME || "").trim()
  return Boolean(apiKey && username)
}

export async function sendSms({
  to,
  message,
  schoolId,
  category = "GENERAL_BROADCAST",
  actorId,
}: SendSmsOptions): Promise<SmsResult> {
  const rawList = Array.isArray(to) ? to : [to]
  const validRecipients = Array.from(
    new Set(rawList.map(normalizeKenyanPhone).filter((p): p is string => Boolean(p)))
  )

  if (validRecipients.length === 0) {
    return {
      success: false,
      recipientsCount: 0,
      sentCount: 0,
      failedCount: rawList.length,
      error: "No valid phone numbers provided",
    }
  }

  const apiKey = (process.env.AT_API_KEY || process.env.AFRICAS_TALKING_API_KEY || "").trim()
  const username = (process.env.AT_USERNAME || process.env.AFRICAS_TALKING_USERNAME || "sandbox").trim()
  const senderId = (process.env.AT_SENDER_ID || process.env.AFRICAS_TALKING_SENDER_ID || "").trim()

  const isLive = Boolean(apiKey && username && process.env.NODE_ENV === "production")
  const isSandbox = username.toLowerCase() === "sandbox"

  // 1. If in development or unconfigured, simulate delivery & log to DB
  if (!isLive && !apiKey) {
    console.log(`\n📱 [SMS SIMULATION - ${category}]`)
    console.log(`To: ${validRecipients.join(", ")}`)
    console.log(`Message: "${message}"\n`)

    try {
      await prisma.smsDeliveryLog.createMany({
        data: validRecipients.map((recipient) => ({
          schoolId,
          recipient,
          message,
          category,
          status: "SIMULATED",
          sentById: actorId || null,
        })),
      })
    } catch (e) {
      console.error("Failed to write SMS simulation log:", e)
    }

    return {
      success: true,
      recipientsCount: validRecipients.length,
      sentCount: validRecipients.length,
      failedCount: 0,
    }
  }

  // 2. Call Africa's Talking REST API
  const endpoint = isSandbox
    ? "https://api.sandbox.africastalking.com/version1/messaging"
    : "https://api.africastalking.com/version1/messaging"

  const params = new URLSearchParams()
  params.append("username", username)
  params.append("to", validRecipients.join(","))
  params.append("message", message)
  if (senderId && !isSandbox) {
    params.append("from", senderId)
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        apiKey,
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    })

    const data = await res.json()
    const entries = data?.SMSMessageData?.Recipients || []
    let sentCount = 0
    let failedCount = 0

    // Record delivery logs
    const logData = validRecipients.map((phone) => {
      const match = entries.find((e: any) => e.number === phone)
      const isSuccess = match?.status === "Success"
      if (isSuccess) sentCount++
      else failedCount++

      return {
        schoolId,
        recipient: phone,
        message,
        messageId: match?.messageId || null,
        cost: match?.cost || null,
        status: match?.status || "SENT",
        category,
        sentById: actorId || null,
      }
    })

    await prisma.smsDeliveryLog.createMany({ data: logData })

    return {
      success: sentCount > 0,
      recipientsCount: validRecipients.length,
      sentCount: sentCount || validRecipients.length,
      failedCount,
    }
  } catch (err: unknown) {
    console.error("Africa's Talking SMS API Error:", err)
    return {
      success: false,
      recipientsCount: validRecipients.length,
      sentCount: 0,
      failedCount: validRecipients.length,
      error: err instanceof Error ? err.message : "SMS delivery failed",
    }
  }
}
