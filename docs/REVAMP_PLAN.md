# BondhuKoi revamp plan

The full plan to take BondhuKoi from a switched-off prototype to a secure, clean, tested app
on the Play Store, with an admin console and a launch kit. It follows the way ResumeX
(`omikhan4901/cse299`) was taken to its beta: phases, each one committed and checked
separately, with a pass condition before moving on.

**BondhuKoi has no money side.** There are no plans, credits, payments or pricing pages,
so anything in ResumeX about those is left out.

**Status:** draft, written Sep 30 2026. Update it as decisions are made (see the
[decision log](#decision-log)).

---

## Contents

- [What "done" looks like](#what-done-looks-like)
- [Decisions needed from you](#decisions-needed-from-you)
- [Hosting: the cheapest setup that works](#hosting-the-cheapest-setup-that-works)
- [Phase 0: Foundations](#phase-0-foundations)
- [Phase 1: Fix the known security holes](#phase-1-fix-the-known-security-holes)
- [Phase 2: Security architecture](#phase-2-security-architecture)
- [Phase 3: New hosting and operations](#phase-3-new-hosting-and-operations)
- [Phase 4: Design system and redesign](#phase-4-design-system-and-redesign)
- [Phase 5: Finish, cut or fix every feature](#phase-5-finish-cut-or-fix-every-feature)
- [Phase 6: Admin console](#phase-6-admin-console)
- [Phase 7: Testing, end to end](#phase-7-testing-end-to-end)
- [Phase 8: Play Store release](#phase-8-play-store-release)
- [Phase 9: Marketing and launch](#phase-9-marketing-and-launch)
- [Order and effort](#order-and-effort)
- [Decision log](#decision-log)

---

## What "done" looks like

1. **Nobody can learn anything about a student that the student didn't agree to share:**
   not another student, not a curious CSE classmate poking the API, and not an admin.
2. **It looks as calm and clean as ResumeX:** one clear action per screen, little text,
   consistent components and no "AI-looking" gradients or glows.
3. **It costs $0 a month to run** for the first few thousand students, with hard caps so it
   can never surprise you with a bill.
4. **Every flow is tested automatically,** including moving a fake phone in and out of a
   campus boundary.
5. **An admin console shows everything you need to run it,** and every admin action is logged.
6. **It's live on Google Play,** with a beta of about 80 students and a ready marketing kit.

---

## Decisions needed from you

Everything else in this plan I can decide and log. These are yours. The recommended default
is in bold, and I'll go with it unless you say otherwise.

| # | Decision | Options | Why it matters |
|---|---|---|---|
| D1 | Who can sign up | **Only verified university emails (e.g. `@northsouth.edu`)**, or any email | This is the single biggest safety feature: every account is a real student at a known university, and a banned person can't just make a new account with a Gmail. |
| D2 | How login works | **Move to Supabase Auth**, or keep the hand-written JWT auth | Supabase Auth gives email verification, password reset, Google sign-in, rate limits and session revocation, free up to 50,000 monthly users. The hand-written version has none of these yet, and every one would need writing and testing. |
| D3 | Platforms | **Android first; iOS later if students ask** | Google Play is $25 once. The Apple developer account is $99 a year and iOS background location needs extra work and review. |
| D4 | Brand colour | **"Koi" orange (`#C2410C`)**, or pick another | ResumeX is teal; this makes BondhuKoi recognisably yours while following the same rules. See [Phase 4](#41-tokens). |
| D5 | Unfinished features | **Cut in-app chat, the Places screens, user 2FA and login history from v1; build the activity feed and push notifications** | Placeholders ("Coming soon") make an app look unfinished. See [Phase 5](#phase-5-finish-cut-or-fix-every-feature). |
| D6 | Beta university | **Your own university (NSU), ~80 CSE students** | Decides the first boundary to draw, the email domain and where the marketing goes. |
| D7 | Open source | **Keep the repo public** and invite people to find bugs (a thank-you list, no money) | CSE students trust what they can read. It also turns people who'd poke at it into people who report what they find. |

---

## Hosting: the cheapest setup that works

**Recommendation: Supabase (free) + Google Cloud Run (free tier) + Cloudflare Pages (free).
Expected cost: $0 a month, plus $25 once for Google Play.**

| Piece | Service | Free allowance | Why this one |
|---|---|---|---|
| Database + PostGIS + file storage + login | **Supabase Free** | 500 MB database, 1 GB files, 5 GB egress, 50,000 monthly active users, 2 projects | You already use it, PostGIS is built in, and the whole app fits well inside 500 MB because coordinates are never stored. |
| API (Fastify) | **Google Cloud Run** | 2 million requests, 180,000 vCPU-seconds and 360,000 GiB-seconds a month | Starts in 1 to 2 seconds from zero. You already deploy ResumeX there, so the setup is familiar. |
| Admin console + landing page + privacy policy | **Cloudflare Pages** | Unlimited static sites and bandwidth, commercial use allowed | The Play Store needs a public privacy policy and account-deletion page. |
| Push notifications | **Expo push service** | Free | Works with the Expo app as-is. |
| App builds | **EAS Build (free plan)** | 15 Android + 15 iOS builds a month | Plenty; local builds are free as a fallback. |
| Emails (verification, reset) | **Resend or Brevo free tier**, plugged into Supabase Auth as custom SMTP | Around 100 to 300 emails a day | Supabase's built-in email is rate-limited too heavily for a launch. |
| Errors | **Sentry (free developer plan)** | 5,000 errors a month | Crashes from the app and the API in one place, with personal data scrubbed. |
| Uptime + keep-alive | **GitHub Actions scheduled job** | Free for public repos | Pings `/health` (which touches the database) once a day so Supabase never pauses the project. |
| Domain (optional) | e.g. `bondhukoi.app` | About $10–15 a year | Not required; `bondhukoi.pages.dev` works. |

**Region:** put Supabase in **Mumbai (`ap-south-1`)** and Cloud Run in **Mumbai
(`asia-south1`)**, the closest to Bangladesh, and in the same place so each database call
is fast.

**Why not the others:**
- **Render (free):** sleeps after 15 minutes and takes about a minute to wake. Android gives a
  background geofence task only a few seconds to run, so the first campus entry of the
  morning would be lost. It's fine for a demo, not for this app.
- **Fly.io:** no free tier for new accounts any more.
- **Koyeb (free):** a reasonable backup if you ever leave Google Cloud (one small service
  plus a small Postgres).
- **Heroku:** no free tier, and a self-managed Postgres with PostGIS means doing your own
  backups and login. `HEROKU_MIGRATION_GUIDE.md` is replaced by this section and gets deleted.

**Guard rails so it can never cost money by surprise** (Cloud Run needs a billing account):
- A Google Cloud budget of $1 with email alerts at 50%, 90% and 100%.
- Cloud Run `max-instances=2`, 512 MiB memory, request timeout 15 s.
- Supabase stays on the Free plan, which has no overage charges: it limits instead of billing.
- A usage card in the admin console (database size, storage, monthly active users) with an
  alert at 70% of each free limit.

**When you'd outgrow it:** past about 500 MB of data or a few thousand daily users. The first
paid step is Supabase Pro at $25 a month, and it's a plan switch, not a migration.

---

## Phase 0: Foundations

Setup that makes every later phase faster and safer.

1. **Working rules:** add a `CLAUDE.md` like ResumeX's: the design rules from Phase 4, "every
   route gets an ownership test", "no placeholder screens", the commit and test conventions.
2. **Repo clean-up:**
   - Delete the duplicate `app/signup.js` (keep `app/(auth)/signup.js`), `mDESIGN.md`, the old
     `DESIGN.md` (replaced in Phase 4), `HEROKU_MIGRATION_GUIDE.md` and the stale checklist in
     `backend/QUICK_REFERENCE.md`.
   - Remove dead code: the unused `pointInPolygon`, the custom JSON parser in `index.js`
     (it's registered inside a plugin, so it never runs), and `uploadSnapshot` in the app's
     `api.js`. Remove the `🔴` debug logs.
   - Add `frontend/BondhuKoiApp/.env.example` and the `LICENSE` file the README links to.
3. **Database as code:** move every table, function (`check_user_inside_university`,
   `get_circle_boundaries_batch`, …) and policy into numbered migrations under
   `supabase/migrations/`, managed with the Supabase CLI. Today they're spread across
   `schema.json`, `schemafunctions.json` and three `.sql` files, so a fresh project can't be
   built from the repo. This is also what makes the local test database possible (Phase 7).
4. **Tooling:** ESLint + Prettier for both packages, and TypeScript-style checking through
   JSDoc (`// @ts-check`) so the API and app agree on shapes without a full rewrite.
5. **CI (GitHub Actions):** on every push, lint, unit tests, backend integration tests against
   a local Supabase in Docker, `npm audit`, CodeQL and secret scanning. Later phases add the
   E2E and security scans.

**Pass:** a new Supabase project and a running API can be built from the repo with one
command, and CI is green.

---

## Phase 1: Fix the known security holes

The problems found in the first review, fixed first because each one breaks the "privacy
first" promise. Each fix comes with a test that fails before and passes after.

1. **Ownership checks on every request action:** accepting or rejecting a friend request and
   accepting a watch request must be done by the person *receiving* it. Deleting a watch must
   be done by one of its two people. A watch request today can be accepted by the person who
   sent it, so anyone can watch a friend without consent. (`backend/src/routes/friends.js`)
2. **Log in to see anyone:** `GET /users/:userId` and `GET /users/search/:query` require a
   session, return only what a stranger may see (name, university and avatar; **never
   email**), and search only people at your own university. Rate limited.
3. **Safe search:** escape the search text before it goes into the Supabase `.or()` filter,
   with a minimum length of 2 characters (`backend/src/db/database.js`).
4. **Circle boundaries only for members:** `GET /locations/circles/:id/boundary` checks
   membership.
5. **No secrets in logs:** remove the login-body and global-body logging and add pino
   `redact` for `password`, `token`, `refreshToken`, `authorization`, `snapshotBase64` and
   coordinates.
6. **Refuse to start without a strong secret:** no `'your_secret_key'` fallback; require a
   32+ character `JWT_SECRET` in production (or none at all, if D2 moves login to Supabase).
7. **Hash refresh tokens** (SHA-256) before storing them, as the README already claims.
   Moot if login moves to Supabase Auth.
8. **The sleep window in Bangladesh time:** compute 6 PM to 6 AM in `Asia/Dhaka`, not the
   server's clock (Cloud Run runs in UTC). Let each user change the hours later.
9. **Rate limits per user:** key the location check and boundary saves on the user id,
   not the IP (a whole campus shares a few IPs). Set boundary saves back to production values.
10. **No internal errors to clients:** 500 responses say "Something went wrong" plus a
    request id; the details go only to the logs and Sentry.
11. **Fix the broken flows:** rejecting a circle invite goes to `/groups`, not the missing
    `/circles`; the Google sign-up path no longer calls an undefined `signupWithGoogle`.
12. **Unique friend codes:** 8 characters from `crypto.randomInt`, retried on the database's
    unique constraint.

**Pass:** the new ownership tests (Phase 7, item 2) pass for every route, and none of the
first review's findings reproduce.

---

## Phase 2: Security architecture

The app will be used and poked at by CSE students, and it deals with where people are. It
has to hold up to someone who reads the source and calls the API directly.

### 2.1 Threat model (written first, kept in `docs/security/threat-model.md`)

| Who | What they might try | What stops them |
|---|---|---|
| A curious classmate with the API | Read other people's data by changing ids; find everyone's email | Ownership checks on every route (tested), row-level security, no emails in public responses |
| An ex or a stalker | Watch someone without them knowing; keep watching after being removed | Consent for every watch, a "Who can see me" screen, instant removal, a notice when someone starts watching, blocking |
| Someone outside the university | Make an account to watch students | University-email-only sign-up (D1) |
| A banned person | Come back with a new account | University email (one per person), a ban list by email |
| Someone faking a location | Pretend to be on campus | Low risk (it only fools their friends); flag impossible jumps in logs, no punishment |
| A leaked admin account | See everyone | Admins can't see locations or who is where (see Phase 6), 2FA, short sessions, audit log |
| A leaked or stolen phone | Use the logged-in app | Tokens in the phone's secure storage, sessions revocable from another device |
| Someone flooding the API | Run up costs or knock it over | Per-user and per-IP limits, body size limits, Cloud Run max instances |

### 2.2 Login and sessions

- **Supabase Auth** (D2): university-email sign-up with a verification code, password reset,
  optional Google sign-in restricted to the university domain, and
  its built-in rate limits. The Fastify API verifies Supabase's JWT; the hand-written signup,
  login, refresh and bcrypt code is removed.
- Tokens move from `AsyncStorage` to **`expo-secure-store`** (the Android Keystore).
- **Sessions screen:** see your signed-in devices and sign out of the others.
- **Account deletion** removes the user and everything they own (memberships, requests,
  watches, transitions, avatar), and has a web form as Google Play requires.

### 2.3 The database defends itself

- **Row-level security on every table, denying everything to the app's public key.** The app
  holds the anon key, so today nothing but obscurity stops it reading tables directly. With
  RLS on, only the API (service role) can read or write.
- **Private storage buckets:** circle map snapshots can show where a group meets, so
  `map-snapshots` becomes private and is served through short-lived signed URLs. Avatars
  stay public but are re-encoded server-side (strips GPS EXIF, caps size and type).
- **Least data:** coordinates are still never stored. Enter/exit history keeps its 24-hour
  and 30-day pruning, now in a scheduled database job (`pg_cron`) instead of a 5% chance
  on requests.

### 2.4 The API

- `@fastify/helmet` headers, a 1 MB body limit (5 MB only on avatar and snapshot routes), and
  Fastify JSON schemas on **every** route's body, params and query (unknown fields rejected).
- One `requireUser` hook and one `requireCircleRole` hook instead of `jwtVerify()` repeated in
  every handler, so a new route can't forget the check.
- Rate limits on every route, listed in the admin console (as ResumeX's `limit()` does).
- A request id on every response and log line.

### 2.5 Consent and safety features (students' safety is part of security)

- **"Who can see me":** one screen listing every friend, circle and watcher, with exactly what
  each one sees ("sees if you're on campus", "gets a notice when you leave the library") and
  a one-tap remove.
- **A notice when someone starts watching you** and a weekly reminder of active watchers
  (can be turned off).
- **Block** (they can't find you, send requests or see your status) and **report**
  (goes to the admin moderation queue).
- **Pause everything** stays one tap from the home screen.
- **Guardrails on circle admins:** a circle admin can't turn detection back on for a member,
  and members can leave at any time.

### 2.6 Supply chain and secrets

- Dependabot, `npm audit` in CI (fail on high), CodeQL, gitleaks.
- The Google Maps key restricted to the app's package name and signing certificate.
- Secrets only in Cloud Run secrets / Supabase / EAS secrets, never in the repo or the app.

### 2.7 A written security review

`docs/security-review.md` in ResumeX's format: OWASP Top 10 for the API and **OWASP MASVS**
for the app, each area listing what protects it, what was fixed and any accepted risk. Plus a
`SECURITY.md` with how to report a problem and a thank-you list (D7).

**Pass:** the review is written with no open high findings, the OWASP ZAP scan against
staging is clean (Phase 7), and a second account can't read or change anything of the first
through the API or directly through Supabase with the anon key.

---

## Phase 3: New hosting and operations

1. **Two environments:** `staging` and `production`, each with its own Supabase project (the
   free plan allows two) and Cloud Run service. Local development uses the Supabase CLI's
   Docker stack, so tests never touch a real project.
2. **Deploy on push:** GitHub Actions builds the API container and deploys to Cloud Run
   staging on every push to `main`, and to production on a version tag. Migrations run first.
3. **Health and keep-alive:** `/health` checks the database. A daily scheduled job pings
   production (so Supabase never pauses) and emails you if it fails.
4. **Errors:** Sentry in the app and the API, with emails, tokens and coordinates scrubbed.
5. **Backups:** Supabase's free plan has no backups you can restore on demand, so add a
   weekly `pg_dump` job to a private place (a GitHub Actions artifact or a Cloudflare R2
   bucket, both free at this size), plus written restore steps in `docs/backups.md`.
6. **App updates:** EAS Update for fixes that don't need a new build, and a **minimum app
   version** setting (in the admin console) that asks old versions to update.
7. **Graceful shutdown and timeouts** in the API so Cloud Run's scale-down never cuts off a
   request mid-way.

**Pass:** a push deploys to staging automatically, a tag deploys to production, a restore
from backup has been tested once, and the monthly bill reads $0.00.

---

## Phase 4: Design system and redesign

**Goal:** the calm, clean feel of ResumeX, rebuilt for a phone and with its own colour.

### What makes ResumeX look clean (and what we copy)

- **Calm, uncluttered screens with little text.** Each screen has **one clear next action**;
  details appear only when needed (progressive disclosure).
- **White and very light slate surfaces, bordered cards, and small brand-tinted icon
  tiles.** No dark gradient bands, glows, glassmorphism or illustrated mock-ups (the
  "AI-looking" style).
- **One accent colour,** used sparingly for the main action and key numbers.
- **Inter for text and Plus Jakarta Sans for headings.**
- **Dialogs never fill the screen:** capped height, scroll inside.
- **Numbers and status up front** (like "13 in progress / 11 applied" on the ResumeX
  dashboard), with the detail one tap away.

The current `DESIGN.md` ("Digital Sanctuary") asks for the opposite: glassmorphism, gradient
buttons and no borders. It's retired, and the new `docs/design.md` replaces it.

### 4.1 Tokens

One file of tokens (`src/theme/tokens.js`) and **no hard-coded colours in screens**. Today
there are 398 hex colours spread over 55 files; a lint rule stops new ones.

| Token | Light | Use |
|---|---|---|
| `brand` | `#C2410C` (koi orange, 5.2:1 on white) | Primary buttons, links, active tab |
| `brand-dark` | `#9A3412` | Pressed state |
| `brand-50` | `#FFF4EE` | Icon tiles, selected rows |
| `brand-100` | `#FFE4D5` | Tile borders, highlights |
| `ink` | `#0F172A` | Headings and body text |
| `muted` | `#64748B` | Secondary text (4.8:1 on white) |
| `surface` | `#FFFFFF` | Cards, sheets |
| `page` | `#F8FAFC` | Screen background |
| `border` | `#E2E8F0` | 1 px card and input borders |
| `here` | `#16A34A` dot / `#15803D` text | "On campus" / "In circle" |
| `away` | `#94A3B8` | "Away" |
| `paused` | `#F59E0B` | "Sharing paused" |
| `danger` | `#DC2626` | Destructive actions only |

A matching dark theme (slate-900 page, slate-800 cards, brand lightened for contrast), with
every pair checked for WCAG AA contrast by a small test.

**Spacing** 4 / 8 / 12 / 16 / 24 / 32. **Radius** 12 (inputs, buttons), 16 (cards), 24 (sheets).
**Type** 28/34 display, 20/26 title, 16/24 body, 14/20 secondary, 12/16 caption. **Touch targets**
at least 44 × 44. **Motion** 150–250 ms fades and slides only, and none when the phone's
"reduce motion" setting is on.

### 4.2 Component kit

Rebuilt once, used everywhere: `Screen`, `Header`, `Card`, `IconTile`, `Button`
(primary / secondary / ghost / danger), `Input`, `ListRow`, `StatusPill`, `Avatar` /
`AvatarStack`, `Sheet` (capped height), `ConfirmDialog`, `EmptyState` (icon, one line, one
button), `Toast`, `Skeleton`, `Stat` (big number + label). The 18 existing sheets are rebuilt
on `Sheet`.

A dev-only **"Kitchen sink"** screen shows every component in light and dark, like ResumeX's
`graphics.html` does for its graphics. It doubles as the source for screenshot tests.

### 4.3 Navigation and screens

Four tabs: **Home · Circles · Friends · You**, with notifications as a bell in the header.

| Screen | One clear action | What it shows |
|---|---|---|
| **Onboarding (3 steps)** | Continue | 1. University email + code. 2. Location, with the plain-language explanation Google requires *before* the system prompt and a "keep BondhuKoi running" tip for Xiaomi/Oppo/Realme phones. 3. Add your first friend (share code or QR). |
| **Home** | Share my friend code (if no friends yet) | Your status pill (On campus / Away / Paused, with a Pause button), then friends grouped **On campus · In a circle · Away**. Never a map of people. |
| **Circles** | New circle | Circle cards: name, zone snapshot, avatar stack, "3 here now". |
| **Circle detail** | Invite people (admins) | Who's here now, then members; zone, Messenger link and settings behind a "…" menu. |
| **Friends** | Add friend | Requests at the top (only when there are some), then friends; each row opens a sheet with Watch, Block and Remove. |
| **Notifications** | — | Grouped by day; each item has its own action inline (Accept / Decline). |
| **You** | — | Profile, **Who can see me**, Privacy (pause, sleep hours, campus tracking, history), Devices, Help, Delete account. |
| **Admin: boundary** | Save | Moves to the web admin console (Phase 6); removed from the app. |

Every list has a designed empty state, a loading skeleton and an offline message. Copy is
written in short plain English and kept in one strings file, so a Bangla version (later) is
only a translation.

### 4.4 How the redesign is checked

- Screenshot tests of every screen, light and dark, on a small (360 dp) and a large phone.
- Accessibility: every control has a label, TalkBack reads each screen in a sensible
  order, and text still fits at 130% font size.
- A review of each screen against the rules above before it's called done.

**Pass:** no hex colours outside the tokens file, every screen redone and screenshot-tested,
and you're happy with how it looks on your own phone.

---

## Phase 5: Finish, cut or fix every feature

No screen says "Coming soon" at launch. Each feature is built properly or removed.

| Feature | Plan (D5) |
|---|---|
| **Push notifications** | **Build.** Expo push for friend requests, circle invites, watch requests and watch alerts (enter/exit), with a settings screen to choose which ones and quiet hours. Replaces polling. |
| **Activity feed** | **Build, small.** "Today in your circles": enter/exit events from people who share with you, only from the last 24 hours, respecting every privacy setting. |
| **Google sign-in** | **Build** through Supabase Auth, limited to the university domain (or cut if D1 means email-only is simpler). |
| **Block and report** | **Build** (Phase 2.5). |
| **QR friend invite** | **Build.** A QR of your friend code on the You screen, with scanning from Add friend. Cheap, and makes adding friends in person much faster. |
| **In-app chat** | **Cut.** Keep the circle's Messenger link. Chat is a large security and moderation surface. |
| **Places screens** (`app/place/*`) | **Cut.** They are hard-coded demos ("NSU Library") and nothing links to them. |
| **User 2FA, Login history, Handbook** | **Cut** from settings. The Devices screen covers the main need. |
| **Map screen** | **Keep for circle admins only,** to see and edit their circle's zone. It never shows people. |
| **WebSocket plugin** | **Remove** until something uses it; push notifications cover "live". |

Background location gets its own checklist: it works after a reboot, with battery saver on,
on Android 10 through 15, and when the app has been swiped away. It fails safe (reports
"Away", never a wrong "On campus").

**Pass:** every feature in the table is built or removed, and the background checklist
passes on at least three real phones, including one Xiaomi or Realme.

---

## Phase 6: Admin console

A web app on Cloudflare Pages (React + antd + Tailwind, the same stack as the ResumeX admin,
so the patterns carry over), calling `/api/admin/*` on the same API.

### The privacy line admins can't cross

**Admins never see where anyone is.** No live status, no enter/exit history, no "who is in
which circle right now". The console shows accounts, activity counts and reports, never
movement. The API enforces this, not just the screens: there is no admin route that returns
location data. This is also a selling point for the marketing ("not even we can see where you
are").

### Access

- Roles: **super-admin** (you) and **moderator**. The existing in-app `role: 'admin'` flag is
  replaced by an `admins` table.
- Required 2FA (TOTP) for every admin, 12-hour sessions, and sign-in only from verified emails.
- **Every admin action goes into an audit log** (who, what, when, before/after) that admins
  can read but not change.

### Tabs

| Tab | What it does |
|---|---|
| **Overview** | Sign-ups per day, active users today and this week, % with sharing on, circles created, push delivery rate, errors today, open reports, free-tier usage (database MB, storage, monthly users) against the limits. |
| **Sign-ups** | Newest first: university, verified or not, invite code used, first steps done (added a friend, joined a circle, granted background location). Filters by date, university, code. |
| **Users** | Search by name or email; each user shows a timeline (signed up, verified, sign-ins, friends added, circles joined, reports made or received, admin actions), devices count, and actions: suspend, ban, force sign-out, reset avatar, delete. **No location data.** |
| **Universities** | Add a university, its email domains and its campus boundary with the map editor (moved from the app), with a snapshot preview. |
| **Circles** | Name, size, created date, reports; rename or delete an abusive circle. Not its live members' status. |
| **Reports** | The moderation queue from the in-app Report button: status (new / looking / done), notes, actions on the user or circle, and an email reply. |
| **Feedback** | In-app feedback with the app version and screen; status and email reply. |
| **Errors** | App crashes and API 500s grouped by message with counts (from Sentry or a small table). |
| **Invites** | Invite codes for the beta: random codes (e.g. `BK-7KQ2XM`), a number of places, an optional email domain and an end date. |
| **Rate limits** | Every limit in the API, with its current values, editable. |
| **Site** | Maintenance mode (read-only with a banner), a banner message, "what's new", the minimum app version, sign-ups open or closed, and feature switches (feed, Google sign-in, watch). |
| **Audit log** | Every admin action, filterable. |
| **Alerts** | Emails and a bell for error spikes, a burst of sign-ups from one network, reports waiting more than 24 hours, and 70% of any free-tier limit. |

**Pass:** everything above works against staging, a moderator can't do super-admin
actions (tested), and no admin route returns location data (tested).

---

## Phase 7: Testing, end to end

Rigorous and full of edge cases, but fast: the whole backend suite should run in a few
minutes, like ResumeX's.

1. **Backend unit tests** (`node:test` or Vitest): the sleep window across midnight and time
   zones, friend-code generation, input schemas, the enter/exit transition logic, boundary
   validation (self-crossing polygons, fewer than 3 points, huge polygons).
2. **Ownership tests for every route:** for each route, user B tries user A's friend requests,
   watches, circles, boundaries and profile, and always gets 403 or 404. **A fuzz test** walks
   the route list, so a new route is covered automatically and fails CI if it has no rules.
3. **Integration tests** against the local Supabase (Docker, real PostGIS, real RLS):
   the full friend → circle → boundary → location check → notification flow, plus RLS
   tests that the anon key can read nothing.
4. **App component tests** (`jest-expo` + React Native Testing Library): every kit component,
   the auth context, the location status context, and the API client's refresh-and-retry.
5. **End-to-end on an Android emulator with Maestro,** in CI:
   - Sign up with a university email → verify → onboarding → grant location.
   - Add a friend by code and by QR; accept; watch; the watched person removes the watch.
   - Create a circle with a boundary, invite two friends, both accept.
   - **Move the emulator's location into the campus boundary with Maestro's `setLocation`
     / `travel`,** and check the friend's home screen shows "On campus" and gets the
     push; move out and check "Away".
   - Pause sharing, sleep hours, circle detection off: each one hides the status.
   - Block, report, delete account.
6. **Load test (k6) against staging:** 300 simulated students, each doing a location check
   every 10 minutes during class hours, plus a spike of everyone opening the app at 9 AM.
   Pass: no 5xx, p95 under 300 ms, flat memory, and the monthly Cloud Run usage projected
   inside the free tier.
7. **Abuse tests:** huge, deep and malformed bodies; 10,000-point polygons; racing
   accept/reject on the same request; many devices on one account; a deleted or banned user
   mid-session; clock skew.
8. **Security scans:** OWASP ZAP baseline scan against staging in CI, plus `npm audit`,
   CodeQL and gitleaks (from Phase 0).
9. **Real phones:** a written checklist run on at least three Android phones (one cheap, one
   Xiaomi/Realme/Oppo, one recent Pixel or Samsung) before each release.
10. **Closed test on Google Play** with 12+ testers for 14 days: Google requires this before
    a new personal developer account can publish to everyone.

**Pass:** CI runs all of 1–8 on every push and is green; the phone checklist passes.

---

## Phase 8: Play Store release

1. **Google Play developer account** ($25 once). New personal accounts must run a closed
   test with at least 12 testers for 14 days before going public, so plan the beta around it
   (Phase 9).
2. **Background location declaration:** Google reviews every app that asks for background
   location. You need a short video showing the feature (entering campus → friend sees
   it) and the explanation screen shown before the permission prompt (built in Phase 4).
3. **Data safety form:** approximate location collected, not stored, not shared, used for app
   functionality; email and name collected for the account; data encrypted in transit; users
   can request deletion.
4. **Privacy policy, terms and an account-deletion page** on the Cloudflare Pages site (the
   deletion page is a Play Store requirement).
5. **Store listing:** name, short and long description in English and Bangla, icon
   (512×512), feature graphic (1024×500) and 4–8 phone screenshots, all from Phase 9.
6. **Release flow:** EAS Build → internal testing → closed testing (the beta) → production,
   with staged rollout (10% → 50% → 100%).

**Pass:** the app is approved for production on Google Play.

---

## Phase 9: Marketing and launch

Built the same way as the ResumeX marketing kit (`docs/marketing/` there), and aimed at
university students (especially CSE students) in Bangladesh.

### 9.1 Positioning

**One line:** *See which friends are on campus, without anyone seeing where you are.*

What makes it different (use these in every post; only claim what's built):
1. **It never stores your location.** Your phone asks "am I inside campus?" and the answer
   is all that's kept.
2. **Not even the admins can see where you are.**
3. **You choose who sees what,** and you can see who can see you.
4. **Quiet at night:** nothing is shared from 6 PM to 6 AM unless you turn it on.
5. **Only students from your university** can join (if D1).
6. **Open source:** CSE students can read how it works (if D7).

**Never promise safety** ("keeps you safe") or anything the app doesn't do.

**Who you're talking to** (write each post for one of them):

| Person | Situation | What they care about |
|---|---|---|
| **First-year, "Tahmid", 19** | New, doesn't know where friends are between classes | "Is anyone on campus right now?" |
| **Final-year CSE, "Nusrat", 23** | Busy with thesis and lab; the group chat is chaos | Finding the thesis group without 20 messages |
| **Club organiser, "Rafi", 21** | Runs a CSE club event | Seeing who's arrived at the venue |
| **Privacy-conscious, "Ayesha", 22** | Hates location apps | That nobody sees where she is, including the app |

### 9.2 The marketing kit (files to create in `docs/marketing/`)

| File | What it is |
|---|---|
| `README.md` | Index of the kit, like ResumeX's |
| `marketing-plan.md` | Audience, channels, launch week, the 90-day plan, ambassadors, metrics |
| `facebook-posts.md` | Page setup text plus ~30 ready posts in English and Bangla |
| `outreach-templates.md` | Messages to club presidents, batch group admins, CSE societies, and replies to common comments ("is this a stalking app?") |
| `beta-launch.md` | The first ~80 students: invite codes, a four-week sequence, invite messages (EN/BN), the daily admin check |
| `store-listing.md` | Play Store text in English and Bangla, keywords, and what each screenshot shows |
| `privacy-explainer.md` | A plain-language "how BondhuKoi protects you" page, for the website and a carousel post |
| `graphics/graphics.html` | Every post graphic as HTML (1080×1080 posts, a 1640×624 cover, a 720×720 profile picture, the 1024×500 Play feature graphic), exported with Chrome's "Capture node screenshot", as in ResumeX |
| `videos/README.md` | Each clip with its post copy |

### 9.3 Screenshots and videos from the real app

- **A demo dataset:** a seed script with sample students (for example "Nusrat Jahan, CSE"),
  circles ("Thesis group", "CSE Society") and a campus boundary, on staging only.
- **Screenshots:** Maestro flows open each screen on the emulator with the demo data and
  take screenshots at 1080×2400, light and dark. A `frames.html` page puts them in phone
  frames on the brand background (like ResumeX's `mobile.jpg`) for the store and posts.
- **Videos:** Maestro drives the same flows while `adb screenrecord` records. ffmpeg cuts
  them to the same four shapes ResumeX uses: square 1080×1080, portrait 1080×1350, story
  1080×1920 and a 960×540 GIF for the README. Silent, with on-screen captions. Scenes:
  - *"On campus"*: the emulator moves into campus, a friend's phone flips to "On campus".
  - *"Who can see me"*: the privacy screen, and removing a watcher in one tap.
  - *"Quiet at night"*: the clock passes 6 PM and sharing goes quiet.
  - *"Make a circle"*: draw the library as a zone, invite two friends.
  - *"Add by QR"*: two phones, one scan.
- A script (`docs/marketing/video/record.sh`) re-records everything after a redesign.

### 9.4 Launch sequence

1. **Before anything:** the Facebook page (name, bio, cover, profile picture from
   `graphics/`), three posts published so the page isn't empty, a Google Sheet for metrics, an
   invite code per channel in the admin console.
2. **Closed beta (weeks 1–4, doubles as Google's required 14-day closed test):** ~80 CSE
   students from your university, invited 20 at a time by invite code. The same four-week
   rhythm as the ResumeX beta: teaser → invites → a clip every few days → "what we fixed
   this week" → a 5-question feedback form on day 14 → thank-you post with numbers.
3. **"Break it" week:** a post for CSE students inviting them to find security bugs (read
   `SECURITY.md`, report privately, get on the thank-you list). It builds trust and gets
   the app tested by exactly the people who'd otherwise poke at it quietly.
4. **Public launch week:** founder story on your personal profile (it reaches further than
   the page), batch and department groups, 5 club presidents, the Bangla post, the "On
   campus" reel.
5. **Days 31–90:** campus ambassadors at 2–3 more universities (each needs its boundary
   drawn and email domain added in the admin console first), club partnerships around
   events, one short video a week.

### 9.5 Metrics (weekly, in the sheet)

Sign-ups · verified · **activated** (added a friend and joined a circle within 3 days) · % with
sharing on · weekly active users · day-7 and day-30 retention · crash-free sessions · reports
opened · Play Store rating · the channel each sign-up came from (invite codes).

**Pass:** the kit files exist, the store listing is live, and the beta is running.

---

## Order and effort

Phases 0–3 make it safe, 4–6 make it good, 7–9 ship it. Each phase is committed and
reported separately. The testing in Phase 7 grows alongside each phase rather than being
left to the end.

| Phase | Rough effort (working days) |
|---|---|
| 0. Foundations | 2–3 |
| 1. Known security holes | 2–3 |
| 2. Security architecture (incl. Supabase Auth) | 5–7 |
| 3. Hosting and operations | 2–3 |
| 4. Design system and redesign | 7–10 |
| 5. Finish, cut or fix features | 5–7 |
| 6. Admin console | 5–7 |
| 7. Testing (the parts not done alongside) | 4–6 |
| 8. Play Store release | 2–3, plus Google's 14-day closed test and review time |
| 9. Marketing kit and launch | 3–5 |
| **Total** | **about 37–54 working days**, plus the 14-day closed test running alongside Phase 9 |

The quickest safe path to real users is 0 → 1 → 2 → 3 → 7 (backend parts) → 4 → 5 → 6 →
7 (E2E) → 8 → 9.

---

## Decision log

| Date | Decision | By |
|---|---|---|
| 2026-09-30 | No money side: no plans, credits, payments or pricing pages. | Owner |
| 2026-09-30 | Hosting: Supabase Free + Cloud Run + Cloudflare Pages (Mumbai region). Heroku guide retired. | Proposed |
| 2026-09-30 | Design follows ResumeX's principles with a different brand colour; the "Digital Sanctuary" system is retired. | Owner (principles), proposed (details) |
| 2026-09-30 | Admins never see location data; enforced in the API. | Proposed |
