# Deploying BondhuKoi

Everything runs on free tiers: **Supabase** (database, login, file storage), **Google
Cloud Run** (the API) and **Cloudflare Pages** (admin console, website, privacy policy).
Set up **staging** first, check it, then repeat for **production**. Each takes about an
hour the first time.

Nothing here costs money if you follow the guard rails in step 2.4. Every secret goes
into a settings page, never into the repository.

---

## 1. Supabase (database, login, storage)

### 1.1 Create the project
1. Go to <https://supabase.com/dashboard> → **New project**.
2. Name: `bondhukoi-staging` (later `bondhukoi-prod`). Region: **Mumbai (ap-south-1)**.
   Generate a strong database password and save it in your password manager.
3. Plan: **Free**.

### 1.2 Apply the schema
From the repository root, with the [Supabase CLI](https://supabase.com/docs/guides/cli):
```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>   # Settings → General → Reference ID
npx supabase db push                                  # applies supabase/migrations
```
Then add your university in **SQL Editor**:
```sql
insert into universities (name, short_name, email_domains)
values ('North South University', 'NSU', array['northsouth.edu']);
```
(The campus boundary is drawn later in the admin console.)

### 1.3 Lock down the Data API
**Settings → API → Data API settings → Exposed schemas**: remove `public` (leave only
`graphql_public`). The app never reads tables directly; this closes the door completely.

### 1.4 Login settings (Authentication)
- **Sign In / Providers → Email**: Enable email provider **on**, Confirm email **on**,
  Secure email change **on**, Minimum password length **10**, Password requirements
  **Letters and digits**.
- **Sign In / Providers → Allow new users to sign up**: **on** (the database only
  accepts university emails and, when switched on, invite codes).
- **Emails → Templates → Confirm signup**: replace the body with
  ```html
  <h2>Your BondhuKoi code</h2>
  <p>Enter this code in the app: <strong>{{ .Token }}</strong></p>
  <p>It expires in one hour. If you didn't sign up, ignore this email.</p>
  ```
  Do the same for **Reset password** ("Your BondhuKoi reset code").
- **Emails → SMTP Settings**: turn on custom SMTP with a free provider (Resend or
  Brevo). Supabase's built-in sender only allows a few emails an hour.
- **Multi-Factor**: TOTP **enabled** (admins must use it).
- **URL Configuration**: Site URL `bondhukoi://`, redirect URLs `bondhukoi://auth`.
- **Rate Limits**: leave the defaults.

### 1.5 Storage
The migration creates the two buckets. Check **Storage** shows `avatars` (public) and
`snapshots` (private).

### 1.6 Keys you'll need
- **Settings → API**: Project URL, `anon` public key (goes in the app), `service_role`
  key (goes only in Cloud Run).
- **Settings → Database → Connection string → Transaction pooler**: the `DATABASE_URL`
  for the API (port 6543).
- **Settings → Database → Connection string → Session pooler**: `SUPABASE_DB_URL` for
  migrations and backups (port 5432).

### 1.7 Make yourself an admin
Sign up in the app first, then in **SQL Editor**:
```sql
insert into admins (user_id, role)
select p.id, 'super' from profiles p join auth.users u on u.id = p.id
where u.email = 'you@northsouth.edu';
```

---

## 2. Google Cloud Run (the API)

### 2.1 Project and billing
1. <https://console.cloud.google.com> → project picker → **New project** →
   `bondhukoi`.
2. **Billing** → link a billing account (Cloud Run needs one even on the free tier).

### 2.2 Budget alert first
**Billing → Budgets & alerts → Create budget**: amount **$1**, alerts at 50%, 90%,
100%, email to you.

### 2.3 Secrets
**Security → Secret Manager → Create secret**, twice:
- `bondhukoi-database-url` = the transaction-pooler `DATABASE_URL`
- `bondhukoi-supabase-service-key` = the `service_role` key

### 2.4 Service accounts (least privilege)
**IAM & Admin → Service Accounts → Create**:
1. `bondhukoi-api` (the running API). Roles: **Secret Manager Secret Accessor** only.
2. `bondhukoi-deploy` (GitHub Actions). Roles: **Cloud Run Admin**, **Cloud Build
   Editor**, **Artifact Registry Writer**, **Service Account User** (on `bondhukoi-api`
   only), **Storage Admin** (for the build bucket).

### 2.5 Let GitHub deploy without a key file
**IAM & Admin → Workload Identity Federation → Create pool** `github`, provider
`github` (OIDC, issuer `https://token.actions.githubusercontent.com`, attribute
condition `assertion.repository == 'omikhan4901/bondhukoi'`). Then grant the pool
**Workload Identity User** on `bondhukoi-deploy`.

### 2.6 GitHub settings
**Repo → Settings → Environments**: create `staging` and `production` (add yourself as a
required reviewer on production). In each, set:

| Kind | Name | Value |
|---|---|---|
| Variable | `GCP_PROJECT_ID` | your project id |
| Variable | `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/<number>/locations/global/workloadIdentityPools/github/providers/github` |
| Variable | `GCP_DEPLOY_SERVICE_ACCOUNT` | `bondhukoi-deploy@<project>.iam.gserviceaccount.com` |
| Variable | `GCP_RUNTIME_SERVICE_ACCOUNT` | `bondhukoi-api@<project>.iam.gserviceaccount.com` |
| Variable | `CLOUD_RUN_SERVICE` | `bondhukoi-api-staging` / `bondhukoi-api` |
| Variable | `SUPABASE_URL` | the project URL |
| Variable | `CORS_ORIGINS` | the admin console URL, e.g. `https://admin.bondhukoi.pages.dev` |
| Secret | `SUPABASE_DB_URL` | the session-pooler connection string |

Also add repository variables `GCP_PROJECT_ID` (so the workflow runs), `API_URL` (the
production API URL, for the daily health check) and, once you want backups,
`BACKUPS_ENABLED=true` plus the secret `BACKUP_PASSPHRASE` (a long random phrase kept in
your password manager).

### 2.7 Deploy
Push to `main` → staging deploys. Tag a release (`git tag v1.0.0 && git push --tags`) →
production deploys after you approve it in the Actions tab.

---

## 3. Cloudflare Pages (admin console and website)

1. <https://dash.cloudflare.com> → **Workers & Pages → Create → Pages → Connect to Git**
   → `omikhan4901/bondhukoi`.
2. Admin console: root directory `admin`, build `npm run build`, output `dist`,
   environment variables `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
3. Website (privacy policy, delete-account page): root directory `site`, no build,
   output `.`.

---

## 4. The app

In `frontend/BondhuKoiApp/.env` (and as EAS secrets for store builds):
`EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`,
`GOOGLE_MAPS_API_KEY`. Restrict the Maps key in Google Cloud to the Android app
(package `com.omi.bondhukoi` and your signing certificate's SHA-1).

---

## Checklist before real users

- [ ] Staging works end to end on a real phone (sign up, add a friend, arrive on campus).
- [ ] `public` is not an exposed schema (1.3).
- [ ] Custom SMTP is on and the code email arrives within a minute.
- [ ] Budget alert exists; Cloud Run max instances is 2.
- [ ] You are a super admin with two-factor on.
- [ ] One backup has been taken and restored into a scratch project (docs/backups.md).
