# PawCall Environments Setup Guide

This guide covers setting up **dev** and **staging** environments for PawCall using GitHub Environments, Vercel, and Neon Postgres.

## Overview

| Environment | Branch   | URL                          | Purpose                | Auto-Deploy |
|-------------|----------|------------------------------|------------------------|-------------|
| Development | `dev`    | `pawcall-dev.vercel.app`     | Active development     | On push     |
| Staging     | `staging`| `pawcall-staging.vercel.app` | Pre-production testing | On push     |
| Production  | `main`   | TBD                          | Live service           | Manual      |

## Prerequisites

- GitHub repository access with admin rights
- Vercel account (free or paid)
- Neon Postgres account
- Node.js 24+ locally
- `npx` available in CLI

## Step 1: Set Up Neon Postgres Databases

Create three independent Postgres databases — one for each environment.

### Create dev database

```bash
# Install Neon CLI
npm install -g neonctl

# Login to Neon
neonctl auth login

# Create project
neonctl projects create --name pawcall-dev --set-as-default

# Create branch (optional, but recommended)
neonctl branches create --name dev

# Get connection string
neonctl connection-string
# Output: postgresql://[user]:[password]@[host]/pawcall_dev?sslmode=require
```

**Save the connection string** — this becomes `DATABASE_URL` in GitHub Secrets.

### Create tenant databases (dev)

For multi-tenant support, also create:

```bash
neonctl databases create --name pawcall_platform_dev
neonctl databases create --name pawcall_demo_dev
```

Get their connection strings and save as `PLATFORM_DATABASE_URL` and `DEMO_TENANT_DATABASE_URL`.

### Repeat for staging

```bash
neonctl projects create --name pawcall-staging --set-as-default
neonctl branches create --name staging
neonctl connection-string
neonctl databases create --name pawcall_platform_staging
neonctl databases create --name pawcall_demo_staging
```

## Step 2: Create Vercel Projects

Create two Vercel projects — one for dev, one for staging.

### Create dev Vercel project

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the GitHub repository
3. Set **Production Branch** to `dev`
4. Click "Deploy"
5. Once deployed, go to **Settings → General** and note:
   - `VERCEL_PROJECT_ID`
   - `VERCEL_ORG_ID` (from org settings or `npx vercel whoami`)

### Create staging Vercel project

Repeat above, but:
- Name it `pawcall-staging`
- Set **Production Branch** to `staging`

## Step 3: Get Vercel Authentication Token

```bash
# Generate a token
npx vercel@latest login
# Follow prompts to create a token in the Vercel dashboard

# Or retrieve an existing token
npx vercel@latest whoami
# Output shows your ORG_ID and token in dashboard
```

**Save this token** — it becomes the `VERCEL_TOKEN` GitHub Secret.

## Step 4: Configure GitHub Environments

GitHub Environments allow branch-specific secrets and deployment protection rules.

### Create `dev` environment

1. Go to **Settings → Environments**
2. Click **New environment**
3. Name it `dev`
4. Click **Configure environment**

#### Add Secrets to `dev`

Click **Add secret** for each:

| Secret Name                | Value                                    |
|----------------------------|------------------------------------------|
| `DATABASE_URL`             | Neon dev connection string               |
| `PLATFORM_DATABASE_URL`    | Neon dev platform database URL           |
| `DEMO_TENANT_DATABASE_URL` | Neon dev demo tenant database URL        |
| `AUTH_SECRET`              | Generate with `openssl rand -hex 64`    |
| `VERCEL_TOKEN`             | Token from Step 3                        |
| `VERCEL_ORG_ID`            | Organization ID from Step 2              |
| `VERCEL_PROJECT_ID`        | Dev Vercel project ID from Step 2        |
| `STRIPE_SECRET_KEY`        | Stripe test key (if using Stripe)        |
| `STRIPE_WEBHOOK_SECRET`    | Stripe webhook secret (if using Stripe)  |

#### Add Environment Variables to `dev`

GitHub also supports non-secret env vars. Click **Add variable** for:

| Variable Name               | Value                                  |
|-----------------------------|----------------------------------------|
| `NEXT_PUBLIC_APP_URL`       | `https://pawcall-dev.vercel.app`       |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe test publishable key |
| `VIDEO_PROVIDER`            | `mock` (for development)               |

### Create `staging` environment

Repeat the above, but for `staging`:

| Secret Name                | Value                                    |
|----------------------------|------------------------------------------|
| `DATABASE_URL`             | Neon staging connection string           |
| `PLATFORM_DATABASE_URL`    | Neon staging platform database URL       |
| `DEMO_TENANT_DATABASE_URL` | Neon staging demo tenant database URL    |
| `AUTH_SECRET`              | Generate with `openssl rand -hex 64`    |
| `VERCEL_TOKEN`             | Same token as `dev`                      |
| `VERCEL_ORG_ID`            | Same org ID as `dev`                     |
| `VERCEL_PROJECT_ID`        | Staging Vercel project ID                |
| `STRIPE_SECRET_KEY`        | Stripe test key                          |
| `STRIPE_WEBHOOK_SECRET`    | Stripe webhook secret                    |

#### Add Environment Variables to `staging`

