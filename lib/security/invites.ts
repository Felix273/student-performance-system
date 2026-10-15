import { accountEmails } from "@/lib/email/accountEmails"
import { isEmailDeliveryConfigured, sendEmail } from "@/lib/email/emailService"
import { appOrigin, INVITE_TTL_MS, issuePasswordToken, RESET_TTL_MS, tokenLink } from "@/lib/security/tokens"

type Recipient = { id: string; name: string; email: string }

/**
 * Creates a single-use link and emails it. The link is only handed back to the caller when
 * email could not be delivered, so a Super Admin never sees a working link for an account
 * whose owner received it by email.
 */
export async function sendAccountLink(input: { request: Request; recipient: Recipient; purpose: "INVITE" | "RESET"; schoolName?: string; createdById: string }) {
  const { token, expiresAt } = await issuePasswordToken({ userId: input.recipient.id, purpose: input.purpose, createdById: input.createdById })
  const link = tokenLink(appOrigin(input.request), input.purpose, token)

  let emailed = false
  if (isEmailDeliveryConfigured()) {
    const mail =
      input.purpose === "INVITE"
        ? accountEmails.invite(input.recipient.name, input.schoolName ?? "your school", link, INVITE_TTL_MS / 3600000)
        : accountEmails.reset(input.recipient.name, link, RESET_TTL_MS / 60000)
    emailed = (await sendEmail({ to: input.recipient.email, subject: mail.subject, html: mail.html })).success
  }

  return { emailed, expiresAt, link: emailed ? undefined : link }
}
