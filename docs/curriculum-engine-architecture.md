# Curriculum Engine Architecture

## CBC-first, multi-curriculum-ready design for StudentOS

**Status:** Proposed architecture  
**Scope:** Kenya CBC first; extensible to Cambridge and other international curricula  
**Database:** PostgreSQL with Prisma ORM  
**Application:** Next.js 15 App Router, React 19, multi-tenant school platform

---

## 1. Executive decision

StudentOS should not model curriculum as a list of subjects attached directly to a class. It should model curriculum as a **versioned, publishable academic framework** that a school adopts for a particular academic period.

The core relationship should be:

```text
School
  └── CurriculumOffering
        ├── CurriculumVersion
        │     └── CurriculumNode tree
        │           ├── LearningArea / Subject
        │           ├── Strand / Unit
        │           ├── Sub-strand / Topic
        │           ├── LearningOutcome
        │           ├── Competency
        │           └── Value / Cross-cutting theme
        └── ClassCurriculumAssignment
              └── LearnerCurriculumEnrollment
                    └── AssessmentEvidence
                          ├── RubricAssessment
                          ├── Observation
                          ├── Artifact / PortfolioItem
                          └── Feedback
```

This allows the same school to run:

- Kenya CBC in primary and junior/senior secondary
- Cambridge Primary or Lower Secondary in another stream
- Cambridge IGCSE or A Level for older learners
- A blended national/international program
- Different curriculum versions across academic years

The existing `Subject`, `Assessment`, and `AssessmentResult` models should remain temporarily supported as a compatibility layer while the new engine becomes the source of truth.

---

## 2. Design principles

### 2.1 Tenant isolation is mandatory

Every school-owned curriculum record must be reachable through a school-owned root and must be checked server-side. Do not rely on a client-provided `schoolId`.

Recommended authorization chain:

```text
session.user.schoolId
  → CurriculumOffering.schoolId
  → CurriculumVersion
  → CurriculumNode / LearningOutcome / Assessment
```

Super administrators may cross school boundaries only through explicit administrative routes.

### 2.2 Curriculum content and school adoption are different things

A curriculum definition is reusable content. A school’s adoption of it is a tenant-specific configuration.

For example:

- `CBC 2026 Basic Education` is a curriculum definition.
- `Demo School CBC Primary 2026` is the school’s offering.
- `Class 4 Blue, Term 1 2026` is a class assignment.

This prevents copying the entire curriculum for every school and makes updates auditable.

### 2.3 Version everything that affects assessment

Published curriculum structures and grading rules must be immutable. If a school changes a learning outcome, rubric, or grade scale after assessment evidence exists, create a new version or revision rather than mutating historical meaning.

### 2.4 Separate evidence from judgment

Store the original evidence and the teacher’s interpretation separately:

- Evidence: score, observation, artifact, comment, attendance at activity
- Judgment: rating, grade, mastery level, teacher feedback

This preserves auditability and supports reassessment.

### 2.5 Support structured and qualitative assessment

CBC cannot be reduced to marks. The model must support:

- Numeric scores
- Letter grades
- Competency ratings
- Rubrics
- Narrative comments
- Practical performance
- Self-assessment
- Peer assessment
- Teacher observation
- Portfolio evidence

### 2.6 Do not hard-code CBC labels

Default CBC labels can be seeded, but schools need configurable labels, rating scales, learning areas, reporting templates, and terminology.

---

## 3. Domain architecture

### 3.1 Platform layer

Existing models:

- `School`
- `User`
- `Student`
- `Class`
- `Subject`
- `TeacherClass`

New platform-facing concepts:

- Academic year
- Term / semester / cycle
- Curriculum offering
- Learner enrollment
- Teacher assignment

### 3.2 Curriculum definition layer

Reusable and versioned curriculum content:

- Curriculum
- CurriculumVersion
- CurriculumNode
- CurriculumNodeRelation
- LearningOutcome
- Competency
- Value
- CurriculumNodeCompetency
- CurriculumNodeValue
- GradeScale
- GradeScaleBand
- Rubric
- RubricCriterion
- RubricLevel

### 3.3 School configuration layer

Tenant-specific adoption and mapping:

- CurriculumOffering
- OfferingGrade
- OfferingLearningArea
- OfferingNodeOverride
- ClassCurriculumAssignment
- SubjectOffering
- TeacherSubjectAssignment
- LearnerCurriculumEnrollment

### 3.4 Assessment layer

Actual school activity and evidence:

- AssessmentPlan
- AssessmentActivity
- AssessmentComponent
- AssessmentSubmission
- AssessmentEvidence
- EvidenceParticipant
- RubricAssessment
- RubricCriterionScore
- Observation
- Feedback
- PortfolioItem
- ProgressSnapshot

### 3.5 Reporting layer

Published communication to families and learners:

- ReportTemplate
- ReportTemplateSection
- ReportCard
- ReportCardEntry
- ReportCardComment
- ReportPublication
- ReportAcknowledgement

