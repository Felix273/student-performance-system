# Student Performance System

A multi-tenant school management platform for student records, assessments, attendance, fees, reporting, and AI-assisted performance analysis.

## Stack

- Next.js 15 App Router with React 19 and TypeScript
- PostgreSQL with Prisma ORM
- NextAuth credentials authentication with role-based access
- Tailwind CSS v4 and Recharts
- Responsive dashboard UI; service-worker caching is intentionally disabled until authenticated offline sync is account-scoped
- PDF, Excel, CSV, email, and Anthropic integrations

## Local setup

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Create a local `.env` from [`/.env.example`](./.env.example) and provide at minimum:
   - `DATABASE_URL`
   - `DIRECT_URL` (or `DATABASE_URL_UNPOOLED`) when the database URL is pooled; use the direct URL for Prisma migrations
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`
   - `ANTHROPIC_API_KEY` only if AI analysis is enabled

3. Generate the Prisma client and apply migrations:

   ```bash
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) and sign in at `/login`.

## Quality checks

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Lint currently reports legacy `any` and hook-dependency usage as warnings so the existing application remains usable while those modules are migrated incrementally. TypeScript is checked strictly and production builds no longer suppress type or lint failures.

## Main areas

- `app/dashboard/` — role-aware dashboards and administration screens
- `app/api/` — authenticated data, report, upload, and analysis endpoints
- `prisma/` — schema, migrations, and seed data
- `lib/reports/` — PDF and Excel generation
- `lib/offline/` — IndexedDB caching and synchronization

See [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md) for deployment steps and environment variables.

The repository includes the PostgreSQL schema and all migrations, but it does not include a database or credentials. Run `npx prisma migrate status` after setting `DATABASE_URL` to verify that the target database is reachable and up to date. Never commit `.env` or real connection strings.

### Production notes

- Run `npm run db:deploy` against the hosted database before the first deployment.
- Do not run the demo seed in production. For a disposable staging environment only, set `ALLOW_DEMO_SEED=true` and provide unique `DEMO_ADMIN_PASSWORD` and `DEMO_SCHOOL_ADMIN_PASSWORD` values.
- Change or remove any demo accounts created in development before inviting real schools.
