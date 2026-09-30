# BondhuKoi API

Fastify API for BondhuKoi. It answers "which friends are on campus?" without storing
anyone's location: the phone sends a reading when it crosses a zone edge, the server works
out which zones it is in, stores only that, and drops the coordinates.

## Run it locally

```bash
cp .env.example .env      # fill in a Supabase project (or the local stack below)
npm install
npm run dev
```

The local Supabase stack (`npx supabase start` in the repo root) gives you Postgres with
PostGIS, Auth and Storage on your machine; `supabase/` holds its config and migrations.

## Tests

```bash
npm test
```

Starts (or reuses) a PostGIS container called `bondhukoi-testdb`, rebuilds the schema from
`supabase/migrations`, and runs every test with `node --test`. Set `TEST_DATABASE_URL` to
use another database (CI does).

## Layout

| Path | What's there |
|---|---|
| `src/app.js` | Builds the server; everything external is passed in |
| `src/server.js` | Production entry point |
| `src/lib/visibility.js` | The rules for who can see whose status |
| `src/lib/presence.js` | The location check: zones in, coordinates out |
| `src/lib/limits.js` | Rate limits for every route |
| `src/routes/` | One file per area: me, users, friends, watches, circles, presence, notifications, safety |
| `test/` | Route, ownership and privacy tests |
