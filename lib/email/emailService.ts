import nodemailer from "nodemailer"
import type { Transporter } from "nodemailer"

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

// ---------------------------------------------------------------------------
// Transporter singleton
//
// WHY: Creating a new Nodemailer transport on every sendEmail() call opens a
// fresh TCP/TLS connection each time. For Gmail and Resend this adds ~200 ms
// of latency per email and burns through connection limits. Ethereal creates
// a new test account on every call, making preview URLs inconsistent.
//
// The singleton is initialised once on first use and reused for all subsequent
// calls within the same process. In serverless environments (Vercel) each warm
// instance reuses the connection; cold starts pay the one-time setup cost.
// ---------------------------------------------------------------------------
let _transporter: Transporter | null = null

/** True when a real provider is configured. Without one, production must not pretend an email was delivered. */
export function isEmailDeliveryConfigured() {
  if (process.env.EMAIL_PROVIDER === "resend" && process.env.RESEND_API_KEY) return true
  if (process.env.EMAIL_PROVIDER === "gmail" && process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) return true
  return process.env.NODE_ENV !== "production"
}

async function getTransporter(): Promise<Transporter> {
  if (_transporter) return _transporter

  if (process.env.EMAIL_PROVIDER === "resend" && process.env.RESEND_API_KEY) {
    // Resend — recommended for production
    _transporter = nodemailer.createTransport({
      host: "smtp.resend.com",
      port: 465,
      secure: true,
      auth: {
        user: "resend",
        pass: process.env.RESEND_API_KEY,
      },
    })
  } else if (process.env.EMAIL_PROVIDER === "gmail" && process.env.GMAIL_USER) {
    // Gmail SMTP
    _transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })
  } else {
    // Ethereal — free test accounts for development / CI
    const testAccount = await nodemailer.createTestAccount()
    _transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    })
    console.log("📧 Ethereal test account:", testAccount.user)
  }

  return _transporter
}

export async function sendEmail({ to, subject, html, text }: EmailOptions) {
  try {
    if (!isEmailDeliveryConfigured()) {
      return { success: false, error: "Email delivery is not configured" }
    }
    const transporter = await getTransporter()

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || "noreply@school.com",
      to,
      subject,
      html,
      text: text ?? html.replace(/<[^>]*>/g, ""), // Strip HTML for plain-text fallback
    })

    console.log("✓ Email sent:", info.messageId)

    const previewUrl = nodemailer.getTestMessageUrl(info)
    if (previewUrl) {
      console.log("📧 Preview URL:", previewUrl)
    }

    return {
      success: true,
      messageId: info.messageId as string,
      previewUrl: previewUrl || undefined,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email error"
    console.error("✗ Email sending failed:", error)
    return { success: false, error: message }
  }
}

export async function sendBulkEmail(emails: EmailOptions[]) {
  const results = await Promise.allSettled(emails.map((email) => sendEmail(email)))

  return {
    sent: results.filter((r) => r.status === "fulfilled").length,
    failed: results.filter((r) => r.status === "rejected").length,
    results,
  }
}
