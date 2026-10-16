import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export type PlatformAuditAction =
  | "school.created"
  | "school.updated"
  | "school_admin.invited"
  | "school_admin.reset_link_issued"
  | "password.reset_completed"
  | "password.changed"
  | "invite.accepted"
  | "sessions.revoked"
  | "mfa.enabled"
  | "login.succeeded"
  | "login.failed"
  | "login.locked"
  | "login.mfa_failed"
  | "email.test_sent"
  | "school.status_changed"
  | "school.cbc_starter_created"
  | "platform_operator.invited"
  | "platform_operator.disabled"
  | "platform_operator.reactivated"
  | "billing.plan_created"
  | "billing.plan_updated"
  | "billing.subscription_updated"
  | "platform.announcement_created"
  | "platform.announcement_updated"
  | "support.access_requested"
  | "support.access_approved"
  | "support.access_denied"
  | "support.access_revoked"
  | "support.accessed"
  | "school.data_request_created"
  | "school.data_request_reviewed"
  | "school.data_exported"

type Actor = { id?: string | null; email?: string | null }

export function clientIp(headers: { get(name: string): string | null }) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  return forwarded || headers.get("x-real-ip") || null
}

/** Audit writes must never break the action being recorded. */
export async function recordPlatformEvent(event: {
  actor?: Actor
  action: PlatformAuditAction
  targetType?: string
  targetId?: string
  schoolId?: string | null
  metadata?: Prisma.InputJsonValue
  ip?: string | null
}) {
  try {
    await prisma.platformAuditEvent.create({
      data: {
        actorId: event.actor?.id ?? null,
        actorEmail: event.actor?.email ?? null,
        action: event.action,
        targetType: event.targetType,
        targetId: event.targetId,
        schoolId: event.schoolId ?? null,
        metadata: event.metadata,
        ip: event.ip ?? null,
      },
    })
  } catch (error) {
    console.error("Platform audit write failed:", error)
  }
}
