-- CreateEnum
CREATE TYPE "CurriculumVersionStatus" AS ENUM ('DRAFT', 'REVIEW', 'PUBLISHED', 'RETIRED');

-- CreateEnum
CREATE TYPE "CurriculumNodeType" AS ENUM ('PATHWAY', 'GRADE', 'LEARNING_AREA', 'SUBJECT', 'STRAND', 'SUB_STRAND', 'UNIT', 'TOPIC', 'OTHER');

-- CreateEnum
CREATE TYPE "OfferingStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'TRANSFERRED', 'COMPLETED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "AcademicYear" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startsOn" TIMESTAMP(3) NOT NULL,
    "endsOn" TIMESTAMP(3) NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicPeriod" (
    "id" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "startsOn" TIMESTAMP(3) NOT NULL,
    "endsOn" TIMESTAMP(3) NOT NULL,
    "sequence" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Curriculum" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT,
    "country" TEXT,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Curriculum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumVersion" (
    "id" TEXT NOT NULL,
    "curriculumId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "status" "CurriculumVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "sourceUrl" TEXT,
    "sourceRef" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurriculumVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumNode" (
    "id" TEXT NOT NULL,
    "curriculumVersionId" TEXT NOT NULL,
    "parentId" TEXT,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "nodeType" "CurriculumNodeType" NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "gradeFrom" TEXT,
    "gradeTo" TEXT,
    "isAssessable" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurriculumNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningOutcome" (
    "id" TEXT NOT NULL,
    "curriculumNodeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "successCriteria" TEXT,
    "suggestedActivities" TEXT,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "isAssessable" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competency" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Competency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Value" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Value_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumNodeCompetency" (
    "curriculumNodeId" TEXT NOT NULL,
    "competencyId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CurriculumNodeCompetency_pkey" PRIMARY KEY ("curriculumNodeId","competencyId")
);

-- CreateTable
CREATE TABLE "CurriculumNodeValue" (
    "curriculumNodeId" TEXT NOT NULL,
    "valueId" TEXT NOT NULL,

    CONSTRAINT "CurriculumNodeValue_pkey" PRIMARY KEY ("curriculumNodeId","valueId")
);

-- CreateTable
CREATE TABLE "CurriculumOffering" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "curriculumId" TEXT NOT NULL,
    "curriculumVersionId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "OfferingStatus" NOT NULL DEFAULT 'DRAFT',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurriculumOffering_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferingGrade" (
    "id" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "gradeCode" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferingGrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassCurriculumAssignment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "offeringGradeId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "periodId" TEXT,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassCurriculumAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearnerCurriculumEnrollment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "startsOn" TIMESTAMP(3) NOT NULL,
    "endsOn" TIMESTAMP(3),
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearnerCurriculumEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubjectCurriculumLink" (
    "subjectId" TEXT NOT NULL,
    "curriculumNodeId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "localName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubjectCurriculumLink_pkey" PRIMARY KEY ("subjectId","curriculumNodeId")
);

-- CreateIndex
CREATE INDEX "AcademicYear_schoolId_isCurrent_idx" ON "AcademicYear"("schoolId", "isCurrent");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicYear_schoolId_name_key" ON "AcademicYear"("schoolId", "name");

