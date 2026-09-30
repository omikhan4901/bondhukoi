# Security review

A review of the API, database and app before the first beta, against the OWASP Top 10
(2021) for the API and the OWASP MASVS for the app. Each area lists what protects it, what
the revamp fixed from the old code, and any risk accepted for now (with the reason). Test
files that cover the behaviour are in brackets (all in `backend/test/` unless noted).

The threat model this answers is in [`security/threat-model.md`](security/threat-model.md).

---

## A01 Broken access control

- Every route that takes an id loads the record by id **and** the signed-in user; another
  person's id is a 404, never a 403 that confirms it exists. [friends, circles, fuzz]
- A fuzz test walks every registered route as a stranger with real ids from someone
  else's world (circles, requests, watches, users) and fails if any returns 2xx or changes a
  row. New routes are covered without anyone remembering to add them. [fuzz]
- Friend requests are accepted only by the receiver; watches only by the watched person;
  either side can end a watch. [friends]
- Circle admin actions check the role; admins can't remove other admins; the last admin
  can't step down. [circles]
- Admin routes need an `admins` row **and** a two-factor (aal2) session. Moderators can't
  change settings, bans, admins or universities. [admin]
- **Admins can't see where anyone is:** a test walks every admin GET route and fails if a
  response contains presence or location fields. [admin]
- The database is locked to the app's public key: row-level security is on for every
  table, with no policies and no grants for `anon` or `authenticated`, and the `public`
  schema is not exposed through the Data API. [signup: "the app's public key can read nothing"]
- **Fixed from the old code:** anyone could accept their own watch request (watch a
  friend without consent), accept or reject other people's friend requests, and remove
  other people's watches; user search and profiles needed no sign-in and returned emails;
  circle boundaries were readable by any signed-in user.

## A02 Cryptographic failures

- Passwords, email verification and resets are Supabase Auth's (bcrypt, single-use
  codes, rate limited). The API stores no passwords.
- Access tokens are verified with a pinned algorithm list (the project's signing keys, or
  HS256 only if a legacy secret is configured); issuer, audience and expiry are checked;
  `alg: none` and foreign issuers are refused. [auth]
- Sessions can be revoked: "sign out everywhere", suspension and bans set
  `sessions_revoked_at`, which refuses older tokens, and delete refresh sessions. [auth, admin]
- On the phone the session is in the Android Keystore / iOS Keychain (expo-secure-store),
  not AsyncStorage. Android backups are off (`allowBackup: false`).
- The server refuses to start with a missing or short JWT secret. [unit]
- Backups are encrypted (AES-256) before upload, because the repository is public.
- **Fixed:** a guessable fallback JWT secret, plain-text refresh tokens, tokens in
  AsyncStorage.

## A03 Injection

- Every query uses parameters (`pg`); no user input is concatenated into SQL. The one
  dynamic part (column lists for updates) comes from fixed maps, never from input.
- `LIKE` searches escape `%`, `_` and `\`. [misc: "search wildcards are matched literally"]
- JSON schemas on every route reject unknown fields and wrong types before handlers run;
  prototype-pollution keys and deep nesting never reach the database. [fuzz]
- Chat links must be `https` on a known chat host (no `javascript:` links). [circles]
- **Fixed:** user search built a PostgREST filter by pasting the search text into `.or()`.

## A04 Insecure design

- Consent first: nobody sees anything until a friend request, circle invitation or watch
  is accepted, and everything can be undone from "Who can see me".
- Paused sharing, quiet hours and suspended accounts all look the same to friends
  ("Not sharing"), so friends can't tell which. [unit: presence rules]
- Watch alerts about circles go only to watchers in that circle; an "all" watch never
  reveals a circle the watcher isn't in. [presence]
- Circles can only invite the inviter's friends, so strangers can't pull you into one.
- Sign-up only with a university email (domain checked in the database), optionally an
  invite code with limited uses, expiry and university. [signup]
- **Fixed:** the core feature leaked nothing only because it didn't work: the old API
  never returned friends' status. The new one returns it through a single visibility
  function with tests for every rule.

## A05 Security misconfiguration

- Helmet headers (HSTS, nosniff, frame denial, CSP defaults); CORS closed except the
  admin console's origin; 256 KB body limit (4 MB only on the photo route). [auth, misc]
- Errors never include stack traces or database messages; 500s return a request id only.
  [auth: "errors never leak internals"]
- Maintenance mode makes the API read-only for everyone but admins. [misc]
- Cloud Run: max 2 instances, 15 s timeout, runtime service account can only read its two
  secrets. Deploys use Workload Identity (no key files).

## A06 Vulnerable and outdated components

- `npm audit --omit=dev --audit-level=high` in CI; Dependabot weekly for both packages
  and GitHub Actions; gitleaks on every push.
- **Fixed in this review:** sharp upgraded past a high-severity libvips advisory (it
  processes user uploads).

## A07 Identification and authentication failures

- Supabase Auth: email confirmation by code, 10-character passwords with letters and
  digits, rate limits on sign-in, sign-up and codes.
- Suspended and banned accounts are refused on every request, their sessions ended and
  their push tokens deleted. [auth, admin]
- Accounts can't move their email to another university or a personal address. [signup]
- Accepted risk: no user-facing two-factor in v1 (cut in D5); admins must use TOTP.

## A08 Software and data integrity failures

- Migrations are the only way the schema changes, applied in CI order by the deploy
  workflow. Production deploys need an approval (GitHub environment).
- Photos are decoded and re-encoded server-side (JPEG, fixed size, all metadata including
  GPS removed), so no uploaded file is served as sent. [me: avatar]

## A09 Security logging and monitoring failures

- Every admin change is in `admin_audit` with before and after. [admin]
- Account events (sign-up, friend added, report sent, …) feed the admin timeline; they
  never include location.
- Logs never include request bodies or the Authorization header (pino redaction), and
  location checks log only warnings.
- **Fixed:** the old server logged every request body, including passwords at login.
- Accepted for now: no alerting beyond the daily health check and Sentry emails; admin
  alert emails are planned (Phase 6).

## A10 Server-side request forgery

- The API fetches nothing from user-supplied URLs. Chat links are stored and opened by
  the phone, never fetched by the server. Push goes only to Expo's fixed endpoint.

## Uploads and denial of service

- Per-user rate limits on every route (per IP before sign-in), editable in the admin
  console; location checks 90 per hour per person. [presence, admin]
- Images: 3 MB input cap, 40-megapixel decode cap, re-encoded to 256 px (avatars) or
  800 px (zone pictures). Zones: at most 100 points, 10 m to 5 km across, and must be a
  valid (non-self-crossing) polygon. [circles, unit]
- Limits per person: 30 circles, 100 members per circle, 50 pending friend requests.

---

## Mobile app (OWASP MASVS)

| Area | What protects it |
|---|---|
| Storage | Session in Keystore/Keychain; no location history on the phone; `allowBackup: false`. |
| Crypto | TLS only (Supabase and Cloud Run are HTTPS); no custom crypto. |
| Auth | Supabase Auth sessions, refreshed only while the app is open, cleared on sign-out. |
| Network | No cleartext API URL in production builds; the Maps key is restricted to the app's package and certificate. |
| Platform | Location, camera and photos are asked for only when needed, with an explanation first; the microphone and contacts permissions are blocked. |
| Code | No secrets in the bundle: only the public Supabase anon key, which can't read any table. |
| Privacy | Coordinates are sent only at zone edges or app open, straight to the server, never stored or logged. |

## How to report a problem

See [`SECURITY.md`](../SECURITY.md).