---

## 4. Proposed Prisma schema

The following is the target model. It is intentionally more normalized than the current schema. Enums may be implemented as PostgreSQL enums or strings where schools need custom values.

### 4.1 Academic period and curriculum adoption

```prisma
model AcademicYear {
  id          String   @id @default(cuid())
  schoolId    String
  school      School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  name        String   // e.g. "2026"
  startsOn    DateTime
  endsOn      DateTime
  isCurrent   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  periods     AcademicPeriod[]
  offerings   CurriculumOffering[]
  assignments ClassCurriculumAssignment[]

  @@unique([schoolId, name])
  @@index([schoolId, isCurrent])
}

model AcademicPeriod {
  id            String       @id @default(cuid())
  academicYearId String
  academicYear  AcademicYear @relation(fields: [academicYearId], references: [id], onDelete: Cascade)
  name          String       // Term 1, Semester 1, Half Term 1
  code          String
  startsOn      DateTime
  endsOn        DateTime
  sequence      Int
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  assessments   AssessmentPlan[]
  assignments   ClassCurriculumAssignment[]
  reportCards   ReportCard[]

  @@unique([academicYearId, code])
  @@index([academicYearId, sequence])
}

model Curriculum {
  id                String   @id @default(cuid())
  code              String   @unique // CBC, CAMBRIDGE, IB, CUSTOM
  name              String
  provider          String?  // KICD, Cambridge International, school-defined
  country           String?  // KE for CBC
  description       String?  @db.Text
  isSystem          Boolean  @default(false)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  versions          CurriculumVersion[]
  offerings         CurriculumOffering[]
}

model CurriculumVersion {
  id             String     @id @default(cuid())
  curriculumId   String
  curriculum     Curriculum  @relation(fields: [curriculumId], references: [id], onDelete: Cascade)
  version        String     // 2026.1, 2026 Grade 4
  status         CurriculumVersionStatus @default(DRAFT)
  effectiveFrom  DateTime?
  effectiveTo    DateTime?
  publishedAt    DateTime?
  publishedById  String?
  sourceUrl      String?
  sourceRef      String?
  notes          String?    @db.Text
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt

  nodes          CurriculumNode[]
  offerings      CurriculumOffering[]
  gradeScales    GradeScale[]
  rubrics        Rubric[]

  @@unique([curriculumId, version])
  @@index([curriculumId, status])
}

enum CurriculumVersionStatus {
  DRAFT
  REVIEW
  PUBLISHED
  RETIRED
}

model CurriculumOffering {
  id                 String           @id @default(cuid())
  schoolId           String
  school             School           @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  curriculumId       String
  curriculum         Curriculum       @relation(fields: [curriculumId], references: [id])
  curriculumVersionId String
  curriculumVersion  CurriculumVersion @relation(fields: [curriculumVersionId], references: [id])
  academicYearId     String
  academicYear       AcademicYear     @relation(fields: [academicYearId], references: [id])
  name               String            // e.g. "CBC Primary", "Cambridge Lower Secondary"
  code               String
  status             OfferingStatus    @default(DRAFT)
  isDefault          Boolean           @default(false)
  createdAt          DateTime          @default(now())
  updatedAt          DateTime          @updatedAt

  grades             OfferingGrade[]
  assignments        ClassCurriculumAssignment[]
  enrollments        LearnerCurriculumEnrollment[]
  reportTemplates    ReportTemplate[]

  @@unique([schoolId, academicYearId, code])
  @@index([schoolId, status])
}

enum OfferingStatus {
  DRAFT
  ACTIVE
  ARCHIVED
}

model OfferingGrade {
  id            String             @id @default(cuid())
  offeringId    String
  offering      CurriculumOffering @relation(fields: [offeringId], references: [id], onDelete: Cascade)
  gradeCode     String             // PP1, G4, G9, YEAR_10
  displayName   String
  sequence      Int
  createdAt     DateTime           @default(now())

  assignments   ClassCurriculumAssignment[]

  @@unique([offeringId, gradeCode])
}
```

### 4.2 Curriculum hierarchy

Use one flexible node table instead of separate tables for learning areas, strands, sub-strands, topics, and outcomes. This supports CBC and Cambridge without making every curriculum fit the same hierarchy.

