# Vercel Deployment Guide for Student Performance System

Follow these steps to deploy and host the **Student Performance System** on [Vercel](https://vercel.com).

---

## Step 1: Push Code to GitHub / GitLab / Bitbucket
1. Ensure all your local changes are committed to your git repository.
2. Push your repository to your remote Git provider (GitHub, GitLab, or Bitbucket).

---

## Step 2: Set Up a Managed PostgreSQL Database
Since this project uses **Prisma ORM** with **PostgreSQL**, you need a live PostgreSQL database URL:
- **Option A: Vercel Postgres / Neon**
  - In Vercel, navigate to **Storage** -> **Create Database** -> **Postgres (Neon)**.
- **Option B: Supabase**
  - Create a project on [Supabase.com](https://supabase.com). Copy the PostgreSQL connection string (`Transaction Pooler` or `Session Pooler`).
- **Option C: Railway or Render**
  - Create a PostgreSQL database on Railway or Render and copy the connection string.

---

## Step 3: Run Database Migrations & Seed Data
Run migrations explicitly against your production database before deploying schema changes. The Vercel build compiles the app but does not apply database migrations.

The CBC report-card workspace adds snapshot, template, entry, comment, publication, amendment, and status-audit tables. Apply the checked-in Prisma migration before using `/dashboard/report-cards`; do not move this migration back into the Vercel build command.

```bash
# Apply Prisma migrations to your live production database.
# For Neon, use the direct (unpooled) URL for Prisma CLI migrations.
DATABASE_URL="your-pooled-runtime-url" \
DIRECT_URL="your-direct-database-url" \
npm run db:deploy

# (Optional) Seed initial super admin / sample data into production database
DATABASE_URL="your-production-postgres-db-url" npm run db:seed
```

See the official [Neon Prisma migration guide](https://neon.com/docs/guides/prisma-migrations) and [Prisma ORM v6 direct URL reference](https://www.prisma.io/docs/orm/v6/reference/prisma-config-reference#datasourcedirecturl-removed) for details. Keep the direct URL in the environment used for `npm run db:deploy`; the application can continue using the pooled `DATABASE_URL` at runtime.

---

## Step 4: Import Project into Vercel
1. Log in to your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **"Add New..."** -> **"Project"**.
3. Import your **Student Performance System** repository.
4. Select **Framework Preset**: `Next.js`.

---

## Step 5: Configure Environment Variables in Vercel
In the **Environment Variables** section during project setup (or under **Settings -> Environment Variables**), add the following keys:

| Variable Name | Required | Description | Example Value |
|---|---|---|---|
| `DATABASE_URL` | **Yes** | Runtime PostgreSQL connection string; use the pooled Neon URL for serverless runtime | `postgresql://user:pass@ep-xyz-pooler.region.aws.neon.tech/neondb?sslmode=require` |
| `DIRECT_URL` | **Yes for pooled databases** | Direct, non-pooled PostgreSQL URL used by Prisma Migrate; Neon host must omit `-pooler` | `postgresql://user:pass@ep-xyz.region.aws.neon.tech/neondb?sslmode=require` |
| `DATABASE_URL_UNPOOLED` | Alternative to `DIRECT_URL` | Alias accepted for the direct migration URL | — |
| `NEXTAUTH_SECRET` | **Yes** | Secret key for JWT session encryption | Generate via `openssl rand -base64 32` |
| `NEXTAUTH_URL` | **Yes** | Your live production Vercel URL | `https://your-app-name.vercel.app` |
| `ANTHROPIC_API_KEY` | Optional | API key for AI performance analysis | `sk-ant-api03-...` |
| `SMTP_HOST` | Optional | SMTP host for email notifications | `smtp.resend.com` |
| `SMTP_PORT` | Optional | SMTP port | `587` |
| `SMTP_USER` | Optional | SMTP user | `resend` |
| `SMTP_PASS` | Optional | SMTP password | `re_123456...` |
| `SMTP_FROM` | Optional | From email address | `noreply@yourdomain.com` |

---

## Step 6: Deploy!
1. Click **Deploy**.
2. Vercel will install dependencies (triggering `npm run postinstall`, which runs `prisma generate`) and build the Next.js application. Migrations are intentionally separate from the build: run `npm run db:deploy` from an environment with `DIRECT_URL` (or `DATABASE_URL_UNPOOLED`) configured whenever deploying database schema changes. The migration helper retries only transient Prisma `P1002` advisory-lock timeouts; it does not disable Prisma's locking.
3. Once finished, Vercel will provide your live URL (e.g. `https://student-performance-system.vercel.app`).

---

## Step 7: Post-Deployment Verification
1. Visit `https://<your-app-name>.vercel.app/login`.
2. Test signing in with your Super Admin / School Admin credentials.
