# Student Performance System

A multi-tenant school management platform for student records, assessments, attendance, fees, reporting, and AI-assisted performance analysis.

## Stack

- Next.js 15 App Router with React 19 and TypeScript
- PostgreSQL with Prisma ORM
- NextAuth credentials authentication with role-based access
- Tailwind CSS v4 and Recharts
- PWA/offline support for field and classroom workflows
- PDF, Excel, CSV, email, and Anthropic integrations

## Local setup

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Create a local `.env` from the project environment template and provide at minimum:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`

3. Generate the Prisma client and apply migrations:

   ```bash
   npx prisma generate
   npx prisma migrate dev
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