```prisma
model CurriculumNode {
  id                String           @id @default(cuid())
  curriculumVersionId String
  curriculumVersion CurriculumVersion @relation(fields: [curriculumVersionId], references: [id], onDelete: Cascade)
  parentId          String?
  parent            CurriculumNode?  @relation("CurriculumTree", fields: [parentId], references: [id], onDelete: Cascade)
  children          CurriculumNode[] @relation("CurriculumTree")
  code              String
  title             String
  description       String?          @db.Text
  nodeType          CurriculumNodeType
  sequence          Int              @default(0)
  gradeFrom         String?
  gradeTo           String?
  isAssessable      Boolean          @default(false)
  metadata          Json?
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt

  outcomes          LearningOutcome[]
  competencies      CurriculumNodeCompetency[]
  values            CurriculumNodeValue[]
  subjectLinks      SubjectCurriculumLink[]
  assessmentLinks   AssessmentNodeLink[]

  @@unique([curriculumVersionId, code])
  @@index([curriculumVersionId, parentId, sequence])
  @@index([curriculumVersionId, nodeType])
}

enum CurriculumNodeType {
  PATHWAY
  GRADE
  LEARNING_AREA
  SUBJECT
  STRAND
  SUB_STRAND
  UNIT
  TOPIC
  SYLLABUS_SECTION
  PROJECT
  OTHER
}

model LearningOutcome {
  id             String         @id @default(cuid())
  curriculumNodeId String
  curriculumNode CurriculumNode @relation(fields: [curriculumNodeId], references: [id], onDelete: Cascade)
  code           String
  statement      String         @db.Text
  successCriteria String?       @db.Text
  suggestedActivities String?   @db.Text
  sequence       Int            @default(0)
  isAssessable   Boolean        @default(true)
  metadata       Json?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  assessments    AssessmentNodeLink[]
  evidence       AssessmentEvidence[]

  @@unique([curriculumNodeId, code])
  @@index([curriculumNodeId, sequence])
}

model Competency {
  id          String   @id @default(cuid())
  code        String   @unique
  name        String
  description String?  @db.Text
  isSystem    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  nodes       CurriculumNodeCompetency[]
  evidence    AssessmentEvidence[]
}

model Value {
  id          String   @id @default(cuid())
  code        String   @unique
  name        String
  description String?  @db.Text
  isSystem    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt    DateTime @updatedAt

  nodes       CurriculumNodeValue[]
  evidence    AssessmentEvidence[]
}

model CurriculumNodeCompetency {
  curriculumNodeId String
  competencyId     String
  curriculumNode   CurriculumNode @relation(fields: [curriculumNodeId], references: [id], onDelete: Cascade)
  competency       Competency     @relation(fields: [competencyId], references: [id], onDelete: Cascade)
  isPrimary        Boolean        @default(false)

  @@id([curriculumNodeId, competencyId])
}

model CurriculumNodeValue {
  curriculumNodeId String
  valueId          String
  curriculumNode   CurriculumNode @relation(fields: [curriculumNodeId], references: [id], onDelete: Cascade)
  value            Value          @relation(fields: [valueId], references: [id], onDelete: Cascade)

  @@id([curriculumNodeId, valueId])
}
```

### 4.3 School subject and class mapping

Keep the existing `Subject` model as the school-facing subject record. Add links to curriculum nodes rather than replacing it immediately.

```prisma
model SubjectCurriculumLink {
  subjectId        String
  curriculumNodeId String
  subject          Subject        @relation(fields: [subjectId], references: [id], onDelete: Cascade)
  curriculumNode   CurriculumNode @relation(fields: [curriculumNodeId], references: [id], onDelete: Cascade)
  isPrimary        Boolean        @default(false)
  localName        String?
  createdAt        DateTime       @default(now())

  @@id([subjectId, curriculumNodeId])
}

model ClassCurriculumAssignment {
  id              String             @id @default(cuid())
  schoolId        String
  classId         String
  class           Class              @relation(fields: [classId], references: [id], onDelete: Cascade)
  offeringId      String
  offering        CurriculumOffering @relation(fields: [offeringId], references: [id], onDelete: Cascade)
  offeringGradeId String
  offeringGrade   OfferingGrade      @relation(fields: [offeringGradeId], references: [id])
  academicYearId  String
  academicYear    AcademicYear       @relation(fields: [academicYearId], references: [id])
  periodId        String?
  period          AcademicPeriod?    @relation(fields: [periodId], references: [id])
  status          AssignmentStatus   @default(ACTIVE)
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  enrollments     LearnerCurriculumEnrollment[]
  assessments     AssessmentPlan[]

  @@unique([classId, offeringId, academicYearId, periodId])
  @@index([schoolId, academicYearId])
}

enum AssignmentStatus {
  DRAFT
  ACTIVE
  COMPLETED
  ARCHIVED
}

model LearnerCurriculumEnrollment {
  id           String             @id @default(cuid())
  studentId    String
  student      Student            @relation(fields: [studentId], references: [id], onDelete: Cascade)
  offeringId   String
  offering     CurriculumOffering @relation(fields: [offeringId], references: [id])
  assignmentId String
  assignment   ClassCurriculumAssignment @relation(fields: [assignmentId], references: [id])
  startsOn     DateTime
  endsOn       DateTime?
  status       EnrollmentStatus  @default(ACTIVE)
  createdAt    DateTime           @default(now())
  updatedAt    DateTime           @updatedAt

  evidence     AssessmentEvidence[]
  reportCards  ReportCard[]

  @@unique([studentId, assignmentId])
  @@index([studentId, status])
}

enum EnrollmentStatus {
  ACTIVE
  TRANSFERRED
  COMPLETED
  WITHDRAWN
}
```

