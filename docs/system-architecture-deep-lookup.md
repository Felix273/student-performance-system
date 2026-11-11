# Student Performance System - System Architecture & Codebase Deep Dive

**Date:** March 2026 / October 2026 Blueprint Baseline
**Scope:** Architecture, Data Layer, Multi-Tenancy, Authentication, API Surfaces, Frontend, Quality Status, and Roadmap

---

## 1. System Overview & Core Directives

The **Student Performance System** (StudentOS) is an enterprise multi-tenant school operating and learner-evidence platform designed primarily for Kenyan educational workflows (Competency-Based Curriculum - CBC) alongside international curriculum models (Cambridge).

The system seamlessly orchestrates:
$$\text{School Setup} \longrightarrow \text{Timetable} \longrightarrow \text{Lesson} \longrightarrow \text{Curriculum Outcome} \longrightarrow \text{Assessment Evidence} \longrightarrow \text{Moderation} \longrightarrow \text{Mastery / Report Card} \longrightarrow \text{Family Communication}$$

### Core Tenets
1. **Multi-Tenant Isolation:** Every school record is keyed by `schoolId` with explicit scope enforcement across queries and mutations (`schoolScope` and role verification). Platform operators (`SUPER_ADMIN`) are explicitly barred from direct school-level data queries (`schoolScope` returns 403) to ensure strict tenant privacy.
2. **CBC Competency-First Model:** Assessment outcomes, strands, sub-strands, competencies, and values drive learner progression. Raw marks are normalized against assessment maximums and mapped to performance bands (`EE`, `ME`, `AE`, `BE`) with scope-specific overrides (Class > Grade > School).
3. **Evidence Moderation Workflow:** Teacher observations and assessments proceed through an explicit lifecycle (`DRAFT` $\rightarrow$ `SUBMITTED` $\rightarrow$ `VERIFIED` $\rightarrow$ `PUBLISHED` / `RETURNED`). Draft and unmoderated evidence is strictly private to school staff and never exposed to parents or students.
4. **Resilient Offline Workflows:** Teacher attendance and scoring workflows support offline IndexedDB caching with deterministic synchronization on reconnection.
5. **Multi-Channel Authentication:** Dual authentication architectures: NextAuth v5 session cookies for web dashboards, and HMAC-SHA256 signed JWT bearer tokens for mobile endpoints (`/api/mobile/v1/*`).

---

## 2. Technology Stack & Infrastructure

- **Framework:** Next.js 15.5.27 (App Router), React 19.2.0, TypeScript 5
- **Database & ORM:** PostgreSQL, Prisma ORM 6.19.3
- **Styling & UI:** Tailwind CSS v4, Lucide React icons, Miro-inspired workspace tokens
- **Data Visualization:** Recharts 3.4.1 (grade distribution, subject analytics, competency bands)
- **Authentication:** NextAuth v5 (Beta 30) with Credentials Provider & Prisma Adapter, custom mobile HMAC JWT tokens, TOTP MFA RFC 6238, AES-256-GCM encryption for secrets
- **Document & Data Processing:** jsPDF 4.2.1, jsPDF-AutoTable 5.0.2, ExcelJS 4.4.0, PapaParse 5.5.3, QRCode 1.5.4
- **Email Delivery:** Resend, Nodemailer with TLS verification and maintenance notice templates
- **AI Analytics:** Anthropic Claude API (`@anthropic-ai/sdk`) for diagnostic learner evaluation
- **Testing:** Node.js native test runner (`node --test`), Playwright E2E suite

---

## 3. Data Architecture (`prisma/schema.prisma`)

### 3.1 Tenancy & Identity
- **`School`**: Root tenant model holding domain, subscription tier, operational status, grading scales, and settings.
- **`User`**: Accounts assigned to `UserRole` (`SUPER_ADMIN`, `SCHOOL_ADMIN`, `TEACHER`, `PARENT`, `STUDENT`). Supports MFA (`twoFactorSecret`, `twoFactorEnabled`), temporary password policies (`mustChangePassword`), and session invalidation via `sessionVersion`.
- **`Student`**: Enrolled learners linked to `Class`, `ParentStudent` associations, and admission metadata.

### 3.2 Academic Structure & Timetable
- **`AcademicYear` & `AcademicPeriod`**: Academic calendars, terms, and session boundaries.
- **`Class` & `Subject`**: Class definitions, grade levels, and academic subject definitions.
- **`TeacherClass`**: Junction table mapping teachers to classes and subjects.
- **`TimetableEntry`**: Schedule slots linking day of week, time period, teacher, class, and room.

