-- Teacher Lesson Workspace v1: connect timetable entries to curriculum context
-- and persist lesson workflow/focus state without duplicating evidence records.

CREATE TYPE "LessonWorkspaceState" AS ENUM ('OPEN', 'SUBMITTED', 'RETURNED', 'CLOSED');

ALTER TABLE "TimetableEntry"
  ADD COLUMN "curriculumAssignmentId" TEXT;

CREATE TABLE "LessonWorkspaceSession" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "timetableEntryId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "assessmentPlanId" TEXT,
    "state" "LessonWorkspaceState" NOT NULL DEFAULT 'OPEN',
    "lastClientRevision" INTEGER NOT NULL DEFAULT 0,
    "lastSavedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LessonWorkspaceSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LessonFocus" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "timetableEntryId" TEXT NOT NULL,
    "curriculumNodeId" TEXT,
    "learningOutcomeId" TEXT,
    "competencyId" TEXT,
    "valueId" TEXT,
    "note" TEXT,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LessonFocus_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LessonWorkspaceSession_timetableEntryId_teacherId_key"
  ON "LessonWorkspaceSession"("timetableEntryId", "teacherId");
CREATE INDEX "LessonWorkspaceSession_schoolId_teacherId_state_idx"
  ON "LessonWorkspaceSession"("schoolId", "teacherId", "state");
CREATE INDEX "LessonFocus_timetableEntryId_sequence_idx"
  ON "LessonFocus"("timetableEntryId", "sequence");
CREATE INDEX "LessonFocus_schoolId_learningOutcomeId_idx"
  ON "LessonFocus"("schoolId", "learningOutcomeId");
CREATE INDEX "TimetableEntry_curriculumAssignmentId_idx"
  ON "TimetableEntry"("curriculumAssignmentId");

ALTER TABLE "TimetableEntry"
  ADD CONSTRAINT "TimetableEntry_curriculumAssignmentId_fkey"
  FOREIGN KEY ("curriculumAssignmentId") REFERENCES "ClassCurriculumAssignment"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LessonWorkspaceSession"
  ADD CONSTRAINT "LessonWorkspaceSession_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonWorkspaceSession"
  ADD CONSTRAINT "LessonWorkspaceSession_timetableEntryId_fkey"
  FOREIGN KEY ("timetableEntryId") REFERENCES "TimetableEntry"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonWorkspaceSession"
  ADD CONSTRAINT "LessonWorkspaceSession_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonWorkspaceSession"
  ADD CONSTRAINT "LessonWorkspaceSession_assessmentPlanId_fkey"
  FOREIGN KEY ("assessmentPlanId") REFERENCES "AssessmentPlan"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LessonFocus"
  ADD CONSTRAINT "LessonFocus_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonFocus"
  ADD CONSTRAINT "LessonFocus_timetableEntryId_fkey"
  FOREIGN KEY ("timetableEntryId") REFERENCES "TimetableEntry"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonFocus"
  ADD CONSTRAINT "LessonFocus_curriculumNodeId_fkey"
  FOREIGN KEY ("curriculumNodeId") REFERENCES "CurriculumNode"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LessonFocus"
  ADD CONSTRAINT "LessonFocus_learningOutcomeId_fkey"
  FOREIGN KEY ("learningOutcomeId") REFERENCES "LearningOutcome"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LessonFocus"
  ADD CONSTRAINT "LessonFocus_competencyId_fkey"
  FOREIGN KEY ("competencyId") REFERENCES "Competency"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LessonFocus"
  ADD CONSTRAINT "LessonFocus_valueId_fkey"
  FOREIGN KEY ("valueId") REFERENCES "Value"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LessonFocus"
  ADD CONSTRAINT "LessonFocus_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