### 4.4 Grading scales and rubrics

```prisma
model GradeScale {
  id                  String           @id @default(cuid())
  curriculumVersionId String
  curriculumVersion   CurriculumVersion @relation(fields: [curriculumVersionId], references: [id], onDelete: Cascade)
  code                String
  name                String
  scaleType           ScaleType
  description         String?
  createdAt           DateTime         @default(now())
  updatedAt           DateTime         @updatedAt

  bands               GradeScaleBand[]
  assessments         AssessmentPlan[]

  @@unique([curriculumVersionId, code])
}

enum ScaleType {
  NUMERIC
  LETTER
  MASTERY
  COMPETENCY
  GPA
  CUSTOM
}

model GradeScaleBand {
  id           String     @id @default(cuid())
  gradeScaleId String
  gradeScale   GradeScale @relation(fields: [gradeScaleId], references: [id], onDelete: Cascade)
  code         String     // EE, ME, AE, BE; A*, A, B; 4.0, etc.
  label        String
  minValue     Float?
  maxValue     Float?
  points       Float?
  description  String?
  sequence     Int        @default(0)

  @@unique([gradeScaleId, code])
  @@index([gradeScaleId, sequence])
}

model Rubric {
  id                  String            @id @default(cuid())
  curriculumVersionId String
  curriculumVersion   CurriculumVersion @relation(fields: [curriculumVersionId], references: [id], onDelete: Cascade)
  code                String
  name                String
  description         String?           @db.Text
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt

  criteria            RubricCriterion[]
  assessments         AssessmentPlan[]

  @@unique([curriculumVersionId, code])
}

model RubricCriterion {
  id          String       @id @default(cuid())
  rubricId    String
  rubric      Rubric       @relation(fields: [rubricId], references: [id], onDelete: Cascade)
  code        String
  name        String
  description String?      @db.Text
  sequence    Int          @default(0)

  levels      RubricLevel[]
  scores      RubricCriterionScore[]

  @@unique([rubricId, code])
}

model RubricLevel {
  id          String          @id @default(cuid())
  criterionId String
  criterion   RubricCriterion  @relation(fields: [criterionId], references: [id], onDelete: Cascade)
  code        String
  label       String
  description String?         @db.Text
  points      Float?
  sequence    Int             @default(0)

  @@unique([criterionId, code])
}
```

### 4.5 Assessment activities and evidence

