# GitHub Environment Secrets Template

This file documents all secrets and variables needed for `dev` and `staging` GitHub Environments.

## How to Add Secrets

1. Go to **Settings → Environments** → `[dev|staging]`
2. Click **Add secret** under "Secrets"
3. Copy the name and value from the appropriate section below

## 🔐 `dev` Environment Secrets

### Database Secrets

```
Secret Name: DATABASE_URL
Value: postgresql://[user]:[password]@[host]/pawscall_dev?sslmode=require

Secret Name: PLATFORM_DATABASE_URL
Value: postgresql://[user]:[password]@[host]/pawscall_platform_dev?sslmode=require

Secret Name: DEMO_TENANT_DATABASE_URL
Value: postgresql://[user]:[password]@[host]/pawscall_demo_dev?sslmode=require
```

**Source:** Neon Postgres (from `neonctl connection-string`)

### Authentication Secrets

```
Secret Name: AUTH_SECRET
Value: [Generate with: openssl rand -hex 64]
```

### Vercel Deployment Secrets

```
Secret Name: VERCEL_TOKEN
Value: [From Vercel Dashboard → Account → Tokens]

Secret Name: VERCEL_ORG_ID
Value: [From npx vercel whoami or org settings]

Secret Name: VERCEL_PROJECT_ID
Value: [From Vercel project → Settings → General]
```

### Payment Secrets (Stripe)

```
Secret Name: STRIPE_SECRET_KEY
Value: sk_test_... [From Stripe Dashboard → API Keys]

Secret Name: STRIPE_WEBHOOK_SECRET
Value: whsec_test_... [From Stripe Dashboard → Webhooks]
```

## 📋 `dev` Environment Variables

### Public App Configuration

```
Variable Name: NEXT_PUBLIC_APP_URL
Value: https://pawcall-dev.vercel.app

Variable Name: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
Value: pk_test_... [From Stripe Dashboard → API Keys]

Variable Name: VIDEO_PROVIDER
Value: mock
```

---

## 🔐 `staging` Environment Secrets

Use the **same template as `dev`**, but substitute:
- `DATABASE_URL` → staging Neon connection string
- `PLATFORM_DATABASE_URL` → staging Neon platform database
- `DEMO_TENANT_DATABASE_URL` → staging Neon demo database
- `AUTH_SECRET` → Generate new value with `openssl rand -hex 64`
- `VERCEL_PROJECT_ID` → staging Vercel project ID
- `STRIPE_SECRET_KEY` → Stripe test key (same or different test account)
- `STRIPE_WEBHOOK_SECRET` → Staging Stripe webhook secret

## 📋 `staging` Environment Variables

### Public App Configuration

```
Variable Name: NEXT_PUBLIC_APP_URL
Value: https://pawcall-staging.vercel.app

Variable Name: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
Value: pk_test_... [Stripe test key]

Variable Name: VIDEO_PROVIDER
Value: mock
```

---

## 🔑 Generating Random Secrets

Use OpenSSL to generate secure random values:

```bash
# Generate AUTH_SECRET (64 hex characters)
openssl rand -hex 64

# Generate webhook secret (64 hex characters)
openssl rand -hex 64
```

## ⚠️ Important Notes

- **Never use production Stripe keys in dev/staging**
- **AUTH_SECRET should be rotated every 90 days** — generate new values and update both environments
- **VERCEL_TOKEN should be stored securely** — regenerate if ever leaked
- **All `NEXT_PUBLIC_*` variables are visible in browser** — don't put secrets here
- **DATABASE_URL is a secret** — connection strings contain passwords

## Checklist

- [ ] Create `dev` GitHub Environment
- [ ] Add all `dev` secrets (database, auth, Vercel, Stripe)
- [ ] Add all `dev` variables (public app URLs, keys)
- [ ] Create `staging` GitHub Environment
- [ ] Add all `staging` secrets (database, auth, Vercel, Stripe)
- [ ] Add all `staging` variables (public app URLs, keys)
- [ ] Test deployment by pushing to `dev` branch
- [ ] Test deployment by pushing to `staging` branch
- [ ] Verify apps load at `pawcall-dev.vercel.app` and `pawcall-staging.vercel.app`

## Troubleshooting

### Secret not visible in workflow

**Solution:** Secrets are only available to workflows on the matched branch. Ensure the GitHub workflow is pushing to the correct branch (`dev` or `staging`).

### Deployment fails with "Vercel credentials missing"

**Solution:** The `deploy-dev` or `deploy-staging` job will fail with a clear error if credentials are missing. Check GitHub Actions logs and verify all Vercel secrets are set in the Environment.

### How to rotate secrets safely

1. Generate a new secret value
2. Add it to the GitHub Environment
3. Test in a PR branch
4. Once verified, update production Vercel project environment variables
5. Old secret can be revoked after confirmation
