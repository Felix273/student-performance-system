-- CreateEnum
CREATE TYPE "ReportCardStatus" AS ENUM ('DRAFT', 'REVIEW', 'PUBLISHED', 'AMENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ReportTemplateSectionType" AS ENUM ('SUMMARY', 'ASSESSMENT', 'OUTCOME', 'COMPETENCY', 'ATTENDANCE', 'COMMENT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ReportEntrySource" AS ENUM ('CBC_EVIDENCE', 'LEGACY_ASSESSMENT', 'SUMMARY');

-- CreateEnum
CREATE TYPE "ReportCommentAudience" AS ENUM ('STAFF', 'FAMILY', 'LEARNER');

-- CreateEnum
CREATE TYPE "ReportPublicationChannel" AS ENUM ('PARENT_PORTAL', 'LEARNER_PORTAL');

-- CreateTable
CREATE TABLE "ReportTemplate" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "curriculumVersionId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportTemplateSection" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sectionType" "ReportTemplateSectionType" NOT NULL,
    "description" TEXT,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportTemplateSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportCard" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "academicPeriodId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "status" "ReportCardStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "snapshot" JSONB NOT NULL,
    "generatedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "publishedById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "archivedById" TEXT,
    "archivedAt" TIMESTAMP(3),
    "supersedesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportCardEntry" (
    "id" TEXT NOT NULL,
    "reportCardId" TEXT NOT NULL,
    "templateSectionId" TEXT,
    "sectionCode" TEXT NOT NULL,
    "sectionTitle" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "sourceType" "ReportEntrySource" NOT NULL,
    "sourceId" TEXT,
    "sourceEvidenceId" TEXT,
    "subjectCode" TEXT,
    "subjectName" TEXT,
    "label" TEXT NOT NULL,
    "numericValue" DOUBLE PRECISION,
    "maxValue" DOUBLE PRECISION,
    "masteryLevel" TEXT,
    "narrative" TEXT,
    "snapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportCardEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportCardComment" (
    "id" TEXT NOT NULL,
    "reportCardId" TEXT NOT NULL,
    "sectionCode" TEXT,
    "audience" "ReportCommentAudience" NOT NULL DEFAULT 'STAFF',
    "body" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportCardComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportPublication" (
    "id" TEXT NOT NULL,
    "reportCardId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "channel" "ReportPublicationChannel" NOT NULL,
    "version" INTEGER NOT NULL,
    "eventKey" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),

    CONSTRAINT "ReportPublication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportCardAmendment" (
    "id" TEXT NOT NULL,
    "sourceReportCardId" TEXT NOT NULL,
    "replacementReportCardId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "amendedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportCardAmendment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportCardStatusEvent" (
    "id" TEXT NOT NULL,
    "reportCardId" TEXT NOT NULL,
    "fromStatus" "ReportCardStatus",
    "toStatus" "ReportCardStatus" NOT NULL,
    "actorId" TEXT NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportCardStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReportTemplate_schoolId_isDefault_idx" ON "ReportTemplate"("schoolId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "ReportTemplate_schoolId_code_key" ON "ReportTemplate"("schoolId", "code");

-- CreateIndex
CREATE INDEX "ReportTemplateSection_templateId_sequence_idx" ON "ReportTemplateSection"("templateId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "ReportTemplateSection_templateId_code_key" ON "ReportTemplateSection"("templateId", "code");

-- CreateIndex
CREATE INDEX "ReportCard_schoolId_academicPeriodId_status_idx" ON "ReportCard"("schoolId", "academicPeriodId", "status");

-- CreateIndex
CREATE INDEX "ReportCard_studentId_academicPeriodId_createdAt_idx" ON "ReportCard"("studentId", "academicPeriodId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReportCard_studentId_academicPeriodId_templateId_version_key" ON "ReportCard"("studentId", "academicPeriodId", "templateId", "version");

-- CreateIndex
CREATE INDEX "ReportCardEntry_reportCardId_sequence_idx" ON "ReportCardEntry"("reportCardId", "sequence");

-- CreateIndex
CREATE INDEX "ReportCardEntry_sourceEvidenceId_idx" ON "ReportCardEntry"("sourceEvidenceId");

-- CreateIndex
CREATE INDEX "ReportCardComment_reportCardId_audience_createdAt_idx" ON "ReportCardComment"("reportCardId", "audience", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReportPublication_eventKey_key" ON "ReportPublication"("eventKey");

-- CreateIndex
CREATE INDEX "ReportPublication_recipientId_publishedAt_idx" ON "ReportPublication"("recipientId", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReportPublication_reportCardId_recipientId_version_key" ON "ReportPublication"("reportCardId", "recipientId", "version");

-- CreateIndex
CREATE INDEX "ReportCardAmendment_sourceReportCardId_createdAt_idx" ON "ReportCardAmendment"("sourceReportCardId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReportCardAmendment_sourceReportCardId_replacementReportCar_key" ON "ReportCardAmendment"("sourceReportCardId", "replacementReportCardId");

-- CreateIndex
CREATE INDEX "ReportCardStatusEvent_reportCardId_createdAt_idx" ON "ReportCardStatusEvent"("reportCardId", "createdAt");

-- CreateIndex
CREATE INDEX "ReportCardStatusEvent_actorId_createdAt_idx" ON "ReportCardStatusEvent"("actorId", "createdAt");

-- AddForeignKey
ALTER TABLE "ReportTemplate" ADD CONSTRAINT "ReportTemplate_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportTemplate" ADD CONSTRAINT "ReportTemplate_curriculumVersionId_fkey" FOREIGN KEY ("curriculumVersionId") REFERENCES "CurriculumVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportTemplate" ADD CONSTRAINT "ReportTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportTemplateSection" ADD CONSTRAINT "ReportTemplateSection_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ReportTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCard" ADD CONSTRAINT "ReportCard_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCard" ADD CONSTRAINT "ReportCard_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCard" ADD CONSTRAINT "ReportCard_academicPeriodId_fkey" FOREIGN KEY ("academicPeriodId") REFERENCES "AcademicPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCard" ADD CONSTRAINT "ReportCard_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ReportTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCard" ADD CONSTRAINT "ReportCard_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCard" ADD CONSTRAINT "ReportCard_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCard" ADD CONSTRAINT "ReportCard_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCard" ADD CONSTRAINT "ReportCard_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCard" ADD CONSTRAINT "ReportCard_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "ReportCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCardEntry" ADD CONSTRAINT "ReportCardEntry_reportCardId_fkey" FOREIGN KEY ("reportCardId") REFERENCES "ReportCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCardEntry" ADD CONSTRAINT "ReportCardEntry_sourceEvidenceId_fkey" FOREIGN KEY ("sourceEvidenceId") REFERENCES "AssessmentEvidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCardComment" ADD CONSTRAINT "ReportCardComment_reportCardId_fkey" FOREIGN KEY ("reportCardId") REFERENCES "ReportCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCardComment" ADD CONSTRAINT "ReportCardComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportPublication" ADD CONSTRAINT "ReportPublication_reportCardId_fkey" FOREIGN KEY ("reportCardId") REFERENCES "ReportCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportPublication" ADD CONSTRAINT "ReportPublication_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCardAmendment" ADD CONSTRAINT "ReportCardAmendment_sourceReportCardId_fkey" FOREIGN KEY ("sourceReportCardId") REFERENCES "ReportCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCardAmendment" ADD CONSTRAINT "ReportCardAmendment_replacementReportCardId_fkey" FOREIGN KEY ("replacementReportCardId") REFERENCES "ReportCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCardAmendment" ADD CONSTRAINT "ReportCardAmendment_amendedById_fkey" FOREIGN KEY ("amendedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCardStatusEvent" ADD CONSTRAINT "ReportCardStatusEvent_reportCardId_fkey" FOREIGN KEY ("reportCardId") REFERENCES "ReportCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCardStatusEvent" ADD CONSTRAINT "ReportCardStatusEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
