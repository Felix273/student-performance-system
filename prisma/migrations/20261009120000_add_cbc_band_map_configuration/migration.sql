CREATE TYPE "CbcBandScope" AS ENUM ('SCHOOL', 'STAGE', 'GRADE');

CREATE TABLE "CbcPerformanceBandMap" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "scope" "CbcBandScope" NOT NULL,
    "scopeCode" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CbcPerformanceBandMap_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CbcPerformanceBand" (
    "id" TEXT NOT NULL,
    "bandMapId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "parentLevelCode" TEXT,
    "minPercent" DOUBLE PRECISION NOT NULL,
    "maxPercent" DOUBLE PRECISION NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CbcPerformanceBand_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CbcPerformanceBandMap_schoolId_academicYearId_idx"
    ON "CbcPerformanceBandMap"("schoolId", "academicYearId");
CREATE UNIQUE INDEX "CbcPerformanceBandMap_schoolId_academicYearId_scope_scopeCode_key"
    ON "CbcPerformanceBandMap"("schoolId", "academicYearId", "scope", "scopeCode");
CREATE INDEX "CbcPerformanceBand_bandMapId_sequence_idx"
    ON "CbcPerformanceBand"("bandMapId", "sequence");
CREATE UNIQUE INDEX "CbcPerformanceBand_bandMapId_code_key"
    ON "CbcPerformanceBand"("bandMapId", "code");

ALTER TABLE "CbcPerformanceBandMap"
    ADD CONSTRAINT "CbcPerformanceBandMap_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CbcPerformanceBandMap"
    ADD CONSTRAINT "CbcPerformanceBandMap_academicYearId_fkey"
    FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CbcPerformanceBand"
    ADD CONSTRAINT "CbcPerformanceBand_bandMapId_fkey"
    FOREIGN KEY ("bandMapId") REFERENCES "CbcPerformanceBandMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;