```prisma
model AssessmentPlan {
  id                    String                    @id @default(cuid())
  schoolId              String
  classAssignmentId     String
  classAssignment       ClassCurriculumAssignment @relation(fields: [classAssignmentId], references: [id])
  periodId              String
  period                AcademicPeriod            @relation(fields: [periodId], references: [id])
  title                 String
  assessmentType        AssessmentActivityType
  status                AssessmentStatus          @default(DRAFT)
  gradeScaleId          String?
  gradeScale            GradeScale?
  rubricId              String?
  rubric                Rubric?
  weight                Float?
  date                  DateTime?
  instructions          String?                   @db.Text
  createdById            String
  publishedAt           DateTime?
  lockedAt              DateTime?
  createdAt             DateTime                  @default(now())
  updatedAt             DateTime                  @updatedAt

  nodes                 AssessmentNodeLink[]
  components            AssessmentComponent[]
  evidence              AssessmentEvidence[]
  reports               ReportCardEntry[]

  @@index([schoolId, periodId, status])
}

enum AssessmentActivityType {
  CLASSROOM
  FORMATIVE
  SUMMATIVE
  PROJECT
  PRACTICAL
  OBSERVATION
  SELF_ASSESSMENT
  PEER_ASSESSMENT
  EXAM
  COURSEWORK
  MOCK_EXAM
}

enum AssessmentStatus {
  DRAFT
  OPEN
  SUBMITTED
  MODERATION
  PUBLISHED
  LOCKED
  ARCHIVED
}

model AssessmentNodeLink {
  assessmentPlanId  String
  curriculumNodeId  String?
  learningOutcomeId String?
  assessmentPlan    AssessmentPlan  @relation(fields: [assessmentPlanId], references: [id], onDelete: Cascade)
  curriculumNode    CurriculumNode? @relation(fields: [curriculumNodeId], references: [id])
  learningOutcome   LearningOutcome? @relation(fields: [learningOutcomeId], references: [id])
  weight            Float?

  @@id([assessmentPlanId, curriculumNodeId, learningOutcomeId])
  @@index([learningOutcomeId])
}

model AssessmentComponent {
  id               String          @id @default(cuid())
  assessmentPlanId String
  assessmentPlan   AssessmentPlan @relation(fields: [assessmentPlanId], references: [id], onDelete: Cascade)
  name             String
  maxScore         Float?
  weight           Float?
  sequence         Int             @default(0)
  createdAt        DateTime        @default(now())

  evidence         AssessmentEvidence[]
}

model AssessmentEvidence {
  id                    String                    @id @default(cuid())
  schoolId              String
  studentId             String
  student               Student                   @relation(fields: [studentId], references: [id], onDelete: Cascade)
  enrollmentId          String?
  enrollment            LearnerCurriculumEnrollment? @relation(fields: [enrollmentId], references: [id])
  assessmentPlanId      String
  assessmentPlan        AssessmentPlan            @relation(fields: [assessmentPlanId], references: [id], onDelete: Cascade)
  componentId            String?
  component              AssessmentComponent?     @relation(fields: [componentId], references: [id])
  learningOutcomeId      String?
  learningOutcome        LearningOutcome?         @relation(fields: [learningOutcomeId], references: [id])
  competencyId           String?
  competency             Competency?              @relation(fields: [competencyId], references: [id])
  valueId                String?
  value                  Value?                   @relation(fields: [valueId], references: [id])
  evidenceType           EvidenceType
  numericScore           Float?
  maxScore               Float?
  selectedBandCode       String?
  masteryLevel           String?
  narrative              String?                  @db.Text
  capturedById           String
  capturedAt             DateTime                 @default(now())
  status                 EvidenceStatus            @default(DRAFT)
  metadata               Json?
  createdAt              DateTime                 @default(now())
  updatedAt              DateTime                 @updatedAt

  rubricScores            RubricCriterionScore[]
  portfolioItems          PortfolioItem[]
  feedback                Feedback[]

  @@index([schoolId, studentId, assessmentPlanId])
  @@index([learningOutcomeId, studentId])
  @@index([competencyId, studentId])
}

enum EvidenceType {
  SCORE
  RUBRIC
  OBSERVATION
  PROJECT
  PRACTICAL
  PRESENTATION
  SELF_REFLECTION
  PEER_REVIEW
  PORTFOLIO
}

enum EvidenceStatus {
  DRAFT
  SUBMITTED
  VERIFIED
  PUBLISHED
  VOIDED
}

model RubricCriterionScore {
  id          String          @id @default(cuid())
  evidenceId  String
  evidence    AssessmentEvidence @relation(fields: [evidenceId], references: [id], onDelete: Cascade)
  criterionId String
  criterion   RubricCriterion  @relation(fields: [criterionId], references: [id])
  levelId     String
  level       RubricLevel      @relation(fields: [levelId], references: [id])
  comment     String?          @db.Text

  @@unique([evidenceId, criterionId])
}

model Feedback {
  id         String             @id @default(cuid())
  evidenceId String
  evidence   AssessmentEvidence @relation(fields: [evidenceId], references: [id], onDelete: Cascade)
  authorId   String
  audience   FeedbackAudience
  comment    String             @db.Text
  isPublished Boolean           @default(false)
  createdAt  DateTime           @default(now())
  updatedAt  DateTime           @updatedAt
}

enum FeedbackAudience {
  LEARNER
  PARENT
  TEACHER
  ADMIN
  INTERNAL
}
```

### 4.6 Portfolio and reporting

```prisma
model PortfolioItem {
  id          String             @id @default(cuid())
  evidenceId  String
  evidence    AssessmentEvidence @relation(fields: [evidenceId], references: [id], onDelete: Cascade)
  title       String
  description String?            @db.Text
  storageKey  String
  mimeType    String
  fileSize    Int?
  capturedAt  DateTime?
  reviewedAt  DateTime?
  reviewedById String?
  createdAt   DateTime           @default(now())

  @@index([evidenceId])
}

model ReportTemplate {
  id          String             @id @default(cuid())
  schoolId    String
  offeringId  String
  offering    CurriculumOffering @relation(fields: [offeringId], references: [id], onDelete: Cascade)
  name        String
  reportType  ReportType
  version     Int                @default(1)
  isActive    Boolean            @default(false)
  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt

  sections    ReportTemplateSection[]
  reports     ReportCard[]
}

enum ReportType {
  PROGRESS
  TERM
  SEMESTER
  TRANSCRIPT
  TRANSFER
  CBC_PORTFOLIO
  CAMBRIDGE_REPORT
}

model ReportTemplateSection {
  id          String         @id @default(cuid())
  templateId  String
  template    ReportTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  title       String
  sectionType String
  sequence    Int            @default(0)
  config      Json

  @@index([templateId, sequence])
}

model ReportCard {
  id            String                       @id @default(cuid())
  schoolId      String
  studentId     String
  student       Student                      @relation(fields: [studentId], references: [id], onDelete: Cascade)
  enrollmentId  String?
  enrollment    LearnerCurriculumEnrollment? @relation(fields: [enrollmentId], references: [id])
  templateId    String
  template      ReportTemplate               @relation(fields: [templateId], references: [id])
  periodId      String
  period        AcademicPeriod               @relation(fields: [periodId], references: [id])
  status        ReportStatus                 @default(DRAFT)
  publishedAt   DateTime?
  publishedById String?
  generatedFileKey String?
  createdAt     DateTime                    @default(now())
  updatedAt     DateTime                    @updatedAt

  entries       ReportCardEntry[]
  comments      ReportCardComment[]
  publications  ReportPublication[]

  @@unique([studentId, templateId, periodId])
  @@index([schoolId, periodId, status])
}

enum ReportStatus {
  DRAFT
  REVIEW
  PUBLISHED
  AMENDED
  ARCHIVED
}

model ReportCardEntry {
  id               String             @id @default(cuid())
  reportCardId     String
  reportCard       ReportCard        @relation(fields: [reportCardId], references: [id], onDelete: Cascade)
  curriculumNodeId String?
  learningOutcomeId String?
  assessmentPlanId String?
  label            String
  numericValue     Float?
  gradeCode        String?
  masteryLevel     String?
  narrative        String?           @db.Text
  sequence         Int               @default(0)

  @@index([reportCardId, sequence])
}

model ReportCardComment {
  id          String     @id @default(cuid())
  reportCardId String
  reportCard  ReportCard @relation(fields: [reportCardId], references: [id], onDelete: Cascade)
  authorId    String
  category    String
  comment     String     @db.Text
  sequence    Int        @default(0)
}

model ReportPublication {
  id          String     @id @default(cuid())
  reportCardId String
  reportCard  ReportCard @relation(fields: [reportCardId], references: [id], onDelete: Cascade)
  channel     PublicationChannel
  publishedAt DateTime   @default(now())
  acknowledgedAt DateTime?
  recipientUserId String?

  @@index([reportCardId, channel])
}

enum PublicationChannel {
  PORTAL
  EMAIL
  SMS
  DOWNLOAD
  PRINT
}
```

