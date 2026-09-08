# 🚀 Deployment Checklist

Use this checklist to verify all environments are properly configured before your first deployment.

## Pre-Deployment Setup

### GitHub Environments Created
- [ ] `dev` environment exists (Settings → Environments)
- [ ] `staging` environment exists
- [ ] Branch protection rules set for `staging` and `main` (optional but recommended)

### Neon Databases Created
- [ ] `pawcall-dev` database created
- [ ] `pawcall-staging` database created
- [ ] `PLATFORM_` and `DEMO_TENANT_` tenant databases created for both environments
- [ ] Connection strings obtained from `neonctl connection-string`

### Vercel Projects Created
- [ ] `pawcall-dev` Vercel project created (branch: `dev`)
- [ ] `pawcall-staging` Vercel project created (branch: `staging`)
- [ ] `VERCEL_PROJECT_ID` obtained for each
- [ ] `VERCEL_ORG_ID` obtained

### Vercel Token Generated
- [ ] Vercel token generated and available
- [ ] Token stored securely (will be used in GitHub Secrets)

---

## Dev Environment Configuration

### GitHub Secrets Added (Settings → Environments → dev)
- [ ] `DATABASE_URL` = Neon dev connection string
- [ ] `PLATFORM_DATABASE_URL` = Neon platform dev connection string
- [ ] `DEMO_TENANT_DATABASE_URL` = Neon demo dev connection string
- [ ] `AUTH_SECRET` = `openssl rand -hex 64`
- [ ] `VERCEL_TOKEN` = Vercel token
- [ ] `VERCEL_ORG_ID` = Your Vercel org ID
- [ ] `VERCEL_PROJECT_ID` = Dev Vercel project ID
- [ ] `STRIPE_SECRET_KEY` = Stripe test key (sk_test_...)
- [ ] `STRIPE_WEBHOOK_SECRET` = Stripe webhook secret

### GitHub Variables Added (Settings → Environments → dev)
- [ ] `NEXT_PUBLIC_APP_URL` = `https://pawcall-dev.vercel.app`
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = Stripe test publishable key (pk_test_...)
- [ ] `VIDEO_PROVIDER` = `mock`

### Vercel Environment Variables Set (pawcall-dev project)
- [ ] All secrets from above added to Vercel project settings
- [ ] Production environment selected

---

## Staging Environment Configuration

### GitHub Secrets Added (Settings → Environments → staging)
- [ ] `DATABASE_URL` = Neon staging connection string
- [ ] `PLATFORM_DATABASE_URL` = Neon platform staging connection string
- [ ] `DEMO_TENANT_DATABASE_URL` = Neon demo staging connection string
- [ ] `AUTH_SECRET` = `openssl rand -hex 64` (different from dev)
- [ ] `VERCEL_TOKEN` = Vercel token (same as dev)
- [ ] `VERCEL_ORG_ID` = Your Vercel org ID (same as dev)
- [ ] `VERCEL_PROJECT_ID` = Staging Vercel project ID
- [ ] `STRIPE_SECRET_KEY` = Stripe test key
- [ ] `STRIPE_WEBHOOK_SECRET` = Stripe webhook secret

### GitHub Variables Added (Settings → Environments → staging)
- [ ] `NEXT_PUBLIC_APP_URL` = `https://pawcall-staging.vercel.app`
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = Stripe test publishable key
- [ ] `VIDEO_PROVIDER` = `mock` or `daily`/`twilio` (with test keys)

### Vercel Environment Variables Set (pawcall-staging project)
- [ ] All secrets from above added
- [ ] Production environment selected

---

## First Deployment Test

### Deploy to Dev
```bash
git checkout dev
git push origin dev
```

**Verify:**
- [ ] GitHub Actions `test` job passes
- [ ] GitHub Actions `deploy-dev` job runs automatically
- [ ] Vercel deployment succeeds
- [ ] Prisma migrations run without errors
- [ ] App loads at https://pawcall-dev.vercel.app
- [ ] Database connection is working (check console for any errors)

### Deploy to Staging
```bash
git checkout staging
git pull origin staging
git merge dev
git push origin staging
```

**Verify:**
- [ ] GitHub Actions `test` job passes
- [ ] GitHub Actions `deploy-staging` job runs automatically
- [ ] Vercel deployment succeeds
- [ ] Prisma migrations run without errors
- [ ] App loads at https://pawcall-staging.vercel.app
- [ ] Database connection is working

---

## Post-Deployment Checks

### Dev Environment
- [ ] App is accessible at pawcall-dev.vercel.app
- [ ] Database tables exist (check via Neon console)
- [ ] Can login with seeded admin account (if seed ran)
- [ ] No console errors in browser DevTools

### Staging Environment
- [ ] App is accessible at pawcall-staging.vercel.app
- [ ] Database tables exist
- [ ] Can login with seeded admin account
- [ ] No console errors in browser DevTools

---

## Maintenance Tasks

### Weekly
- [ ] Check GitHub Actions logs for any failed deployments
- [ ] Monitor Vercel deployment status
- [ ] Verify database backups (Neon handles this automatically)

### Monthly
- [ ] Review GitHub Secrets (Settings → Secrets)
- [ ] Check for any deprecation warnings in CI logs
- [ ] Verify Stripe webhook connectivity (test webhook from dashboard)

### Quarterly (Every 90 Days)
- [ ] Rotate `AUTH_SECRET` — generate new values and update both environments
- [ ] Rotate `STRIPE_WEBHOOK_SECRET` if needed
- [ ] Review and update Vercel token if expired

---

## Rollback Procedure

If a deployment fails:

### In Dev
```bash
git revert <commit-hash>
git push origin dev
# CI/CD will run again automatically
```

### In Staging
```bash
git revert <commit-hash>
git push origin staging
# CI/CD will run again automatically
```

---

## Common Issues

| Issue | Solution |
|-------|----------|
| "Vercel credentials not configured" | Check GitHub Secrets in Environments settings |
| "Database migration failed" | Verify DATABASE_URL connects to Neon |
| "Build failed: Prisma client missing" | Run `npm run prisma:generate` locally and commit |
| "App loads but no data" | Check if `npm run db:seed` ran in CI |
| "Deployment hangs" | Check Vercel deployment logs for stuck builds |

---

## Next Steps

1. ✅ Complete all checklist items above
2. 📝 Document any custom environment setup
3. 🔐 Store secrets safely (consider password manager)
4. 👥 Add team members with appropriate GitHub permissions
5. 📞 Set up Slack notifications for CI/CD (optional via Vercel)

---

**All set!** Your environments are ready for active development. 🚀
