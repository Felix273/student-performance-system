const shell = (title: string, body: string, actionUrl: string, actionLabel: string) => `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937;background:#f3f4f6;padding:24px">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px">
<h2 style="margin:0 0 16px;color:#0f172a">${title}</h2>
${body}
<p style="margin:28px 0"><a href="${actionUrl}" style="background:#0f766e;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold">${actionLabel}</a></p>
<p style="font-size:12px;color:#6b7280">If the button does not work, paste this address into your browser:<br>${actionUrl}</p>
</div></body></html>`

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string)

export const accountEmails = {
  invite: (name: string, schoolName: string, link: string, hours: number) => ({
    subject: `Set up your Fentech StudentOS account for ${schoolName}`,
    html: shell(
      "Welcome to Fentech StudentOS",
      `<p>Hello ${escapeHtml(name)},</p><p>You have been added as an administrator for <strong>${escapeHtml(schoolName)}</strong>. Choose your password to activate your account.</p><p>This link works once and expires in ${hours} hours.</p>`,
      link,
      "Set my password",
    ),
  }),
  reset: (name: string, link: string, minutes: number) => ({
    subject: "Reset your Fentech StudentOS password",
    html: shell(
      "Reset your password",
      `<p>Hello ${escapeHtml(name)},</p><p>We received a request to reset your password. This link works once and expires in ${minutes} minutes.</p><p>If you did not ask for this, you can ignore this email and your password stays the same.</p>`,
      link,
      "Choose a new password",
    ),
  }),
}