> The schema above is the target design, not a drop-in migration. Before implementation, validate Prisma relation names and composite primary-key nullability for `AssessmentNodeLink`, then split the migration into additive phases.

---

## 5. CBC seed data

Seed system-level records once. Do not seed school-specific adoption records globally.

### Curriculum

```text
code: CBC
name: Kenya Competency Based Curriculum
provider: KICD / KNEC
country: KE
```

### Core competencies

The initial seed should include the seven BECF core competencies:

1. Communication and collaboration
2. Critical thinking and problem solving
3. Creativity and imagination
4. Citizenship
5. Digital literacy
6. Self-efficacy
7. Learning to learn

Keep the list configurable because terminology and framework revisions may change.

### Values

Seed common CBC values as configurable system records, then allow school-level additions:

- Love
- Responsibility
- Respect
- Unity
- Peace
- Patriotism
- Honesty
- Integrity
- Empathy
- Care and compassion

### Default rating scale

Use a configurable mastery scale rather than storing only a label:

| Code | Label | Example meaning |
|---|---|---|
| EE | Exceeding expectation | Consistently demonstrates independently and extends learning |
| ME | Meeting expectation | Demonstrates the expected outcome |
| AE | Approaching expectation | Demonstrates partially or with support |
| BE | Below expectation | Requires significant support and intervention |

The school must be able to rename, reorder, or replace these bands.

### Example CBC hierarchy

```text
CBC 2026
  └── Grade 4
        └── Mathematics
              └── Numbers
                    └── Whole numbers
                          └── Reads and writes numbers up to ...
                                ├── Critical thinking and problem solving
                                └── Digital literacy
```

Do not assume every learning area uses exactly `strand → sub-strand`. The generic node tree allows other CBC areas and future curriculum revisions.

---

## 6. Mapping to the current system

### Existing model → target model

| Current model | Target relationship |
|---|---|
| `School` | Root tenant for all curriculum adoption records |
| `Class` | Connected through `ClassCurriculumAssignment` |
| `Subject` | Linked to curriculum nodes through `SubjectCurriculumLink` |
| `Student` | Connected through `LearnerCurriculumEnrollment` |
| `Assessment` | Compatibility wrapper around `AssessmentPlan` |
| `AssessmentResult` | Compatibility projection of `AssessmentEvidence` |
| `PerformanceAnalysis` | Read model fed by evidence and progress snapshots |
| Existing report generators | Read from `ReportCard` and `ReportCardEntry` |

### Compatibility strategy

For the first release:

1. Keep the current `Assessment` and `AssessmentResult` models.
2. Add nullable `assessmentPlanId` and `learningOutcomeId` fields only after the new tables exist.
3. Let old assessment screens continue to write legacy scores.
4. Add a projection job that creates `AssessmentEvidence` from legacy results.
5. Move the new teacher assessment workflow to `AssessmentPlan` and `AssessmentEvidence`.
6. Retire legacy writes only after all reports and APIs use the new read model.

This avoids a risky destructive migration and keeps existing production data available.

---

## 7. API architecture

Use route handlers consistent with the current Next.js application, with authorization in every handler.

### Curriculum administration

```text
GET    /api/curricula
POST   /api/curricula
GET    /api/curricula/:id/versions
POST   /api/curricula/:id/versions
POST   /api/curriculum-versions/:id/publish
GET    /api/curriculum-versions/:id/tree
POST   /api/curriculum-nodes
PATCH  /api/curriculum-nodes/:id
```

