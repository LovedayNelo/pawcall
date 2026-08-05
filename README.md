# PawCall — Veterinary Telemedicine Platform

> **⚠️ Naira-denominated MVP. Currently targeting the Nigerian market.**

A two-sided marketplace connecting pet owners with licensed veterinarians for
on-demand and scheduled video consultations, positioned as triage before
in-person visits.

## Quick Start

```bash
# Install
npm install

# Configure env (copy from example)
cp .env.example .env
# Edit .env: set DATABASE_URL, AUTH_SECRET, etc.

# Database
npm run db:migrate   # or manually: drop DB → create → npm run db:setup
npm run db:seed

# Run tests + type-check
npm test
npx tsc --noEmit

# Dev server
npm run dev
# → http://localhost:3000
```

## Architecture

- **Framework:** Next.js 16 (monolith, TypeScript, Tailwind v4)
- **Database:** PostgreSQL (via Prisma 7 + `@prisma/adapter-pg`)
- **Auth:** Stateless JWT sessions (jose HS256, httpOnly cookies)
- **Payments:** Stripe (PaymentIntents + webhooks) with dev mock fallback
- **Video:** Provider abstraction — mock / Daily / Twilio

### Domain Layer (pure, tested)

| Module                        | File                                   | Concern                |
| ----------------------------- | -------------------------------------- | ---------------------- |
| Triage engine                 | `src/domain/triage/triage.ts`          | Emergency interrupt    |
| Compliance rules engine       | `src/domain/compliance/compliance.ts`  | Jurisdiction policies  |
| Payment split + payouts       | `src/domain/payments/split.ts`         | Integer math (kobo)    |

### Key Design Decisions

1. **Emergency interrupt** — Triage runs on intake; CRITICAL dispositions return
   HTTP 409 with a Google Maps link to the nearest 24-hour emergency vet. No
   consult is created.

2. **Compliance engine is data-driven** — Policies live in
   `src/domain/compliance/defaultPolicies.ts` and can be overridden via the
   `JurisdictionPolicy` table without a redeploy.

3. **All money stored as integer kobo** — 1 NGN = 100 kobo. Consult price is
   `₦9,800` (9800 kobo). See `src/lib/formatCurrency.ts` for display helpers.

4. **Route protection** — `src/proxy.ts` (not Express-style middleware) handles
   role-based access per route.

## Deployment

### GitHub Environments

The repository uses three branches:

| Branch     | Environment | Purpose                          |
| ---------- | ----------- | -------------------------------- |
| `main`     | —           | Production (merge via PR)        |
| `staging`  | Staging     | Pre-production testing           |
| `dev`      | Development  | Active development               |

GitHub environments (`dev`, `staging`) must be created in repo settings with:
- Required reviewers (staging only)
- Environment secrets: `DATABASE_URL`, `AUTH_SECRET`, `STRIPE_SECRET_KEY`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, etc.
- Environment variables: `NEXT_PUBLIC_APP_URL`, `VIDEO_PROVIDER`

### CI/CD

`.github/workflows/ci.yml` runs on push to `dev`/`staging` and on pull requests:

1. **`test`** — `prisma generate` → `next typegen` → `tsc --noEmit` → vitest → `next build`. This is the required status check for both environments.
2. **`deploy-dev` / `deploy-staging`** — each runs only when its branch is pushed, runs `prisma migrate deploy` against the environment's `DATABASE_URL`, then deploys to Vercel with `vercel build --prod` + `vercel deploy --prebuilt --prod`.

### Vercel (hosting)

Two Vercel projects, one per environment (production branch set to the matching git branch):

| Vercel project   | Git branch | Stable URL                |
| ---------------- | ---------- | ------------------------- |
| `pawcall-dev`    | `dev`      | `pawcall-dev.vercel.app`  |
| `pawcall-staging`| `staging`  | `pawcall-staging.vercel.app` |

1. Authenticate locally: `npx vercel@latest login` (or set a `VERCEL_TOKEN` from the Vercel dashboard → Account → Tokens).
2. In each project, set **Environment Variables** (Production):
   `DATABASE_URL`, `AUTH_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
3. Add the following **GitHub environment secrets** (repo → Settings → Environments → `dev` / `staging`), so CI can deploy and migrate:
   - `VERCEL_TOKEN`, `VERCEL_ORG_ID` (from `npx vercel@latest whoami` / org settings)
   - `VERCEL_PROJECT_ID` (from each project's Settings → General)
   - `DATABASE_URL` (the matching Neon database URL)

### Neon (Postgres)

Each environment gets its own Neon database so schema changes can be tested
independently. Provision via `npx neonctl@latest auth login`, then:

```bash
npx neonctl@latest projects create --name pawcall-dev --set-as-default
npx neonctl@latest branches create --name dev
npx neonctl@latest connection-string  # copy as dev DATABASE_URL
```

Repeat for `pawcall-staging`. Run migrations with `npx prisma migrate deploy`
using the matching `DATABASE_URL`.

### Staging → Production Promotion

```bash
git checkout main
git merge staging
git push origin main
```

## Scripts

| Command                | What it does                                   |
| ---------------------- | ---------------------------------------------- |
| `npm test`             | Run vitest test suite (36 tests)               |
| `npx tsc --noEmit`     | Type-check without emitting                     |
| `npx next build`       | Full production build                           |
| `npx prisma generate`  | Regenerate Prisma client after schema changes  |
| `npm run db:seed`      | Seed dev DB with sample admin/owner/vet        |

## Legal

- Vets cannot prescribe controlled substances remotely.
- Video vet advice is for triage only — not a substitute for in-person exams.
- See `src/app/legal/page.tsx` for full disclaimer language.

> **Attorney review required before production launch.** Key areas flagged in
> `src/domain/compliance/compliance.ts`.
