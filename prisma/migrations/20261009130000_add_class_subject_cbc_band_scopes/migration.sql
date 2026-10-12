ALTER TYPE "CbcBandScope" ADD VALUE 'CLASS';

ALTER TABLE "CbcPerformanceBandMap"
    ADD COLUMN "classId" TEXT,
    ADD COLUMN "subjectId" TEXT,
    ADD COLUMN "subjectCode" TEXT NOT NULL DEFAULT '';

DROP INDEX "CbcPerformanceBandMap_schoolId_academicYearId_scope_scopeCode_key";

CREATE UNIQUE INDEX "CbcPerformanceBandMap_schoolId_academicYearId_scope_scopeCode_subjectCode_key"
    ON "CbcPerformanceBandMap"("schoolId", "academicYearId", "scope", "scopeCode", "subjectCode");
CREATE INDEX "CbcPerformanceBandMap_schoolId_academicYearId_scope_subjectCode_idx"
    ON "CbcPerformanceBandMap"("schoolId", "academicYearId", "scope", "subjectCode");
CREATE INDEX "CbcPerformanceBandMap_classId_idx"
    ON "CbcPerformanceBandMap"("classId");
CREATE INDEX "CbcPerformanceBandMap_subjectId_idx"
    ON "CbcPerformanceBandMap"("subjectId");

ALTER TABLE "CbcPerformanceBandMap"
    ADD CONSTRAINT "CbcPerformanceBandMap_classId_fkey"
    FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CbcPerformanceBandMap"
    ADD CONSTRAINT "CbcPerformanceBandMap_subjectId_fkey"
    FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;