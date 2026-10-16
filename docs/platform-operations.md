# Platform Operations

## Subscriptions and Limits

The platform records plans, trial windows, subscription status, and optional student/staff caps. It does not process payments, charge schools, or automatically renew plans. The migration assigns existing schools an unmetered `LEGACY` plan and creates a configurable `TRIAL` plan for new schools. Capacity checks apply to new student, teacher, and school-admin creation; existing records remain readable if a subscription is past due, canceled, or expired.

Configure plan limits in **Platform → Subscriptions** only after commercial terms are approved. `null` means unlimited. No price or billing claim is implied by a plan name.

## Announcements

Platform operators can publish global or school-specific announcements and maintenance banners with a start/end window. School Admins see active notices applicable to their school. These are dashboard notices, not a guaranteed email/SMS delivery mechanism.

## Support Access

There is no user impersonation. A School Admin must submit a reasoned support request; a Super Admin may approve read-only diagnostics access for 1–30 minutes. The diagnostics page shows school profile/configuration and aggregate counts only; it does not expose individual learner/staff records or provide write operations. The School Admin can revoke the grant. Request, decision, view, and revoke actions are audited.

This is a technical safeguard, not a substitute for a support-access policy, contract, or legal review.

## Exports and Deletion Requests

A School Admin can download a school-scoped JSON export from **Account → Data governance**. The export excludes credentials, MFA secrets/recovery hashes, platform audit/security records, and data for other schools. Synchronous exports are capped at 100,000 included records; larger exports require a separately arranged secure process. Treat downloaded files as sensitive personal data and store/delete them under the school's approved retention controls.

Deletion requests are queued for platform review and require documented notes and a legal/retention review before the workflow can be marked complete. The application does **not** automatically delete records when a request is submitted, approved, or completed. A separate, reviewed erasure procedure must define data scope, legal basis, statutory/financial retention, backups, linked accounts, and verification.

This workflow does not assert compliance with the Kenya Data Protection Act or any other law. Before enabling real deletion, have Kenyan privacy counsel and the school's data controller approve the process, retention schedule, response timelines, and evidence of erasure.

## Database Changes

Before deploying these operations models, create a Neon backup/branch, deploy schema migrations, then deploy the application. For example, from the project root with `DIRECT_URL` configured:

```bash
npm run db:deploy
```

To seed the unified Kenya CBC reference catalog after deployment, use the direct connection URL:

```bash
DATABASE_URL="$DIRECT_URL" npm run db:seed-cbc
```

The CBC seed is idempotent. It consolidates the legacy `KE-CBC` catalog into `CBC` while preserving curriculum versions and school-offering links. It imports the operator-provided structure and assessment milestones; detailed strands/outcomes are only supplemented when valid scraped JSON is available.
