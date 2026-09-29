-- CreateEnum
CREATE TYPE "ScaleType" AS ENUM ('NUMERIC', 'LETTER', 'MASTERY', 'COMPETENCY', 'GPA', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AssessmentActivityType" AS ENUM ('CLASSROOM', 'FORMATIVE', 'SUMMATIVE', 'PROJECT', 'PRACTICAL', 'OBSERVATION', 'SELF_ASSESSMENT', 'PEER_ASSESSMENT', 'EXAM', 'COURSEWORK', 'MOCK_EXAM');

-- CreateEnum
CREATE TYPE "AssessmentPlanStatus" AS ENUM ('DRAFT', 'OPEN', 'SUBMITTED', 'MODERATION', 'PUBLISHED', 'LOCKED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "GradeScale" (
    "id" TEXT NOT NULL,
    "curriculumVersionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scaleType" "ScaleType" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GradeScale_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GradeScaleBand" (
    "id" TEXT NOT NULL,
    "gradeScaleId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "minValue" DOUBLE PRECISION,
    "maxValue" DOUBLE PRECISION,
    "points" DOUBLE PRECISION,
    "description" TEXT,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "GradeScaleBand_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssessmentPlan" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "classAssignmentId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "assessmentType" "AssessmentActivityType" NOT NULL,
    "status" "AssessmentPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "gradeScaleId" TEXT,
    "rubricId" TEXT,
    "weight" DOUBLE PRECISION,
    "date" TIMESTAMP(3),
    "instructions" TEXT,
    "createdById" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssessmentPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssessmentNodeLink" (
    "id" TEXT NOT NULL,
    "assessmentPlanId" TEXT NOT NULL,
    "curriculumNodeId" TEXT,
    "learningOutcomeId" TEXT,
    "weight" DOUBLE PRECISION,
    CONSTRAINT "AssessmentNodeLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssessmentComponent" (
    "id" TEXT NOT NULL,
    "assessmentPlanId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxScore" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssessmentComponent_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Assessment" ADD COLUMN "assessmentPlanId" TEXT;
ALTER TABLE "AssessmentEvidence" ADD COLUMN "assessmentPlanId" TEXT;
ALTER TABLE "AssessmentEvidence" ADD COLUMN "componentId" TEXT;
ALTER TABLE "AssessmentEvidence" ALTER COLUMN "assessmentId" DROP NOT NULL;

CREATE UNIQUE INDEX "GradeScale_curriculumVersionId_code_key" ON "GradeScale"("curriculumVersionId", "code");
CREATE UNIQUE INDEX "GradeScaleBand_gradeScaleId_code_key" ON "GradeScaleBand"("gradeScaleId", "code");
CREATE INDEX "GradeScaleBand_gradeScaleId_sequence_idx" ON "GradeScaleBand"("gradeScaleId", "sequence");
CREATE INDEX "AssessmentPlan_schoolId_periodId_status_idx" ON "AssessmentPlan"("schoolId", "periodId", "status");
CREATE INDEX "AssessmentPlan_classAssignmentId_periodId_idx" ON "AssessmentPlan"("classAssignmentId", "periodId");
CREATE INDEX "AssessmentNodeLink_assessmentPlanId_idx" ON "AssessmentNodeLink"("assessmentPlanId");
CREATE INDEX "AssessmentNodeLink_learningOutcomeId_idx" ON "AssessmentNodeLink"("learningOutcomeId");
CREATE INDEX "AssessmentEvidence_studentId_assessmentPlanId_idx" ON "AssessmentEvidence"("studentId", "assessmentPlanId");

ALTER TABLE "GradeScale" ADD CONSTRAINT "GradeScale_curriculumVersionId_fkey" FOREIGN KEY ("curriculumVersionId") REFERENCES "CurriculumVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GradeScaleBand" ADD CONSTRAINT "GradeScaleBand_gradeScaleId_fkey" FOREIGN KEY ("gradeScaleId") REFERENCES "GradeScale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentPlan" ADD CONSTRAINT "AssessmentPlan_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentPlan" ADD CONSTRAINT "AssessmentPlan_classAssignmentId_fkey" FOREIGN KEY ("classAssignmentId") REFERENCES "ClassCurriculumAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentPlan" ADD CONSTRAINT "AssessmentPlan_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "AcademicPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssessmentPlan" ADD CONSTRAINT "AssessmentPlan_gradeScaleId_fkey" FOREIGN KEY ("gradeScaleId") REFERENCES "GradeScale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssessmentPlan" ADD CONSTRAINT "AssessmentPlan_rubricId_fkey" FOREIGN KEY ("rubricId") REFERENCES "Rubric"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssessmentNodeLink" ADD CONSTRAINT "AssessmentNodeLink_assessmentPlanId_fkey" FOREIGN KEY ("assessmentPlanId") REFERENCES "AssessmentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentNodeLink" ADD CONSTRAINT "AssessmentNodeLink_curriculumNodeId_fkey" FOREIGN KEY ("curriculumNodeId") REFERENCES "CurriculumNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssessmentNodeLink" ADD CONSTRAINT "AssessmentNodeLink_learningOutcomeId_fkey" FOREIGN KEY ("learningOutcomeId") REFERENCES "LearningOutcome"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssessmentComponent" ADD CONSTRAINT "AssessmentComponent_assessmentPlanId_fkey" FOREIGN KEY ("assessmentPlanId") REFERENCES "AssessmentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_assessmentPlanId_fkey" FOREIGN KEY ("assessmentPlanId") REFERENCES "AssessmentPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssessmentEvidence" ADD CONSTRAINT "AssessmentEvidence_assessmentPlanId_fkey" FOREIGN KEY ("assessmentPlanId") REFERENCES "AssessmentPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssessmentEvidence" ADD CONSTRAINT "AssessmentEvidence_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "AssessmentComponent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
