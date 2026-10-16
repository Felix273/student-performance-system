import { prisma } from "@/lib/prisma"
import { sendBulkEmail } from "./emailService"

type MaintenanceNotice = {
  title: string
  body: string
  schoolId: string | null
  startsAt: Date
  endsAt: Date | null
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]!)
}

function formatUtc(date: Date) {
  return `${new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(date)} UTC`
}

export function buildMaintenanceNoticeEmail(notice: MaintenanceNotice, schoolName: string) {
  const title = escapeHtml(notice.title)
  const body = escapeHtml(notice.body).replace(/\r?\n/g, "<br>")
  const safeSchoolName = escapeHtml(schoolName)
  const startsAt = formatUtc(notice.startsAt)
  const endsAt = notice.endsAt ? formatUtc(notice.endsAt) : "No end time set"
  const subjectTitle = notice.title.replace(/[\r\n]+/g, " ").slice(0, 120)

  return {
    subject: `Scheduled maintenance: ${subjectTitle}`,
    text: `Scheduled maintenance\n\n${notice.title}\n${notice.body}\n\nSchool: ${schoolName}\nStarts: ${startsAt}\nEnds: ${endsAt}`,
    html: `<!doctype html><html><body style="margin:0;background:#f7f8fa;color:#1c1c1e;font-family:Arial,sans-serif"><div style="max-width:620px;margin:0 auto;padding:28px 16px"><div style="overflow:hidden;border:1px solid #e0ad35;border-radius:18px;background:#fff"><div style="background:#1c1c1e;padding:20px 24px;color:#fff"><p style="margin:0;color:#ffd02f;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase">Fentech StudentOS</p><h1 style="margin:10px 0 0;font-size:23px">Scheduled maintenance</h1></div><div style="padding:24px"><div style="border-left:5px solid #d99412;border-radius:8px;background:#fff2c2;padding:16px"><h2 style="margin:0 0 8px;font-size:18px">${title}</h2><p style="margin:0;line-height:1.6">${body}</p></div><p style="margin:20px 0 8px;font-size:14px"><strong>School:</strong> ${safeSchoolName}</p><p style="margin:8px 0;font-size:14px"><strong>Starts:</strong> ${startsAt}</p><p style="margin:8px 0;font-size:14px"><strong>Ends:</strong> ${endsAt}</p><p style="margin:20px 0 0;color:#6b6f7e;font-size:12px;line-height:1.5">This is an operational notice from your school platform administrator.</p></div></div></div></body></html>`,
  }
}

export async function notifyMaintenanceAdmins(notice: MaintenanceNotice) {
  const admins = await prisma.user.findMany({
    where: {
      role: "SCHOOL_ADMIN",
      isActive: true,
      ...(notice.schoolId ? { schoolId: notice.schoolId } : { schoolId: { not: null } }),
      school: { is: { status: "ACTIVE" } },
    },
    select: { email: true, school: { select: { name: true } } },
  })
  const emails = admins.flatMap((admin) => admin.school ? [{ to: admin.email, ...buildMaintenanceNoticeEmail(notice, admin.school.name) }] : [])
  const delivery = await sendBulkEmail(emails)
  return { recipients: emails.length, sent: delivery.sent, failed: delivery.failed }
}