Only system administrators or explicitly authorized curriculum administrators should edit system curriculum definitions.

### School adoption

```text
GET    /api/schools/:schoolId/curriculum-offerings
POST   /api/schools/:schoolId/curriculum-offerings
PATCH  /api/curriculum-offerings/:id
POST   /api/classes/:classId/curriculum-assignment
GET    /api/classes/:classId/curriculum
POST   /api/students/:studentId/curriculum-enrollment
```

A school admin should be able to adopt a published CBC version and choose the grades and learning areas it offers.

### Assessment and evidence

```text
GET    /api/assessment-plans
POST   /api/assessment-plans
PATCH  /api/assessment-plans/:id
POST   /api/assessment-plans/:id/publish
POST   /api/assessment-plans/:id/evidence/bulk
PATCH  /api/evidence/:id
POST   /api/evidence/:id/feedback
POST   /api/evidence/:id/portfolio-item
```

### Reporting

```text
GET    /api/report-templates
POST   /api/report-templates
POST   /api/report-cards/generate
GET    /api/report-cards/:id
POST   /api/report-cards/:id/review
POST   /api/report-cards/:id/publish
GET    /api/report-cards/:id/pdf
```

### Authorization requirements

- Teachers may write evidence only for assigned classes and subjects.
- Teachers may view only learners in their assigned class or teaching group.
- Parents may view only published records for linked children.
- Learners may view only their own published records.
- School admins may manage only their school’s curriculum offerings and reports.
- Super admins may manage system curriculum definitions and cross-school configuration.
- Published and locked evidence must require explicit permission to amend.

---

## 8. Service and module boundaries

Create domain modules rather than putting curriculum logic directly into page components.

```text
lib/curriculum/
  authorization.ts
  tree.ts
  versioning.ts
  selectors.ts
  validation.ts
  grading.ts
  mastery.ts
  progress.ts
  report-mapping.ts

lib/assessment/
  evidence.ts
  moderation.ts
  aggregation.ts
  legacy-projection.ts

lib/reporting/
  template-renderer.ts
  cbc-renderer.ts
  transcript-renderer.ts
  publication.ts
```

### Read models

Do not calculate every dashboard from the full node tree on every request. Build read models or cached aggregations for:

- Learner outcome progress
- Class competency summary
- Curriculum coverage
- Term report values
- Missing evidence
- Intervention candidates

Start with database queries and indexed projections. Add a queue or scheduled worker when data volume requires it.

---

## 9. Reporting and aggregation rules

### CBC

CBC reports should prioritize:

- Learning outcome status
- Competency evidence
- Teacher narrative
- Values and attitudes
- Portfolio links
- Intervention recommendations
- Attendance context

Do not convert every qualitative rating to a percentage unless the school explicitly configures that behavior.

### Cambridge and other international curricula

Use the configured grade scale and assessment weights:

```text
AssessmentEvidence
  → AssessmentPlan weight
  → component weights
  → grade-scale band
  → report entry
```

Store the raw evidence, the calculated value, and the published result separately so a later grade-scale change does not silently alter historical reports.

### Snapshot principle

At report publication time, copy the final display values into `ReportCardEntry`. A report card must remain stable even if the curriculum, rubric, or grade scale changes later.

---

## 10. Versioning and publication state machine

### Curriculum version

```text
DRAFT → REVIEW → PUBLISHED → RETIRED
```

Rules:

- Only `DRAFT` and `REVIEW` can be edited.
- `PUBLISHED` cannot be edited in place.
- A new revision must reference the previous version.
- A school offering points to one explicit version.

### Assessment plan

```text
DRAFT → OPEN → SUBMITTED → MODERATION → PUBLISHED → LOCKED
```

Rules:

- Teachers can capture evidence while `OPEN`.
- Moderators can adjust or return evidence during `MODERATION`.
- Parents see only `PUBLISHED` evidence or report cards.
- `LOCKED` records require an amendment workflow and audit reason.

### Report card

```text
DRAFT → REVIEW → PUBLISHED → AMENDED
```

Amendments must create an audit entry and preserve the previously published version.

---

## 11. Constraints and invariants

Implement these validations in server-side service functions, not just in the UI:

1. A class assignment’s offering, grade, academic year, and school must match.
2. A learner enrollment must belong to the same school as the assignment.
3. A learning outcome must belong to the curriculum version adopted by the class.
4. An assessment plan cannot link outcomes from another curriculum version.
5. A teacher may capture evidence only for an assigned class or explicit teaching assignment.
6. A published curriculum version cannot be modified.
7. A locked assessment cannot be edited without an amendment permission.
8. A report card cannot be published if required evidence is missing unless an authorized override is recorded.
9. A report card must snapshot values before publication.
10. A school may have multiple offerings but only one default offering per academic year and grade.
11. Duplicate evidence for the same learner, assessment, outcome, and component must be rejected or versioned explicitly.
12. Files must be stored outside PostgreSQL; only encrypted storage keys and metadata belong in the database.

