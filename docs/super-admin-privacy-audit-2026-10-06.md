# Super Administrator Privacy Audit

**Date:** 2026-10-06  
**Scope:** Dashboard routes, navigation, API routes, shared authorization helpers, moderation helpers, and direct-record access paths.

## Policy verified

The Super Administrator is a platform operator. The role may provision schools and view aggregate platform health, but must not access school-level people, learner, curriculum, assessment, evidence, attendance, timetable, reporting, finance, analytics, or notification data.

## Findings and fixes

### 1. Shared record authorization

`canAccessClass()` and `canAccessStudent()` previously returned an authorized result for `SUPER_ADMIN`. This was a defense-in-depth risk because any current or future endpoint using those helpers could expose a school record.

**Fixed:** Super Administrators now receive a forbidden response from both helpers. School Administrators, assigned Teachers, and linked Parents retain their intended scoped access.

### 2. Teacher evidence-entry page

The teacher evidence-entry route explicitly listed `SUPER_ADMIN` in its page guard.

**Fixed:** The route now allows only `TEACHER` and `SCHOOL_ADMIN`.

### 3. Evidence moderation

The moderation helper and endpoint contained stale Super Administrator branches even though the endpoint already required `SCHOOL_ADMIN`.

**Fixed:** Moderation is School Administrator-only and always scopes to the authenticated administrator's school.

### 4. Timetable and teacher-assignment safeguards

Delete and mutation code contained unreachable Super Administrator bypass conditions.

**Fixed:** Cross-school checks are now unconditional for the school-admin-only operations.

## Allowed Super Administrator surfaces

- `/dashboard/platform`
- `/dashboard/schools`
- `/dashboard/schools/new`
- `GET /api/schools`
- `POST /api/schools`

The platform dashboard exposes aggregate onboarding signals only. It does not query or render individual users, students, assessments, evidence, fee records, attendance, or report payloads.

## Verification

- Production build: **passed**
- Static privacy assertions: **passed**
- `git diff --check`: **passed**
- API grant inventory: only `app/api/schools/route.ts` explicitly grants `SUPER_ADMIN`
- Sensitive page guard checks: **passed**

Existing non-blocking ESLint warnings remain in unrelated legacy files; no new build errors were introduced.
