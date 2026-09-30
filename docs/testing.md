# Testing

| Layer | What | Where | Runs |
|---|---|---|---|
| API unit | Quiet hours in Bangladesh time, polygons, presence rules, config | `backend/test/unit.test.js` | CI, every push |
| API routes | Every route: sign-in, ownership, privacy rules, limits, admin | `backend/test/*.test.js` | CI, every push |
| API fuzz | Walks every route: sign-in required, strangers can't read or change anything, junk never causes a 500 | `backend/test/fuzz.test.js` | CI, every push |
| Database | Sign-up rules, invite codes, RLS lock-down, retention clean-up | `backend/test/signup.test.js`, `misc.test.js` | CI, every push |
| App unit | Code parsing, formatting, presence labels, zone circles, colour contrast | `frontend/BondhuKoiApp/__tests__/` | CI, every push |
| App bundle | The whole app compiles (web build) | CI `app` job | CI, every push |
| Admin console | Lint and production build | CI `admin` job | CI, every push |
| End to end | Sign in, add a friend, arrive on campus (fake GPS), pause, draw a circle zone, privacy screens, delete account | `e2e/flows/` (Maestro) | Before each release, on an emulator |
| Load | 300 students in the 9 AM rush against staging | `e2e/load/presence.js` (k6) | Before the beta and after big changes |
| Real phones | The checklist below | By hand | Before each release |

## Run the API tests

```bash
cd backend && npm test      # needs Docker; starts a PostGIS container called bondhukoi-testdb
```

## Run the end-to-end flows

Needs an Android emulator, [Maestro](https://maestro.mobile.dev), the Supabase CLI and a
preview build installed on the emulator.

```bash
npx supabase start                        # local database, auth and storage
cd backend && npm run dev                 # the API on :3000, pointed at the local stack
cd frontend/BondhuKoiApp && eas build -p android --profile preview --local   # then install the APK
e2e/run.sh
```

`run.sh` makes two fresh test students, puts one on campus, and runs the flows with
`setLocation` moving the emulator in and out of the NSU zone. **Status:** written, not yet
run (this repository's cloud environment can't run an Android emulator). Run them once
on your machine and fix selectors if any screen text changed.

## Load test

Create `USERS` test accounts on **staging** (never production), then:

```bash
k6 run -e SUPABASE_URL=… -e ANON_KEY=… -e API=https://<staging-api> -e DOMAIN=<test domain> \
       -e LOAD_PASSWORD=… -e USERS=300 e2e/load/presence.js
```

Pass: under 1% failures, p95 under 300 ms for reads and 400 ms for location checks, flat
memory in Cloud Run metrics, and the month's projected usage inside the free tier.

## Real phones (before every release)

Use at least three phones: one cheap Android (2–3 GB RAM), one Xiaomi/Redmi, Realme or
Oppo (they stop background apps), and one recent Samsung or Pixel.

- [ ] Fresh install → sign up with a university email → the code arrives within a minute.
- [ ] Onboarding: the explanation shows **before** the location prompt; "Allow all the
      time" can be chosen on Android 11+ (it opens Settings).
- [ ] Walk onto campus with the app closed: a friend's phone shows "On campus" within a
      couple of minutes. Walk off: "Away".
- [ ] Same with the phone restarted since the last open.
- [ ] Same with battery saver on. If it fails, the Help screen's battery tip fixes it.
- [ ] Draw a circle zone: tap corners, close on the first corner, save; the cover picture
      shows the zone on the circle card.
- [ ] Pause sharing: a friend sees "Not sharing" at once.
- [ ] Quiet hours: set to the current hour; a friend sees "Not sharing".
- [ ] Push: a friend request and an arrival alert arrive with the app closed.
- [ ] Scan a friend's QR code.
- [ ] Dark mode and 130% font size: nothing is cut off.
- [ ] TalkBack reads Home in a sensible order.
- [ ] Offline: open the app in airplane mode: a clear message, no crash.
- [ ] Sign out everywhere from one phone signs out the other.
- [ ] Delete account.