### 3.3 Curriculum Engine & Assessment
- **Curriculum Tree:** `Curriculum` $\rightarrow$ `CurriculumVersion` $\rightarrow$ `CurriculumOffering` $\rightarrow$ `OfferingGrade` $\rightarrow$ `CurriculumNode` $\rightarrow$ `LearningOutcome`, `Competency`, `Value`.
- **Assessment Lifecycle:** `AssessmentPlan` $\rightarrow$ `AssessmentComponent` $\rightarrow$ `AssessmentEvidence` $\rightarrow$ `RubricCriterionScore`.
- **Band Maps:** `CbcBandMap` defining score ranges to performance bands (Exceeding, Meeting, Approaching, Below Expectations) with specificity cascading (Class-level $\rightarrow$ Grade-level $\rightarrow$ School-wide).

### 3.4 Operations & Finance
- **`Attendance`**: Session-level presence (`PRESENT`, `ABSENT`, `LATE`, `EXCUSED`).
- **`FeeStructure` & `FeePayment`**: Tuition, itemized dues, payments, receipts, and M-Pesa integration groundwork.
- **`SMSDelivery` & `Notification`**: Broadcast SMS logs with recipient resolution across parents and staff.
- **`AuditLog`**: Centralized auditing for platform mutations, moderation transitions, and authentication events.

---

## 4. Key Application Modules & Workflows

### 4.1 Teacher Lesson Workspace (`/dashboard/teacher/lesson/[timetableEntryId]`)
- Unified cockpit for daily classroom activity.
- Combines curriculum focus (strands, outcomes, competencies), attendance roll call, and learner evidence capture.
- Provides drawer-based scoring and observation logging with auto-save drafts.

### 4.2 Evidence Moderation Queue (`/dashboard/assessments/moderation`)
- Dedicated portal for Headteachers and Curriculum Coordinators.
- Enforces multi-stage verification before evidence publication.
- Supports return reasons and correction loops back to the assigned teacher.

### 4.3 Mobile API (`/api/mobile/v1/*`)
- Lightweight JSON API authenticated via Bearer tokens (`verifyMobileAuth`).
- Current routes:
  - `POST /api/mobile/v1/auth/login`: Mobile credential login and 30-day token issuance.
  - `GET /api/mobile/v1/teacher/dashboard`: Overview statistics and upcoming sessions.
  - `GET /api/mobile/v1/teacher/schedule`: Schedule and lesson lookups for the authenticated teacher.
  - `GET /api/mobile/v1/teacher/lesson/[id]`: Detailed lesson context and roster.
  - `GET /api/mobile/v1/teacher/attendance`: Class roster and session attendance state.
  - `POST /api/mobile/v1/teacher/attendance`: Submits roll call attendance.
  - `GET /api/mobile/v1/parent/overview`: Parent portal child overview and published updates.

### 4.4 Reporting & Analytics
- Automated CBC report card generation using `jspdf` and `jspdf-autotable`.
- CSV and Excel bulk exports and imports for class rosters and marks.
- Diagnostic evaluation and AI-powered performance analysis via Anthropic SDK.

---

## 5. System Health, Quality Checks & Test Coverage

### 5.1 Verification Status
- **TypeScript Compilation (`npx tsc --noEmit`):** Passes cleanly with zero type errors.
- **Next.js Production Build (`npm run build`):** Builds completely across all static and dynamic routes.
- **Unit & Security Tests (`npm test`):**
  - `tests/cbc-band-resolver.test.mjs`: Tests CBC normalization, inclusive cutoffs, and scope specificity.
  - `tests/moderation-workflow.test.mjs`: Tests evidence state machine and administrator access control.
  - `tests/platform-security.test.mjs`: Tests RFC 6238 TOTP, AES encryption, password policies, and email formatting.
  - Total: 20 passing unit/security tests (2 integration tests skipped pending dedicated PostgreSQL instance).
- **ESLint (`npm run lint`):** Passes without fatal errors (5 warnings on legacy `any` types and react hook dependencies, maintained as warnings for progressive migration).

### 5.2 Identified Technical Debt & Action Items
1. **Gradual Type Refinement:** Continue replacing legacy `any` parameters in bulk upload and PDF formatting modules.
2. **Dedicated Test Database:** Configure CI test container with PostgreSQL to enable full execution of `tests/security-authorization.integration.test.mjs`.
3. **Mobile API Route Expansion:** Expand `/api/mobile/v1` to cover learner evidence capture and offline sync queues.
