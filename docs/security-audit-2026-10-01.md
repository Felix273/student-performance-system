# Student Performance System Security Audit

**Date:** 1 October 2026  
**Repository:** `Felix273/student-performance-system`  
**Audited commit:** `e764e56` (`security: enforce teacher tenant boundaries and safe uploads`)

## Scope

- All `app/api/**/route.ts` endpoints (40 route files across the assessment, curriculum, evidence, fees, reports, parent, teacher, timetable, users, and bulk-upload areas).
- Dashboard server pages and shared authorization helpers.
- Tenant isolation for school, class, student, teacher, and parent relationships.
- Production dependency and secret hygiene.
- Hosted smoke checks using the authenticated Teacher session.

## Findings addressed

### 1. Teacher list and export overexposure — fixed

Teacher-readable list APIs could return all records in the teacher's school rather than only assigned classes. This affected class lists, student lists, assessment lists, and the two Excel report exports.

Changes:

- `/api/classes` now filters Teacher results through `teacherClass` assignments.
- `/api/students` now filters learners through assigned classes.
- `/api/assessments` now filters assessments through assigned classes.
- Teacher Excel exports require a selected class and validate that the Teacher is assigned to it.

### 2. Defense-in-depth tenant checks — fixed

`canAccessClass`, `canAccessStudent`, and `requireRole` now enforce school context for non-super-admin accounts. Teacher and parent access is rejected when the target record's school does not match the authenticated user's school, even if an inconsistent relationship exists in the database.

### 3. Spreadsheet parser risk — fixed

The direct `xlsx`/SheetJS dependency was removed because the installed version was flagged for prototype pollution and regular-expression denial-of-service advisories. Both bulk-upload components now use `read-excel-file` for `.xlsx` files and continue to support CSV. Legacy `.xls` upload is no longer advertised or accepted; users should save files as `.xlsx` or CSV.

### 4. PDF generator dependency — mitigated

`jspdf` was upgraded from `3.0.4` to `4.2.1`, removing the reported critical jsPDF advisory from the production dependency audit.

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | Passed |
| `npm run build` | Passed; 66 static pages generated |
| `npm run test:workflow` | Passed; 2/2 tests |
| `git diff --check` | Passed |
| Secret scan of tracked source | No committed credentials or private keys found; only placeholders in `.env.example` and deployment docs |
| `npm audit --omit=dev` after fixes | 0 critical, 9 high, 7 moderate, 1 low; remaining issues are primarily transitive/auth/toolchain dependencies |
| Git push | Passed; `origin/main` at `e764e56` |

## Hosted smoke results

The connected hosted browser session was confirmed as:

- Role: `TEACHER`
- Account: `teacher.smoke.2026@demo-school.com`
- School: `Demo School`

The deployed student and class APIs returned the two records assigned to this Teacher. The unauthenticated route probes correctly redirected protected dashboard pages to login.

The no-class assessment-export check still downloaded a file in the hosted browser, despite the source and pushed commit containing the new rejection. This means the Vercel deployment serving that request has not yet been conclusively verified as `e764e56` (or the deployment is still serving an older build). Treat the hosted export boundary as **pending deployment verification**; do not consider the hosted security rollout complete until the endpoint returns the expected `400` response for a Teacher without `classId`.

## Remaining risks and recommended next actions

1. **Complete Vercel deployment verification.** Confirm the Vercel deployment commit is `e764e56`, then retry:
   `/api/reports/assessment-excel?schoolId=<schoolId>` as Teacher. Expected response: HTTP `400` with `Teachers must select an assigned class`.
2. **Resolve remaining npm advisories in a compatibility branch.** The remaining high findings include `next-auth`/`@auth/core`/`nodemailer`, Prisma configuration tooling, and transitive packages. Upgrade only after testing the NextAuth v5 beta and Prisma versions against Neon and Vercel.
3. **Reduce lint debt.** The build passes, but it reports existing `any` usage, unused variables, and React hook dependency warnings. These are not current authorization failures, but they increase maintenance and regression risk.
4. **Add automated authorization integration tests.** The current test suite covers moderation transitions only. Add database-backed tests for: cross-school class access, Teacher access to unassigned classes, school-wide Teacher exports without `classId`, Parent access to an unlinked learner, and School Administrator cross-school mutation attempts.
5. **Review parent report visibility.** The parent PDF/report paths should be explicitly confirmed to expose only the intended published/approved result set, rather than all legacy assessment results.

## Overall assessment

The application-level tenant boundary is materially stronger after `e764e56`, and the build/test gates are green. The most important source-level Teacher overexposure and unsafe spreadsheet-parser dependency were addressed. Production security status should remain **partially verified** until the Vercel deployment is confirmed to contain the pushed commit and the hosted Teacher export rejection is observed.