---

## 12. Indexing and performance

Required indexes:

- Every tenant root with `schoolId`
- `CurriculumNode(curriculumVersionId, parentId, sequence)`
- `LearningOutcome(curriculumNodeId, sequence)`
- `AssessmentEvidence(studentId, assessmentPlanId)`
- `AssessmentEvidence(studentId, learningOutcomeId)`
- `AssessmentEvidence(competencyId, studentId)`
- `ReportCard(schoolId, periodId, status)`
- `ClassCurriculumAssignment(schoolId, academicYearId)`

For large schools, consider:

- PostgreSQL full-text search on outcome titles and descriptions
- Materialized progress summaries per learner and term
- Batch evidence upserts inside transactions
- Cursor pagination for evidence and portfolio records
- Object storage for portfolio files
- Background PDF generation

---

## 13. Migration plan

### Phase 1: Additive foundation

1. Add `AcademicYear` and `AcademicPeriod`.
2. Add `Curriculum`, `CurriculumVersion`, and `CurriculumNode`.
3. Add `LearningOutcome`, `Competency`, and `Value`.
4. Add `CurriculumOffering`, `OfferingGrade`, and `ClassCurriculumAssignment`.
5. Seed CBC competency, value, and rating-scale records.
6. Add admin APIs to browse the curriculum tree.

### Phase 2: Enrollment and mapping

1. Add `SubjectCurriculumLink`.
2. Add `LearnerCurriculumEnrollment`.
3. Add school offering setup UI.
4. Map existing classes and subjects to CBC grades and learning areas.
5. Add tenant and role tests.

### Phase 3: Evidence and assessment

1. Add `AssessmentPlan` and `AssessmentNodeLink`.
2. Add `AssessmentEvidence`.
3. Add rubrics and rubric scoring.
4. Add portfolio items.
5. Add teacher evidence-entry workflow.
6. Project old `AssessmentResult` rows into evidence where possible.

### Phase 4: Reporting

1. Add report templates.
2. Add report-card snapshots.
3. Build CBC progress report PDF.
4. Add parent publication and acknowledgement.
5. Preserve existing report endpoints through adapters.

### Phase 5: International curriculum

1. Add Cambridge curriculum seed packages.
2. Add subject/syllabus codes and grade scales.
3. Add weighted assessments, coursework, practicals, and exams.
4. Add transcript and predicted-grade reports.
5. Support hybrid curriculum enrollment by learner or class.

---

## 14. Test strategy

### Unit tests

Test:

- Tree traversal and ordering
- Grade-band calculation
- Rubric scoring
- Weighted assessment aggregation
- CBC mastery calculation
- Report snapshot generation
- Version publication rules

### Integration tests

Test:

- School tenant isolation
- Class-to-offering consistency
- Teacher assignment authorization
- Parent visibility restrictions
- Locked-record amendment flow
- Draft-to-published state transitions

### End-to-end tests

At minimum:

1. School admin adopts CBC for a grade.
2. Admin assigns a class to Grade 4 CBC.
3. Teacher opens a learning outcome assessment.
4. Teacher records rubric evidence and narrative feedback.
5. Teacher attaches a portfolio item.
6. Admin reviews and publishes the report.
7. Parent sees only the published report for the linked child.
8. A curriculum revision does not change the historical report.

---

## 15. Immediate implementation recommendation

Do not implement the entire schema in one migration. Start with these seven models:

1. `AcademicYear`
2. `AcademicPeriod`
3. `Curriculum`
4. `CurriculumVersion`
5. `CurriculumNode`
6. `LearningOutcome`
7. `Competency`

Then add:

8. `CurriculumOffering`
9. `OfferingGrade`
10. `ClassCurriculumAssignment`
11. `LearnerCurriculumEnrollment`

This gives the application a usable CBC curriculum tree and school adoption model before introducing the more complex evidence and reporting workflows.

The first visible product milestone should be:

> A school administrator can choose the CBC version, assign Grade 4 to a class, browse learning areas → strands → sub-strands → outcomes, and see which outcomes are covered by each teacher assessment.

That milestone creates the foundation for every subsequent CBC feature while keeping the current StudentOS product operational.

---

## References

- [KNEC Competency Based Assessment Framework](https://www.knec.ac.ke/wp-content/uploads/2021/06/CBA-Age-Based-Regular-Framework.pdf) — formative and summative assessment, competencies, portfolio evidence, qualitative reporting, self/peer assessment, and assessment adaptations.
- [KICD — Curriculum and Research](https://kicd.ac.ke/) — Kenya curriculum development and curriculum support context.
- [Cambridge International — International curriculum](https://www.cambridgeinternational.org/why-choose-us/benefits-of-a-cambridge-education/international-curriculum/) — flexible international curriculum pathways, local adaptation, multiple stages, and combination with national curricula.
