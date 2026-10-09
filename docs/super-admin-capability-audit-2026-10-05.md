# Super Administrator Capability Audit

**Date:** 2026-10-05  
**Project:** Student Performance System  
**Scope:** App routes, dashboard navigation, server-side page guards, and API authorization/data scope

## Executive summary

The `SUPER_ADMIN` role currently has the broadest access in the system and can operate across schools. It can create schools, provision school administrators, view cross-school records, manage curriculum configuration, assign teachers, manage timetables, access reporting, and moderate evidence.

However, it is currently closer to a **global school operator with broad data access** than a complete platform administration console. The most important gaps are:

1. Several cross-school pages do not visibly show or filter by school.
2. The curriculum UI does not provide the `schoolId` required by the API when a Super Administrator creates an offering.
3. Existing schools cannot be edited, archived, suspended, or opened into a school-specific workspace.
4. The Users page omits school administrators and Super Administrator accounts.
5. There is no dedicated platform health, audit-log, support, or cross-school analytics view.

## What the Super Administrator can currently access

The dashboard navigation exposes these entries to `SUPER_ADMIN`:

| Area | Current capability | Scope |
|---|---|---|
| Overview | View aggregate student, class, assessment, and analysis counts | All schools |
| Schools | View all schools and counts of users, students, and classes; add a school and its initial school administrator | All schools |
| Users | View teachers and parents; create teacher and parent accounts | All schools, but school context is weak in the UI |
| Teacher assignments | Assign or remove teachers from classes and optional subjects | Cross-school |
| Students | View all learners, classes, assessment-count indicators, schools, and profiles | All schools |
| Bulk upload | Upload students into a selected school | All schools, with school selection |
| Assessments | View assessments, results count, class, subject, and school; create assessments | All schools |
| Moderation queue | Review evidence and moderate teacher submissions | Cross-school, subject to page/API behavior |
| Curriculum | Browse curriculum versions and configure offerings/class assignments | Global catalog plus school offerings |
| Attendance | View/select classes and attendance workflows | All schools |
| Timetable | View and manage timetable data | All schools |
| Reports | Select a school and generate class/student/assessment exports | School-selectable |
| Fees | View and manage fee structures, payments, and fee reports | All schools |
| Insights | View student analysis workspaces | All schools |
| Notification settings | Configure parent-learning notification preferences | Platform/school setting behavior should be clarified |

## Current data visibility

### Overview

`/dashboard` does not apply a school filter for `SUPER_ADMIN`. The headline statistics therefore aggregate across the entire database:

- Total students
- Total classes
- Total assessments
- Total performance analyses

This is appropriate for a platform operator, but the page currently uses school-oriented copy such as **“Your school workspace”**. That wording is misleading for a global administrator.

### Schools

`/dashboard/schools` is restricted to `SUPER_ADMIN` and returns all schools with:

- School name
- Domain
- User count
- Student count
- Class count
- Creation date

The Super Administrator can add a new school and the first school administrator through `/dashboard/schools/new`.

**Missing:** school detail, edit, suspend/archive, lifecycle status, school-admin management, current academic year, curriculum offering status, and operational health indicators.

### Users

`/dashboard/users` returns all `TEACHER` and `PARENT` users for Super Administrators. It does not return:

- School administrators
- Super Administrator accounts
- Student accounts, if students are represented as users in future

The page also does not display the associated school for each teacher or parent. This makes cross-school results ambiguous when different schools have similarly named people or classes.

The API supports a `schoolId` query parameter for Super Administrators, but the page does not expose a school filter.

### Students

The Super Administrator can see all students and the UI includes the school column. Student profiles and competency-progress routes use the central access helpers, allowing Super Administrators to inspect any student.

### Assessments and evidence

The Super Administrator can view all assessments and sees the school column. Assessment-result routes allow Super Administrator access after the record is found. Moderation and evidence review endpoints also explicitly allow the role.

This is consistent with a platform-level moderation role, but the product should eventually distinguish:

- Platform support access
- Routine cross-school reporting
- Formal moderation authority
- Sensitive learner-record access

### Curriculum

The Super Administrator can browse all curriculum frameworks and versions, including CBC and international curriculum catalog data. It can also inspect curriculum trees.

School offerings and classes are loaded globally for the role, and the API intentionally supports cross-school configuration.

There is a functional gap:

- The curriculum page's offering form does not include a school selector.
- The `POST /api/curriculum` endpoint requires `schoolId` for a Super Administrator.
- Therefore, a Super Administrator can open the curriculum page but cannot successfully create a new school offering from the current UI unless the request is manually augmented.

