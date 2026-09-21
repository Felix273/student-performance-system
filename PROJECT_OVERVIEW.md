# Student Performance System - Comprehensive Architecture & Audit Report

## 1. Executive Summary
The **Student Performance System** is a full-stack multi-tenant web application built on Next.js 16 (App Router), React 19, Prisma ORM, NextAuth v5, and Tailwind CSS v4. It provides educational institutions with tools to manage students, classes, assessments, attendance, fee structures, parent-teacher tracking, automated PDF/Excel report generation, and AI-driven student performance analysis via the Anthropic Claude API.

---

## 2. Tech Stack & Infrastructure

- **Framework:** Next.js 16.0.1 (App Router)
- **UI Library:** React 19.0.0, Tailwind CSS v4, Lucide React icons
- **Data Visualization:** Recharts
- **Database & ORM:** PostgreSQL, Prisma ORM v6.19.0
- **Authentication:** NextAuth.js v5 (Beta) with Prisma Adapter & Credentials Provider
- **AI Integration:** Anthropic SDK (`@anthropic-ai/sdk`) for performance analysis & recommendations
- **Exports & Reports:** `jspdf`, `jspdf-autotable`, `exceljs`, `papaparse`, `xlsx`
- **Email Service:** Nodemailer / Resend
- **PWA & Offline Support:** `@ducanh2912/next-pwa`, IndexedDB offline storage (`lib/offline/storage.ts`)

---

## 3. Database Schema Overview (`prisma/schema.prisma`)

### Core Models & Relationships:
1. **`School`**: Root entity for multi-tenancy. Keyed by `domain` and `id`.
2. **`User`**: System accounts assigned to a `UserRole`:
   - `SUPER_ADMIN`: System-wide control across all schools.
   - `SCHOOL_ADMIN`: School-specific administration.
   - `TEACHER`: Manages assigned classes and records grades/attendance.
   - `PARENT`: Associated with children via `ParentStudent`.
   - `STUDENT`: Student account linked to a specific class and school.
3. **`Student`**: Enrolled in a `Class` within a `School`, linked to `ParentStudent`, `AssessmentResult`, `Attendance`, and `FeePayment`.
4. **`Class` & `Subject`**: Define academic structures per school.
5. **`TeacherClass`**: Junction table mapping teachers to classes and specific subjects.
6. **`Assessment` & `AssessmentResult`**: Stores test scores (Quiz, Assignment, Mid Term, Final Exam, Project).
7. **`PerformanceAnalysis`**: Stores AI-generated insights, overall grades, strengths, weaknesses, recommendations, and performance trends.
8. **`Attendance`**: Records daily student presence status (`PRESENT`, `ABSENT`, `LATE`, `EXCUSED`).
9. **`FeeStructure` & `FeePayment`**: Manages tuition, lab, library, exam fees, due dates, payments, and receipt tracking.

---

## 4. Key Application Modules & Architecture

### A. Authentication & Authorization (`lib/auth-config.ts`, `lib/auth.ts`)
- Role-based Access Control (RBAC) enforces route and API-level permissions.
- NextAuth sessions include custom user claims: `role`, `schoolId`, and `schoolName`.

### B. Dashboards (`app/dashboard/*`)
- **Main Dashboard (`/dashboard/page.tsx`):** Displays high-level stats filtered by role and school.
- **Role-Specific Dashboards:**
  - Teacher view (`/dashboard/teacher/page.tsx`)
  - Parent view (`/dashboard/parent/page.tsx`)
  - Admin view for Users, Schools, Students, Classes, Fees, and Reports.

### C. AI Performance Analysis (`app/api/analysis/*`)
- Consolidates a student's historical assessment results.
- Prompts Anthropic Claude model to generate detailed feedback, identifying strengths, weaknesses, personalized study recommendations, and overall grade trends.

### D. Bulk Data Ingestion (`app/dashboard/bulk-upload`)
- Supports parsing CSV/Excel files using `papaparse` / `xlsx` / `exceljs`.
- Enables batch uploading for students, results, attendance, and fee payments.

### E. PDF & Excel Report Generation (`lib/reports/*`, `app/api/reports/*`)
- Custom PDF generator utilizing `jspdf` and `jspdf-autotable` for student report cards.
- Excel generator using `exceljs` for exporting class rosters, attendance logs, and fee payment histories.

### F. PWA & Offline Caching (`lib/offline/storage.ts`, `components/InstallPWA.tsx`)
- Service worker configured via `@ducanh2912/next-pwa`.
- IndexedDB wrapper (`lib/offline/storage.ts`) for caching student and assessment data locally during offline sessions.

---

## 5. Identified Technical Debt & System State

1. **TypeScript Module Augmentation for NextAuth:**
   - Missing `types/next-auth.d.ts` declaration file to extend `session.user` and `JWT` interfaces with `role`, `schoolId`, and `schoolName`.
2. **Next.js Config Compatibility (`next.config.ts`):**
   - In Next.js 16, the `eslint` key inside `NextConfig` is deprecated/removed in favor of CLI execution (`eslint.config.mjs`).
3. **Chart Type Definitions:**
   - `components/analytics/GradeDistributionChart.tsx` has strict type issues on Recharts `PieLabelRenderProps` and chart data arrays.
4. **Environment Configuration:**
   - `.env` and `.env.example` templates created for seamless developer setup.

---

## 6. Next Steps & Recommendations

1. Add `types/next-auth.d.ts` module declaration to fix session typing across all app routes.
2. Update `next.config.ts` to remove deprecated keys.
3. Set up unit/integration test suite (e.g., Jest or Vitest + Playwright for E2E).
4. Run Prisma database migrations upon setting up a live database connection string.
