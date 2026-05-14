# BondhuKoi Architecture Migration Guide

This document outlines the step-by-step process for migrating the BondhuKoi application from a Supabase-centric architecture to a custom Heroku + Cloudflare R2 stack.

## 🏗️ Target Architecture Recap
*   **Frontend:** Expo React Native App (Remains unchanged, but points to new API endpoints)
*   **Backend:** Fastify Node.js Server hosted on a **Heroku Dyno**
*   **Database:** **Heroku Postgres** with the PostGIS extension enabled
*   **Object Storage:** **Cloudflare R2** for avatars, map snapshots, and media (Zero egress fees)

---

## Phase 1: Preparation & Prerequisites

1.  **Heroku Account & CLI:**
    *   Ensure your Heroku Student Developer Pack is active.
    *   Download and install the [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli).
    *   Run `heroku login` in your terminal.
2.  **Cloudflare Account:**
    *   Sign up for Cloudflare and navigate to **R2**.
    *   Enable the R2 subscription (free tier handles up to 10GB storage and 10 million reads/mo).

---

## Phase 2: Database Migration (Supabase to Heroku Postgres)

### 1. Provision Heroku Postgres
Create a new Heroku app and attach a database:
```bash
heroku create bondhukoi-api
heroku addons:create heroku-postgresql:mini -a bondhukoi-api
```

### 2. Enable PostGIS
Heroku Postgres supports PostGIS natively. Enable it via the Heroku config or run this in a `psql` shell connected to your new Heroku DB:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### 3. Export Data from Supabase
Use Supabase's migration tools or standard `pg_dump` to extract your schema and data (including your custom RPCs like `check_user_inside_university` and `get_circle_boundaries_batch`):
```bash
pg_dump -h db.[PROJECT-REF].supabase.co -U postgres -d postgres -F c -f supabase_dump.dump
```

### 4. Import Data to Heroku
Use `pg_restore` to push the data into your new Heroku database:
```bash
heroku pg:backups:restore '<YOUR_LOCAL_DUMP_URL_OR_FILE>' DATABASE_URL -a bondhukoi-api
```

---

## Phase 3: Backend Rewrite (Fastify)

Since we are dropping Supabase, Fastify can no longer rely on `@supabase/supabase-js` for database reads or authentication. 

### 1. Database Connection Configuration
Install the native PostgreSQL client:
```bash
npm install pg
```
Replace Supabase initializations with a standard connection pool:
```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Required for Heroku Postgres
});

module.exports = pool;
```
*Note: Any routes that used `supabase.from('circles').select('*')` must be rewritten as pure SQL: `pool.query('SELECT * FROM circles')`.*

### 2. Rewriting Authentication (The Hardest Part)
Supabase Auth needs to be completely replaced.
1.  **User Table:** Create a secure `users` table in Postgres (if one doesn't exist outside of Supabase's `auth` schema). It needs an email, hashed password, and Google ID fields.
2.  **Dependencies:** Install `bcrypt` for passwords and `@fastify/jwt` for sessions.
    ```bash
    npm install bcrypt @fastify/jwt
    ```
3.  **Auth Routes:** Create endpoints for `/api/auth/register`, `/api/auth/login`, and `/api/auth/google`.
4.  **Google OAuth:** Use `@fastify/oauth2` to manually handle the Google Sign-in callback, verify the token, and mint a local JWT for the user.

---

## Phase 4: Object Storage Migration (Cloudflare R2)

Cloudflare R2 is fully S3-compatible. We will use the standard AWS SDK to interface with it from Fastify.

### 1. Provision R2 Bucket
1. Go to Cloudflare Dashboard -> R2.
2. Create a new bucket called `bondhukoi-media`.
3. Generate an "R2 API Token". Save the **Access Key ID**, **Secret Access Key**, and **Endpoint URL** (it looks like `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`).

### 2. Install AWS SDK in Fastify
```bash
npm install @aws-sdk/client-s3 @fastify/multipart
```

### 3. Setup the File Upload Provider
Create a utility like `src/utils/storage.js`:
```javascript
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});

async function uploadToR2(fileName, fileBuffer, mimeType) {
  const command = new PutObjectCommand({
    Bucket: "bondhukoi-media",
    Key: fileName,
    Body: fileBuffer,
    ContentType: mimeType,
  });
  await s3.send(command);
  
  // Return public URL (requires making the bucket public or dealing with pre-signed URLs)
  return `https://pub-your-custom-r2-domain.r2.dev/${fileName}`;
}
module.exports = { uploadToR2 };
```

---

## Phase 5: Frontend (Expo) Adjustments

### 1. Remove Supabase Client
Delete `@supabase/supabase-js`. 

### 2. Update AuthContext
Your frontend `AuthContext.js` needs to be overhauled:
*   Instead of `supabase.auth.signInWithPassword()`, you will execute an `axios.post('https://bondhukoi-api.herokuapp.com/api/auth/login')`.
*   Store the resulting JWT token in `SecureStore`.
*   Pass this token in the `Authorization: Bearer <TOKEN>` header for all subsequent API requests.

### 3. Update File Uploads
Instead of using Supabase Storage functions in React Native, switch to sending `multipart/form-data` requests directly to your Fastify `/api/upload` endpoint, which will in turn push the file to Cloudflare R2.

---

## 🔮 Final Review Checklist
- [ ] Database Schema is fully mirrored in Heroku Postgres.
- [ ] PostGIS extension is active and boundary queries are functioning.
- [ ] All `@supabase/supabase-js` references are removed from the backend.
- [ ] Fastify routes utilize raw SQL queries via the `pg` package.
- [ ] Custom JWT Authentication flow is secure.
- [ ] Avatar and Map Snapshot uploads route successfully to Cloudflare R2 bucket.
- [ ] Frontend API calls include the JWT Authorization header.
