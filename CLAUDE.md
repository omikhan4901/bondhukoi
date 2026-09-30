# Working on BondhuKoi

BondhuKoi shows university students which friends are on campus or in a shared zone, without
anyone (other students, circle admins or app admins) ever seeing where they are. The plan
for the current revamp is `docs/REVAMP_PLAN.md`: read it before building anything, work in
its phase order, and log decisions in its decision log. There is **no money side**: no plans,
credits, payments or pricing.

## Layout

- `backend/`: Fastify API (Node 22, ES modules). Talks to Postgres directly with `pg`,
  to Supabase Storage for images, and verifies Supabase Auth JWTs.
- `supabase/`: the database as code: `migrations/` (applied in order, never edited after
  they ship; add a new one instead) and `config.toml` for the local stack.
- `frontend/BondhuKoiApp/`: Expo React Native app (Expo Router, Tamagui).
- `admin/`: the web admin console (Phase 6).
- `docs/`: plan, design rules, security review, marketing kit.

## Features must work together

When adding or changing a feature, work out how it connects to what exists and wire it up
without being asked:

- **Privacy:** every piece of presence data (on campus, in a circle, enter/exit events) is
  shown only to people the owner allowed, and never while sharing is paused, during their
  quiet hours, or to someone they blocked. Admin routes never return presence data.
- **Ownership:** every route loads records by id **and** the signed-in user; another user's
  id is a 404. Add the route to the ownership tests in `backend/test/`.
- **Rate limits:** every new route gets a rate limit from `backend/src/lib/limits.js`.
- **Validation:** every route has a JSON schema for body, params and query
  (`additionalProperties: false`).
- **Admin console:** anything an admin could reasonably want to change (limits, switches,
  banner, minimum app version) is a setting, not a constant. Every admin action is audited.
- **Blocking:** a blocked person can't find, request, watch or see the blocker.
- **Account deletion:** anything new a user owns is deleted with the account.
- **Public pages and store listing:** update the privacy policy and the Play Store data
  safety answers when what the app collects changes.
- **Tests:** add backend tests for every route and rule; check user-facing changes on a
  real screen (emulator or phone).

## Look and feel (details in `docs/design.md`)

Calm, uncluttered screens with little text and **one clear next action** each; details
appear only when needed. White and light-slate surfaces, 1 px bordered cards, small
brand-tinted icon tiles, one accent colour (koi orange). No gradients, glows,
glassmorphism or illustrated mock-ups. Sheets never fill the screen. Colours, spacing and
type come only from the theme tokens; no hex values in screens.

## Conventions

- Commit as the owner, with no AI co-author lines and no model names:
  `git -c user.name=omikhan4901 -c user.email=mehboobehsankhan@gmail.com commit ...`
- Work on and push to `main`.
- Never commit secrets (Supabase keys, database URLs, JWT secrets, Google keys).
- Before pushing: `npm test` and `npm run lint` in `backend/`; `npm run lint` in the app.

## Working with the owner

- The owner put me in charge of the revamp: decide details myself, log them in the plan,
  and only ask about things that change the product for users or cost money.
- The owner isn't a cloud-console expert: give exact click paths or commands, and always
  the least-privilege option.
- Tests are rigorous and edge-case heavy but fast. Backend tests run against a throwaway
  PostGIS container (`npm run db:test` in `backend/`), never a real Supabase project.
