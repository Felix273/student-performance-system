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
Before or immediately after linking to Vercel, run migrations against your production database:

```bash
# Apply Prisma migrations to your live production database
DATABASE_URL="your-production-postgres-db-url" npx prisma migrate deploy

# (Optional) Seed initial super admin / sample data into production database
DATABASE_URL="your-production-postgres-db-url" npm run prisma:seed # or npx ts-node prisma/seed.ts
```

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
| `DATABASE_URL` | **Yes** | Live PostgreSQL connection string | `postgresql://user:pass@ep-xyz.postgres.database.azure.com/db` |
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
2. Vercel will install dependencies (triggering `npm run postinstall` which runs `prisma generate`), compile TypeScript, and build the Next.js application.
3. Once finished, Vercel will provide your live URL (e.g. `https://student-performance-system.vercel.app`).

---

## Step 7: Post-Deployment Verification
1. Visit `https://<your-app-name>.vercel.app/login`.
2. Test signing in with your Super Admin / School Admin credentials.
