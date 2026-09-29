# Assessment moderation and publication release

## What changed

- Added additive moderation states (`RETURNED`, `REJECTED`) and immutable evidence audit events.
- Added reviewer decisions, publication timestamps, publisher IDs, publication versions, and JSON publication snapshots.
- Added tenant-scoped school notification defaults and parent communication overrides.
- Added idempotent in-app notifications for first publication and corrected published results.
- Added administrator moderation queue, plan batch publication endpoint, audit endpoint, school notification settings, and parent learning updates.
- Preserved legacy numeric assessments and staff-only evidence queries; parent queries require `PUBLISHED` evidence and an existing `ParentStudent` link.
- CBC labels remain data-driven through the existing `GradeScale` and `GradeScaleBand` relations.

## Migration and deployment

1. Set `DATABASE_URL` to the Neon PostgreSQL connection string.
2. Run `npx prisma migrate deploy` in the deployment environment.
3. Run `npx prisma generate` as part of install/build.
4. Deploy the Next.js application. The build script skips migration when `DATABASE_URL` is absent, which keeps preview/static validation safe.

The migration is `20260929110000_add_assessment_moderation_workflow` and is additive apart from expanding the existing evidence and notification enums and replacing the old recipient/evidence notification uniqueness with an event-key uniqueness constraint.

## Optional email

Email delivery remains disabled unless the school explicitly enables it and either `EMAIL_SERVER_HOST` or `RESEND_API_KEY` is configured. No SMTP credentials are exposed in the settings UI. In-app publication alerts work without an email provider.

## Manual smoke test

1. Sign in as a teacher assigned to a class and open an assessment plan.
2. Record evidence. Confirm it is `SUBMITTED`, has an audit event, and creates no preliminary parent alert by default.
3. Sign in as a school administrator and open **Moderation queue**.
4. Verify the evidence; reject/return actions require a reason.
5. Publish the verified evidence. Confirm a single parent notification is created.
6. Repeat the publish request and confirm no duplicate notification is created.
7. Sign in as the linked parent and open **Learning updates**. Confirm only the published snapshot appears.
8. Confirm the parent cannot see internal notes, review reasons, or submitted-only evidence.
9. Try the same evidence with an unlinked parent, another teacher, and an administrator from another school; each must be denied or return not found.
10. Change school notification defaults under **Notification settings** and verify the next publication follows them.

## Validation performed

- `npx prisma validate` — passed with a placeholder PostgreSQL URL because this sandbox has no database URL.
- `npx prisma generate` — passed.
- `npx tsc --noEmit` — passed.
- `npm run lint` — passed with the repository's existing warnings and zero errors.
- `npx next build` — passed.
- `npm run test:workflow` — covers transition safety and idempotency key behavior.

A live Neon migration and authenticated browser E2E run require the deployment database and test credentials; they were not available in this sandbox.
