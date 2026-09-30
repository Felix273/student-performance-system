# Super Administrator access policy

## Purpose

The Super Administrator role is for **platform oversight**, not school operations. It must not expose an individual school's records or identifying details. Restrictions apply to direct page requests and API calls, not only to navigation visibility.

## Allowed

| Area | Super Administrator may see or do |
| --- | --- |
| Platform overview | Aggregate totals only: number of school workspaces, learners, school staff accounts, and published global curriculum versions. No per-school breakdown or drill-down. |
| Global curriculum catalogue | View global frameworks, version metadata, learning-map nodes, outcomes, and competencies that are not tied to a particular school. The platform-level curriculum-tree API may add shared curriculum nodes; that capability does not include school offerings or assignments. |
| Own account | Sign in, see their own account name/role, and sign out. |

The portal presents the curriculum catalogue as read-only. Global curriculum content changes are limited to the platform-level authoring API and remain separate from school operations.

## Restricted

Super Administrators must not see or manage school-identifiable or school-level records, including:

- School names, domains, contact details, addresses, or tenant identifiers; per-school counts, profiles, or activity.
- School administrators, teachers, parents, students, classes, rosters, or personally identifying information.
- Attendance, assessment records/results, CBC evidence, moderation queues, report cards, comments, and individual or school-specific analytics.
- Fee structures, payments, balances, timetables, school notification preferences, or other operational settings.
- School onboarding, account creation, bulk upload, class assignment, curriculum adoption, or any other tenant-specific mutation.

## Enforcement

- Super Administrator navigation exposes only Platform Overview and the global Curriculum Catalogue.
- School directory/onboarding routes redirect away; tenant dashboard routes require the applicable tenant role and school context.
- School-scoped API requests reject Super Administrators with `403`, including requests that supply a school ID or guess a class/student ID.
- The school API returns only the signed-in School Administrator's own school; school provisioning is disabled from this portal.
- Global curriculum responses exclude school offerings, academic years, assignments, and tenant identifiers.
- School administrators retain access only to their own school; teachers, parents, and learners retain relationship-scoped access.

## Rationale and assumption

Aggregate platform totals support capacity and service oversight without revealing which school contributed the data. School operations belong to each school's administrator. This implementation treats school onboarding as a tenant operation and therefore does not expose it to Super Administrators. If onboarding later needs to remain available, it should be provided as a separate, audited workflow that does not grant access to existing school records.
