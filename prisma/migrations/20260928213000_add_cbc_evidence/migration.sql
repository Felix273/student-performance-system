-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('SCORE', 'RUBRIC', 'OBSERVATION', 'PROJECT', 'PRACTICAL', 'PRESENTATION', 'SELF_REFLECTION', 'PEER_REVIEW', 'PORTFOLIO');

-- CreateEnum
CREATE TYPE "EvidenceStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'VERIFIED', 'PUBLISHED', 'VOIDED');

-- CreateTable
CREATE TABLE "Rubric" (
    "id" TEXT NOT NULL,
    "curriculumVersionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rubric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RubricCriterion" (
    "id" TEXT NOT NULL,
    "rubricId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sequence" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RubricCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RubricLevel" (
    "id" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "points" DOUBLE PRECISION,
    "sequence" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RubricLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentEvidence" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "learningOutcomeId" TEXT,
    "competencyId" TEXT,
    "rubricId" TEXT,
    "evidenceType" "EvidenceType" NOT NULL,
    "numericScore" DOUBLE PRECISION,
    "maxScore" DOUBLE PRECISION,
    "masteryLevel" TEXT,
    "narrative" TEXT,
    "capturedById" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "EvidenceStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RubricCriterionScore" (
    "id" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "comment" TEXT,

    CONSTRAINT "RubricCriterionScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Rubric_curriculumVersionId_code_key" ON "Rubric"("curriculumVersionId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "RubricCriterion_rubricId_code_key" ON "RubricCriterion"("rubricId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "RubricLevel_criterionId_code_key" ON "RubricLevel"("criterionId", "code");

-- CreateIndex
CREATE INDEX "AssessmentEvidence_schoolId_studentId_assessmentId_idx" ON "AssessmentEvidence"("schoolId", "studentId", "assessmentId");

-- CreateIndex
CREATE INDEX "AssessmentEvidence_studentId_learningOutcomeId_idx" ON "AssessmentEvidence"("studentId", "learningOutcomeId");

-- CreateIndex
CREATE INDEX "AssessmentEvidence_studentId_competencyId_idx" ON "AssessmentEvidence"("studentId", "competencyId");

-- CreateIndex
CREATE UNIQUE INDEX "RubricCriterionScore_evidenceId_criterionId_key" ON "RubricCriterionScore"("evidenceId", "criterionId");

-- AddForeignKey
ALTER TABLE "Rubric" ADD CONSTRAINT "Rubric_curriculumVersionId_fkey" FOREIGN KEY ("curriculumVersionId") REFERENCES "CurriculumVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RubricCriterion" ADD CONSTRAINT "RubricCriterion_rubricId_fkey" FOREIGN KEY ("rubricId") REFERENCES "Rubric"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RubricLevel" ADD CONSTRAINT "RubricLevel_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "RubricCriterion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentEvidence" ADD CONSTRAINT "AssessmentEvidence_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentEvidence" ADD CONSTRAINT "AssessmentEvidence_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentEvidence" ADD CONSTRAINT "AssessmentEvidence_learningOutcomeId_fkey" FOREIGN KEY ("learningOutcomeId") REFERENCES "LearningOutcome"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentEvidence" ADD CONSTRAINT "AssessmentEvidence_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "Competency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentEvidence" ADD CONSTRAINT "AssessmentEvidence_rubricId_fkey" FOREIGN KEY ("rubricId") REFERENCES "Rubric"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RubricCriterionScore" ADD CONSTRAINT "RubricCriterionScore_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "AssessmentEvidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RubricCriterionScore" ADD CONSTRAINT "RubricCriterionScore_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "RubricCriterion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RubricCriterionScore" ADD CONSTRAINT "RubricCriterionScore_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "RubricLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