-- CreateIndex
CREATE INDEX "AcademicPeriod_academicYearId_sequence_idx" ON "AcademicPeriod"("academicYearId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicPeriod_academicYearId_code_key" ON "AcademicPeriod"("academicYearId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Curriculum_code_key" ON "Curriculum"("code");

-- CreateIndex
CREATE INDEX "CurriculumVersion_curriculumId_status_idx" ON "CurriculumVersion"("curriculumId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumVersion_curriculumId_version_key" ON "CurriculumVersion"("curriculumId", "version");

-- CreateIndex
CREATE INDEX "CurriculumNode_curriculumVersionId_parentId_sequence_idx" ON "CurriculumNode"("curriculumVersionId", "parentId", "sequence");

-- CreateIndex
CREATE INDEX "CurriculumNode_curriculumVersionId_nodeType_idx" ON "CurriculumNode"("curriculumVersionId", "nodeType");

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumNode_curriculumVersionId_code_key" ON "CurriculumNode"("curriculumVersionId", "code");

-- CreateIndex
CREATE INDEX "LearningOutcome_curriculumNodeId_sequence_idx" ON "LearningOutcome"("curriculumNodeId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "LearningOutcome_curriculumNodeId_code_key" ON "LearningOutcome"("curriculumNodeId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Competency_code_key" ON "Competency"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Value_code_key" ON "Value"("code");

-- CreateIndex
CREATE INDEX "CurriculumOffering_schoolId_status_idx" ON "CurriculumOffering"("schoolId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumOffering_schoolId_academicYearId_code_key" ON "CurriculumOffering"("schoolId", "academicYearId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "OfferingGrade_offeringId_gradeCode_key" ON "OfferingGrade"("offeringId", "gradeCode");

-- CreateIndex
CREATE INDEX "ClassCurriculumAssignment_schoolId_academicYearId_idx" ON "ClassCurriculumAssignment"("schoolId", "academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassCurriculumAssignment_classId_offeringId_academicYearId_key" ON "ClassCurriculumAssignment"("classId", "offeringId", "academicYearId", "periodId");

-- CreateIndex
CREATE INDEX "LearnerCurriculumEnrollment_schoolId_studentId_status_idx" ON "LearnerCurriculumEnrollment"("schoolId", "studentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LearnerCurriculumEnrollment_studentId_assignmentId_key" ON "LearnerCurriculumEnrollment"("studentId", "assignmentId");

-- AddForeignKey
ALTER TABLE "AcademicYear" ADD CONSTRAINT "AcademicYear_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicPeriod" ADD CONSTRAINT "AcademicPeriod_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumVersion" ADD CONSTRAINT "CurriculumVersion_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "Curriculum"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumNode" ADD CONSTRAINT "CurriculumNode_curriculumVersionId_fkey" FOREIGN KEY ("curriculumVersionId") REFERENCES "CurriculumVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumNode" ADD CONSTRAINT "CurriculumNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CurriculumNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningOutcome" ADD CONSTRAINT "LearningOutcome_curriculumNodeId_fkey" FOREIGN KEY ("curriculumNodeId") REFERENCES "CurriculumNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumNodeCompetency" ADD CONSTRAINT "CurriculumNodeCompetency_curriculumNodeId_fkey" FOREIGN KEY ("curriculumNodeId") REFERENCES "CurriculumNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumNodeCompetency" ADD CONSTRAINT "CurriculumNodeCompetency_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "Competency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumNodeValue" ADD CONSTRAINT "CurriculumNodeValue_curriculumNodeId_fkey" FOREIGN KEY ("curriculumNodeId") REFERENCES "CurriculumNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumNodeValue" ADD CONSTRAINT "CurriculumNodeValue_valueId_fkey" FOREIGN KEY ("valueId") REFERENCES "Value"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumOffering" ADD CONSTRAINT "CurriculumOffering_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumOffering" ADD CONSTRAINT "CurriculumOffering_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "Curriculum"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumOffering" ADD CONSTRAINT "CurriculumOffering_curriculumVersionId_fkey" FOREIGN KEY ("curriculumVersionId") REFERENCES "CurriculumVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumOffering" ADD CONSTRAINT "CurriculumOffering_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferingGrade" ADD CONSTRAINT "OfferingGrade_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "CurriculumOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassCurriculumAssignment" ADD CONSTRAINT "ClassCurriculumAssignment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassCurriculumAssignment" ADD CONSTRAINT "ClassCurriculumAssignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassCurriculumAssignment" ADD CONSTRAINT "ClassCurriculumAssignment_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "CurriculumOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassCurriculumAssignment" ADD CONSTRAINT "ClassCurriculumAssignment_offeringGradeId_fkey" FOREIGN KEY ("offeringGradeId") REFERENCES "OfferingGrade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassCurriculumAssignment" ADD CONSTRAINT "ClassCurriculumAssignment_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassCurriculumAssignment" ADD CONSTRAINT "ClassCurriculumAssignment_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "AcademicPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnerCurriculumEnrollment" ADD CONSTRAINT "LearnerCurriculumEnrollment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnerCurriculumEnrollment" ADD CONSTRAINT "LearnerCurriculumEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnerCurriculumEnrollment" ADD CONSTRAINT "LearnerCurriculumEnrollment_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "CurriculumOffering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnerCurriculumEnrollment" ADD CONSTRAINT "LearnerCurriculumEnrollment_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ClassCurriculumAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectCurriculumLink" ADD CONSTRAINT "SubjectCurriculumLink_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectCurriculumLink" ADD CONSTRAINT "SubjectCurriculumLink_curriculumNodeId_fkey" FOREIGN KEY ("curriculumNodeId") REFERENCES "CurriculumNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