The same page also loads classes and offerings from every school without displaying school names in the assignment selectors, which creates a high risk of configuring the wrong school when names overlap.

### Teacher assignments

The Super Administrator can:

- List all teachers, classes, subjects, and assignments
- Assign a teacher to a class
- Optionally scope the assignment to a subject
- Remove an assignment

The API correctly checks that teacher, class, subject, and school relationships are consistent. The UI, however, does not show school labels in the selectors or assignment list. Cross-school operations are therefore difficult to perform safely.

### Timetable

The Super Administrator can view all timetable entries and create/delete entries across schools. The API validates that teacher, class, subject, and academic year belong to the same school and requires a valid teacher-class assignment.

The UI should provide an explicit school context because the Super Administrator currently sees a global timetable rather than an operationally grouped school view.

### Reports

The reports page provides a school selector for Super Administrators and can generate:

- Student PDFs
- Class PDFs
- Assessment Excel exports

The assessment Excel API requires a `schoolId` and validates it through `schoolScope`, so the export route is school-selectable rather than silently global.

### Fees

The Super Administrator can view fee structures, payment records, fee reports, and create/edit fee structures across schools. The fee pages display school names where relevant.

The main improvement needed is clearer global filtering and a school-level summary, rather than treating all fee records as one combined workspace.

## Access-boundary assessment

### Strengths

- `requireRole` centrally validates the session role.
- Non-Super-Administrators must have a `schoolId`.
- `schoolScope` allows a Super Administrator to intentionally select a school or operate globally where the endpoint supports it.
- `canAccessClass` and `canAccessStudent` explicitly grant Super Administrator access while enforcing school and assignment checks for other roles.
- Teacher assignment APIs validate that connected records belong to the same school.
- Timetable creation validates class, teacher, subject, and academic-year school consistency.

### Areas to tighten

1. **Make global scope explicit.** A Super Administrator should see a visible `All schools` state and a school switcher wherever data is cross-school.
2. **Avoid hidden global mutations.** Any create/update action should require an explicit school selection rather than inferring a school from an arbitrary class or first option.
3. **Add audit trails.** Cross-school access, learner profile viewing, evidence moderation, user creation, timetable changes, and fee changes should be recorded with actor, school, target, timestamp, and action.
4. **Separate platform support from school operations.** A Super Administrator should have a deliberate support mode or scoped impersonation mechanism rather than relying on unrestricted global visibility.
5. **Review notification settings scope.** Confirm whether the settings are platform-wide or school-specific and enforce that decision in both UI and API.

## Recommended implementation priority

### Priority 0 — Fix the functional curriculum gap

- Add a required school selector to the curriculum workspace for Super Administrators.
- Include school names in offering, class, and assignment selectors.
- Send `schoolId` in the curriculum offering creation request.
- Validate that the selected academic year belongs to the selected school before creating the offering.

### Priority 1 — Make global scope understandable

- Add a reusable `SchoolScopeSwitcher` component.
- Support `All schools` and a selected school state.
- Persist the selected school in the URL or page state.
- Add school columns to users, teacher assignments, timetable, and curriculum configuration views.
- Update copy from “Your school workspace” to “Platform workspace” for Super Administrators.

### Priority 2 — Complete school lifecycle management

Add Super Administrator capabilities for:

- School detail view
- Edit school name/domain/contact details
- Suspend/archive school
- Restore school
- View school administrator(s)
- Reset or deactivate school administrator access
- View onboarding completeness and operational health
- View current curriculum and academic year

### Priority 3 — Complete people and support operations

- Add school administrators to the global Users page.
- Add filters by role, school, status, and search term.
- Add user detail, deactivate/reactivate, password reset workflow, and access history.
- Add controlled support access or scoped impersonation with explicit audit logging.

### Priority 4 — Add a true platform dashboard

Replace the current aggregate overview for Super Administrators with:

- Schools active/inactive
- Learners by school
- Teachers without assignments
- Classes without curriculum offerings
- Timetable coverage and conflicts
- Evidence awaiting moderation
- Parent notification delivery health
- Recent platform activity
- Schools requiring attention

## Conclusion

The Super Administrator currently has broad and mostly coherent backend access across the system. The role can inspect and operate on almost every major domain, which is suitable for a platform owner during early development.

Before production use across multiple Kenyan schools, the role should be strengthened with **explicit school context, curriculum school selection, school lifecycle controls, complete administrator visibility, and auditability**. These changes will reduce operator mistakes and make the distinction between platform-wide administration and school-level operations clear.
