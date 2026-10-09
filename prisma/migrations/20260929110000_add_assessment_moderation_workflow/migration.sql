-- Additive assessment moderation and publication workflow.
CREATE TYPE "EvidenceStatus_new" AS ENUM ('DRAFT','RETURNED','SUBMITTED','REJECTED','VERIFIED','PUBLISHED','VOIDED');
ALTER TABLE "AssessmentEvidence" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "AssessmentEvidence" ALTER COLUMN "status" TYPE "EvidenceStatus_new" USING "status"::text::"EvidenceStatus_new";
ALTER TABLE "AssessmentEvidence" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
DROP TYPE "EvidenceStatus";
ALTER TYPE "EvidenceStatus_new" RENAME TO "EvidenceStatus";

ALTER TYPE "NotificationType" ADD VALUE 'CORRECTED_RESULT_PUBLISHED';
CREATE TYPE "PublicationMode" AS ENUM ('EVIDENCE','PLAN_BATCH');
CREATE TYPE "ModerationDecision" AS ENUM ('VERIFIED','REJECTED','RETURNED');
CREATE TYPE "AuditAction" AS ENUM ('CREATED','EDITED','SUBMITTED','VERIFIED','REJECTED','RETURNED','PUBLISHED','UNPUBLISHED','VOIDED','UNLOCKED');
CREATE TYPE "DeliveryMode" AS ENUM ('IMMEDIATE','DAILY_DIGEST');

ALTER TABLE "AssessmentPlan" ADD COLUMN "publishedById" TEXT;
ALTER TABLE "AssessmentPlan" ADD COLUMN "moderationCompletedAt" TIMESTAMP(3);
ALTER TABLE "AssessmentPlan" ADD COLUMN "moderationCompletedById" TEXT;
ALTER TABLE "AssessmentPlan" ADD COLUMN "publicationMode" "PublicationMode" NOT NULL DEFAULT 'EVIDENCE';
ALTER TABLE "AssessmentEvidence" ADD COLUMN "reviewerId" TEXT;
ALTER TABLE "AssessmentEvidence" ADD COLUMN "reviewedAt" TIMESTAMP(3);
ALTER TABLE "AssessmentEvidence" ADD COLUMN "reviewReason" TEXT;
ALTER TABLE "AssessmentEvidence" ADD COLUMN "internalNote" TEXT;
ALTER TABLE "AssessmentEvidence" ADD COLUMN "publishedAt" TIMESTAMP(3);
ALTER TABLE "AssessmentEvidence" ADD COLUMN "publishedById" TEXT;
ALTER TABLE "AssessmentEvidence" ADD COLUMN "publishedVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AssessmentEvidence" ADD COLUMN "publishedSnapshot" JSONB;
ALTER TABLE "Notification" ADD COLUMN "eventKey" TEXT;
UPDATE "Notification" SET "eventKey" = 'legacy:' || "id" WHERE "eventKey" IS NULL;
ALTER TABLE "Notification" ALTER COLUMN "eventKey" SET NOT NULL;

CREATE TABLE "EvidenceModerationDecision" (
  "id" TEXT NOT NULL, "evidenceId" TEXT NOT NULL, "reviewerId" TEXT NOT NULL,
  "decision" "ModerationDecision" NOT NULL, "reason" TEXT, "internalNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EvidenceModerationDecision_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "EvidenceAuditEvent" (
  "id" TEXT NOT NULL, "schoolId" TEXT NOT NULL, "evidenceId" TEXT, "planId" TEXT,
  "actorId" TEXT NOT NULL, "action" "AuditAction" NOT NULL, "priorStatus" TEXT,
  "newStatus" TEXT, "reason" TEXT, "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EvidenceAuditEvent_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SchoolNotificationPreference" (
  "id" TEXT NOT NULL, "schoolId" TEXT NOT NULL, "newEvidenceInApp" BOOLEAN NOT NULL DEFAULT false,
  "publishedInApp" BOOLEAN NOT NULL DEFAULT true, "masteryInApp" BOOLEAN NOT NULL DEFAULT true,
  "correctedInApp" BOOLEAN NOT NULL DEFAULT true, "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
  "deliveryMode" "DeliveryMode" NOT NULL DEFAULT 'IMMEDIATE', "acknowledgementRequired" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchoolNotificationPreference_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ParentNotificationPreference" (
  "id" TEXT NOT NULL, "parentId" TEXT NOT NULL, "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
  "inAppEnabled" BOOLEAN NOT NULL DEFAULT true, "dailyDigest" BOOLEAN NOT NULL DEFAULT false,
  "acknowledgementRequired" BOOLEAN, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "ParentNotificationPreference_pkey" PRIMARY KEY ("id")
);

DROP INDEX IF EXISTS "Notification_recipientId_evidenceId_key";
CREATE UNIQUE INDEX "Notification_eventKey_key" ON "Notification"("eventKey");
CREATE UNIQUE INDEX "SchoolNotificationPreference_schoolId_key" ON "SchoolNotificationPreference"("schoolId");
CREATE UNIQUE INDEX "ParentNotificationPreference_parentId_key" ON "ParentNotificationPreference"("parentId");
CREATE INDEX "EvidenceModerationDecision_evidenceId_createdAt_idx" ON "EvidenceModerationDecision"("evidenceId","createdAt");
CREATE INDEX "EvidenceAuditEvent_schoolId_createdAt_idx" ON "EvidenceAuditEvent"("schoolId","createdAt");
CREATE INDEX "EvidenceAuditEvent_evidenceId_createdAt_idx" ON "EvidenceAuditEvent"("evidenceId","createdAt");
CREATE INDEX "EvidenceAuditEvent_planId_createdAt_idx" ON "EvidenceAuditEvent"("planId","createdAt");

ALTER TABLE "EvidenceModerationDecision" ADD CONSTRAINT "EvidenceModerationDecision_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "AssessmentEvidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EvidenceModerationDecision" ADD CONSTRAINT "EvidenceModerationDecision_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON UPDATE CASCADE;
ALTER TABLE "EvidenceAuditEvent" ADD CONSTRAINT "EvidenceAuditEvent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EvidenceAuditEvent" ADD CONSTRAINT "EvidenceAuditEvent_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "AssessmentEvidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EvidenceAuditEvent" ADD CONSTRAINT "EvidenceAuditEvent_planId_fkey" FOREIGN KEY ("planId") REFERENCES "AssessmentPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EvidenceAuditEvent" ADD CONSTRAINT "EvidenceAuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON UPDATE CASCADE;
ALTER TABLE "SchoolNotificationPreference" ADD CONSTRAINT "SchoolNotificationPreference_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParentNotificationPreference" ADD CONSTRAINT "ParentNotificationPreference_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
