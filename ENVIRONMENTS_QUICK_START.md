# 🐾 PawCall Environments — Quick Start

## What's Been Set Up

✅ **Environment files created:**
- `.env.dev` — Development environment configuration
- `.env.staging` — Staging environment configuration
- `.env.example` — Template for local development

✅ **Documentation:**
- `ENVIRONMENTS.md` — Complete 8-step setup guide
- `.github/ENVIRONMENT_SECRETS_TEMPLATE.md` — Secrets checklist
- `scripts/setup-env.sh` — Quick environment setup script

✅ **CI/CD Pipeline:**
- `.github/workflows/ci.yml` — Already configured for `dev` and `staging` branches
- Auto-testing, database migrations, and Vercel deployment

## Quick Start: 5 Minutes

### 1. Create Neon Databases (2 min)

```bash
npm install -g neonctl
neonctl auth login

# Dev environment
neonctl projects create --name pawcall-dev
neonctl connection-string  # Save this → DATABASE_URL

# Staging environment
neonctl projects create --name pawcall-staging
neonctl connection-string  # Save this → DATABASE_URL
```

### 2. Create Vercel Projects (2 min)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import this repo twice:
   - **Project 1:** `pawcall-dev` (branch: `dev`)
   - **Project 2:** `pawcall-staging` (branch: `staging`)
3. Note the `VERCEL_PROJECT_ID` for each

### 3. Add GitHub Environment Secrets (1 min)

Go to **Settings → Environments** and create `dev` and `staging` environments with secrets from `.github/ENVIRONMENT_SECRETS_TEMPLATE.md`

**Required secrets:**
- `DATABASE_URL` (from Neon)
- `AUTH_SECRET` (generate: `openssl rand -hex 64`)
- `VERCEL_TOKEN` (from Vercel dashboard)
- `VERCEL_ORG_ID` (from org settings)
- `VERCEL_PROJECT_ID` (from each Vercel project)

---

## Environment Architecture

```
┌─────────────────┐
│    Your Local   │
│   Development   │
│  (npm run dev)  │
└────────┬────────┘
         │ git push origin feature/*
         │
         ↓
    ┌────────────────────┐
    │  GitHub PR to dev  │
    │  ✓ tests pass      │
    │  ✓ merge & push    │
    └─────────┬──────────┘
              │
              ↓
       ┌──────────────────────┐
       │  Vercel Deploy: DEV  │
       │ pawcall-dev.vercel.app
       └──────────┬───────────┘
                  │
                  │ Create PR: dev → staging
                  │
                  ↓
       ┌──────────────────────────┐
       │ Vercel Deploy: STAGING   │
       │ pawcall-staging.vercel.app
       └──────────┬───────────────┘
                  │
                  │ Create PR: staging → main
                  │ (manual approval required)
                  │
                  ↓
       ┌──────────────────────┐
       │ Production Deploy    │
       │ (future)             │
       └──────────────────────┘
```

---

## Next Steps

### Step 1: Configure GitHub Environments
Follow `.github/ENVIRONMENT_SECRETS_TEMPLATE.md` to add secrets to `dev` and `staging` environments.

### Step 2: Verify Deployment
Push to dev branch and check:
```bash
git checkout dev
git push origin dev
# → GitHub Actions runs automatically
# → Check https://github.com/you/pawscall/actions
# → Deployment link appears when complete
```

### Step 3: For Local Development
```bash
./scripts/setup-env.sh local
# Edit .env with your local database
npm run db:migrate
npm run dev
```

---

## Key Files Reference

| File                               | Purpose                                      |
|------------------------------------|----------------------------------------------|
| `.env.dev`                         | Dev environment template                     |
| `.env.staging`                     | Staging environment template                 |
| `ENVIRONMENTS.md`                  | Complete 8-step setup guide (detailed)       |
| `.github/ENVIRONMENT_SECRETS_TEMPLATE.md` | All secrets and variables needed    |
| `scripts/setup-env.sh`             | Quick environment setup script               |
| `.github/workflows/ci.yml`         | CI/CD pipeline (already configured)          |

---

## Branch Strategy

| Branch    | Environment | Deploy Target         | Auto-Deploy |
|-----------|-------------|----------------------|-------------|
| `dev`     | Development | pawcall-dev.vercel.app | On push    |
| `staging` | Staging     | pawcall-staging.vercel.app | On push |
| `main`    | Production  | (manual, future)      | No         |

---

## Workflow: Making Changes

```bash
# 1. Create feature branch from dev
git checkout dev
git pull origin dev
git checkout -b feature/my-feature

# 2. Make changes, test locally
npm run dev
npm test

# 3. Commit and push
git push origin feature/my-feature

# 4. Create PR targeting dev
# → GitHub Actions runs tests
# → Once approved and merged, auto-deploys to pawcall-dev.vercel.app

# 5. Promote to staging (when ready)
git checkout staging
git pull origin staging
git merge dev
git push origin staging
# → Auto-deploys to pawcall-staging.vercel.app
```

---

## Database Migrations

Migrations run automatically during deployment:

```bash
# In CI/CD (automatic)
npx prisma migrate deploy
npx prisma migrate deploy --schema=prisma/platform.schema.prisma

# Locally (manual)
npm run db:migrate
npm run db:seed
```

---

## Troubleshooting

### "Deployment failed: Vercel credentials missing"
→ Check GitHub Secrets under **Settings → Environments → dev** (or staging)

### "Database migration failed"
→ Verify `DATABASE_URL` in GitHub Secrets points to valid Neon database

### "Build failed: Prisma client not generated"
→ Run locally: `npm run prisma:generate` and commit

### Can't find connection strings?
→ Run: `neonctl connection-string`

---

## Security

- 🔐 All secrets are encrypted by GitHub
- 🚫 Never commit `.env` files (in `.gitignore`)
- 🔄 Rotate `AUTH_SECRET` every 90 days
- ⚠️ Always use **test keys** for Stripe in dev/staging
- 🔑 GitHub Secrets are only exposed to authorized workflows

---

## Support

**Full documentation:** See `ENVIRONMENTS.md` for detailed 8-step walkthrough

**Questions?** Check `.github/ENVIRONMENT_SECRETS_TEMPLATE.md` for all secret names and sources
