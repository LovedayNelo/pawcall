# ✅ Environments Setup Checklist

Track your progress setting up dev and staging environments.

## Phase 1: Reading & Understanding (5 min)

- [ ] Read `ENVIRONMENTS_QUICK_START.md`
- [ ] Understand the 3-environment architecture (dev, staging, main)
- [ ] Review branch strategy (dev → staging → main)

## Phase 2: Create Cloud Resources (10 min)

### Neon Databases
- [ ] Create `pawcall-dev` project in Neon
- [ ] Get `DATABASE_URL` for dev (save it)
- [ ] Create `pawcall_platform_dev` database (save URL)
- [ ] Create `pawcall_demo_dev` database (save URL)
- [ ] Create `pawcall-staging` project in Neon
- [ ] Get `DATABASE_URL` for staging (save it)
- [ ] Create `pawcall_platform_staging` database (save URL)
- [ ] Create `pawcall_demo_staging` database (save URL)

### Vercel Projects
- [ ] Create `pawcall-dev` Vercel project (branch: `dev`)
- [ ] Get `VERCEL_PROJECT_ID` for dev (save it)
- [ ] Create `pawcall-staging` Vercel project (branch: `staging`)
- [ ] Get `VERCEL_PROJECT_ID` for staging (save it)
- [ ] Generate/find `VERCEL_ORG_ID` (save it)

### Vercel Token
- [ ] Generate `VERCEL_TOKEN` from Vercel dashboard (save it)

## Phase 3: GitHub Configuration (10 min)

### Create GitHub Environments
- [ ] Go to Settings → Environments
- [ ] Create `dev` environment
- [ ] Create `staging` environment

### Add Dev Secrets (dev environment)
- [ ] `DATABASE_URL` (from Neon dev)
- [ ] `PLATFORM_DATABASE_URL` (from Neon dev)
- [ ] `DEMO_TENANT_DATABASE_URL` (from Neon dev)
- [ ] `AUTH_SECRET` (generate: `openssl rand -hex 64`)
- [ ] `VERCEL_TOKEN` (from Vercel)
- [ ] `VERCEL_ORG_ID` (from Vercel)
- [ ] `VERCEL_PROJECT_ID` (dev project ID)
- [ ] `STRIPE_SECRET_KEY` (Stripe test key, if using)
- [ ] `STRIPE_WEBHOOK_SECRET` (Stripe, if using)

### Add Dev Variables (dev environment)
- [ ] `NEXT_PUBLIC_APP_URL` = `https://pawcall-dev.vercel.app`
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (Stripe test, if using)
- [ ] `VIDEO_PROVIDER` = `mock`

### Add Staging Secrets (staging environment)
- [ ] `DATABASE_URL` (from Neon staging)
- [ ] `PLATFORM_DATABASE_URL` (from Neon staging)
- [ ] `DEMO_TENANT_DATABASE_URL` (from Neon staging)
- [ ] `AUTH_SECRET` (generate new: `openssl rand -hex 64`)
- [ ] `VERCEL_TOKEN` (same as dev)
- [ ] `VERCEL_ORG_ID` (same as dev)
- [ ] `VERCEL_PROJECT_ID` (staging project ID)
- [ ] `STRIPE_SECRET_KEY` (Stripe test key, if using)
- [ ] `STRIPE_WEBHOOK_SECRET` (Stripe, if using)

### Add Staging Variables (staging environment)
- [ ] `NEXT_PUBLIC_APP_URL` = `https://pawcall-staging.vercel.app`
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (Stripe test, if using)
- [ ] `VIDEO_PROVIDER` = `mock`

## Phase 4: Vercel Configuration (5 min)

### Dev Vercel Project
- [ ] Go to pawcall-dev Settings → Environment Variables
- [ ] Add all secrets and variables (copy from GitHub)
- [ ] Set environment to "Production"

### Staging Vercel Project
- [ ] Go to pawcall-staging Settings → Environment Variables
- [ ] Add all secrets and variables (copy from GitHub)
- [ ] Set environment to "Production"

## Phase 5: Test Deployment (5 min)

### Deploy to Dev
```bash
git checkout dev
git push origin dev
```

- [ ] GitHub Actions `test` job passes
- [ ] GitHub Actions `deploy-dev` job runs
- [ ] Vercel deployment succeeds
- [ ] App loads at https://pawcall-dev.vercel.app
- [ ] Database is accessible
- [ ] No console errors

### Deploy to Staging
```bash
git checkout staging
git pull origin staging
git merge dev
git push origin staging
```

- [ ] GitHub Actions `test` job passes
- [ ] GitHub Actions `deploy-staging` job runs
- [ ] Vercel deployment succeeds
- [ ] App loads at https://pawcall-staging.vercel.app
- [ ] Database is accessible
- [ ] No console errors

## Phase 6: Local Development (5 min)

```bash
./scripts/setup-env.sh local
# Edit .env with your local database
npm run db:migrate
npm run db:seed
npm run dev
```

- [ ] Local dev server starts (`npm run dev`)
- [ ] Can access http://localhost:3000
- [ ] Can login with seeded admin account
- [ ] Database queries work
- [ ] No console errors

## Phase 7: Verification (5 min)

Use the checklist in `.github/DEPLOYMENT_CHECKLIST.md` to verify:
- [ ] All GitHub Environments configured
- [ ] All secrets present and correct
- [ ] All variables configured
- [ ] Deployments successful
- [ ] Databases accessible
- [ ] Local development working

## Phase 8: Optional Security Setup (10 min)

- [ ] Enable branch protection for `staging` (1+ required review)
- [ ] Enable branch protection for `main` (2+ required reviews)
- [ ] Set up Slack notifications for CI/CD (optional)
- [ ] Document secret rotation schedule (every 90 days)
- [ ] Add team members with appropriate permissions

## Summary

**Total Time:** 45-60 minutes

**What You Get:**
- ✅ Development environment (auto-deploy on push to `dev`)
- ✅ Staging environment (auto-deploy on push to `staging`)
- ✅ CI/CD pipeline (tests + deployment automation)
- ✅ Multi-tenant database support
- ✅ Automatic database migrations
- ✅ Branch protection ready
- ✅ Documented rollback procedures
- ✅ Secret rotation schedule

## When Complete

You're ready to:
1. Create feature branches from `dev`
2. Push to create PRs
3. Merge to `dev` for auto-deployment
4. Merge `dev` → `staging` for pre-production testing
5. Merge `staging` → `main` for production (manual deploy)

## Support

Need help?
- Quick setup questions? → `ENVIRONMENTS_QUICK_START.md`
- Detailed guide? → `ENVIRONMENTS.md`
- Secrets checklist? → `.github/ENVIRONMENT_SECRETS_TEMPLATE.md`
- Deployment verification? → `.github/DEPLOYMENT_CHECKLIST.md`
- Issues? → Check `ENVIRONMENTS.md` troubleshooting section

---

**Estimated completion time:** ~1 hour total

**Last updated:** $(date)