| Variable Name               | Value                                     |
|-----------------------------|-------------------------------------------|
| `NEXT_PUBLIC_APP_URL`       | `https://pawcall-staging.vercel.app`      |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe test publishable key    |
| `VIDEO_PROVIDER`            | `mock` or `daily` / `twilio` (test keys) |

## Step 5: Verify Environment Variables in Vercel

Each Vercel project also needs the same environment variables set for local builds.

### For `pawcall-dev` Vercel project

1. Go to **Settings → Environment Variables**
2. Add **Production** environment variables (matching GitHub Secrets)

### For `pawcall-staging` Vercel project

Repeat for staging variables.

## Step 6: Test the CI/CD Pipeline

### Push to `dev` branch

```bash
git checkout dev
git push origin dev
```

**Expected flow:**
1. GitHub Actions runs `test` job (Prisma generate, type-check, tests, build)
2. If `test` passes, `deploy-dev` job runs automatically
3. Vercel deploys to `pawcall-dev.vercel.app`
4. Prisma migrations run against dev database

**Check deployment:**
- Go to [pawcall-dev.vercel.app](https://pawcall-dev.vercel.app)
- Go to GitHub → **Actions** tab to see workflow runs

### Push to `staging` branch

```bash
git checkout staging
git merge dev  # or cherry-pick specific commits
git push origin staging
```

**Expected flow:**
1. GitHub Actions runs `test` job
2. If `test` passes, `deploy-staging` job runs
3. Vercel deploys to `pawcall-staging.vercel.app`
4. Prisma migrations run against staging database

## Step 7: Set Up Branch Protection Rules (Optional)

To enforce reviews before merging to `staging` or `main`:

1. Go to **Settings → Branches**
2. Click **Add rule**
3. For branch pattern `staging`:
   - Enable **Require a pull request before merging**
   - Set **Required approving reviews** to 1
   - Enable **Require status checks to pass** (select `test` job)
4. Repeat for `main` with stricter rules (e.g., 2+ approvals)

## Step 8: Local Development

### Clone and install

```bash
git clone https://github.com/you/pawscall.git
cd pawscall
npm install
```

### Create local `.env`

```bash
cp .env.example .env
```

Edit `.env` to use your local Postgres instance (or copy `DATABASE_URL` from Neon if using remote):

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/pawscall?schema=public"
PLATFORM_DATABASE_URL="postgresql://user:pass@localhost:5432/pawscall_platform?schema=public"
AUTH_SECRET="local-dev-secret"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
VIDEO_PROVIDER="mock"
```

### Run migrations and seed

```bash
npm run db:migrate
npm run db:seed
```

### Start dev server

```bash
npm run dev
# → http://localhost:3000
```

## Workflow: Making Changes

### For a new feature

```bash
# Create feature branch from dev
git checkout dev
git pull origin dev
git checkout -b feature/my-feature

# Make changes, commit, push
git push origin feature/my-feature

# Create PR targeting dev
# → GitHub Actions runs `test` job automatically
# → Once tests pass and PR is approved, merge to dev
# → `deploy-dev` runs and deploys to pawcall-dev.vercel.app
```

### For promoting to staging

```bash
# Create PR from dev → staging
git checkout staging
git pull origin staging
git merge dev  # or manually cherry-pick specific commits

# Or create PR via GitHub UI: dev → staging
# → Tests run, then `deploy-staging` runs
# → Deploys to pawcall-staging.vercel.app
```

### For promoting to production

```bash
# Create PR from staging → main
git checkout main
git pull origin main
git merge staging

# Or via GitHub UI: staging → main
# → Tests run, but deploy must be manual (no auto-deploy to main)
# → Requires admin approval before merge (recommended)
```

## Troubleshooting

### Deployment fails: "Vercel credentials not configured"

**Solution:** Verify `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` are set in the GitHub Environment secrets.

```bash
# Check secrets (from GitHub CLI)
gh secret list --env=dev
```

### Database migrations fail

**Solution:** Verify `DATABASE_URL` is correct in GitHub Environment secrets, and the Neon database is running.

```bash
# Test connection locally
psql $DATABASE_URL -c "SELECT 1"
```

### Build fails: "Prisma client not generated"

**Solution:** This is usually fixed by `npm run prisma:generate` in CI. If it still fails:

```bash
npm run prisma:generate  # Locally first
git add .
git commit -m "Regenerate Prisma clients"
git push
```

### Environment variables not visible in app

**Secrets are only available to GitHub Actions workflows**, not the Vercel preview. Ensure `NEXT_PUBLIC_*` vars are set in Vercel's **Environment Variables** (not just GitHub Secrets).

## Security Best Practices

1. **Rotate `AUTH_SECRET`** every 90 days — generate new values and update GitHub Secrets
2. **Never commit `.env` files** — they're in `.gitignore`
3. **Use test keys for Stripe/Twilio in dev/staging** — never use production keys
4. **Lock branch protection rules** — require at least one review for `staging` and `main`
5. **Audit GitHub Secrets** regularly — remove old unused tokens

## References

- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [GitHub Environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [Neon Postgres CLI](https://neon.tech/docs/reference/neon-cli)
- [Prisma Migrations](https://www.prisma.io/docs/orm/prisma-migrate/understand-prisma-migrate)
