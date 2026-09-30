# Releasing to Google Play

Android first (decision D3). Budget: **$25 once** for the Google Play developer account.
Builds use EAS (free plan: 15 Android builds a month).

## 1. One-time setup

1. **Expo account and project:** `npm i -g eas-cli && eas login`, then in
   `frontend/BondhuKoiApp`: `eas init` (writes the project id; set it as `EAS_PROJECT_ID`).
2. **Secrets for builds** (<https://expo.dev> → project → Environment variables), for
   `preview` and `production`: `EXPO_PUBLIC_API_URL` (the Cloud Run URL, `https://…`),
   `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `GOOGLE_MAPS_API_KEY`,
   `EAS_PROJECT_ID`. Release builds refuse a non-HTTPS API.
3. **Google Maps key:** Google Cloud → APIs & Services → Credentials → Create API key →
   restrict to **Android apps**, package `com.omi.bondhukoi`, and the SHA-1 of the upload
   key (EAS → Credentials shows it) and of Google Play's app signing key (Play Console →
   Setup → App signing). Enable only **Maps SDK for Android**.
4. **Google Play developer account:** <https://play.google.com/console/signup> ($25).
   Personal accounts must run a **closed test with at least 12 testers for 14 days** before
   production. Plan the beta for this (docs/marketing/beta-launch.md).

## 2. Build and test

```bash
cd frontend/BondhuKoiApp
eas build -p android --profile preview      # an APK to install on your phone
eas build -p android --profile production   # the AAB for Play
```

Before every release, run the phone checklist (docs/testing.md → Real phones).

## 3. Play Console

**Create app:** name BondhuKoi, app (not game), free.

**App content** (Policy → App content), answer exactly:

| Question | Answer |
|---|---|
| Privacy policy | `https://bondhukoi.pages.dev/privacy` |
| App access | Restricted: give a test account (a university email you control) and its password, and explain the invite code if invites are on |
| Ads | No ads |
| Content rating | Questionnaire: social/communication features, users can interact, shares location with other users (approximate status only) |
| Target audience | 18 and over (tick 16–17 too only if you want first-year students under 18) |
| News app | No |
| Data safety | See below |
| Government app | No |
| Account deletion | Yes, in the app and at `https://bondhukoi.pages.dev/delete-account` |

**Data safety answers:**

| Data type | Collected | Shared | Purpose | Optional? |
|---|---|---|---|---|
| Location: approximate | Yes | No | App functionality | Yes (can be turned off) |
| Location: precise | Yes | No | App functionality | Yes |
| Personal info: name | Yes | No | App functionality, account management | No |
| Personal info: email address | Yes | No | Account management | No |
| Photos | Yes (profile photo) | No | App functionality | Yes |
| App activity: other user-generated content (circle names, reports, feedback) | Yes | No | App functionality | Yes |
| App info and performance: crash logs | Yes | No | Analytics | No |
| Device or other IDs (push token) | Yes | No | App functionality | Yes |

Also: data is encrypted in transit; users can request deletion. Location is *processed*
and not stored, but Play still counts it as "collected": say yes.

**Background location declaration** (Policy → App content → Sensitive permissions →
Location permissions). Google reviews this carefully:

- *Feature that uses background location:* "Shows the user's chosen friends and circle
  members whether the user is on campus or inside a place they set up together, without
  opening the app. The app registers geofences around those zones and sends one reading
  when the user crosses a zone edge; the server stores only whether they are inside."
- *Why foreground-only isn't enough:* students arrive on campus without opening the app;
  the status would otherwise be wrong most of the day.
- *Video (30 s or less, unlisted YouTube link):* record on a phone: onboarding explanation
  screen → "Continue" → system prompt → "Allow all the time" choice → a friend's phone
  showing "On campus" after arrival. Show the in-app disclosure text clearly: Google
  requires a prominent disclosure **before** the permission prompt, which onboarding has.

**Store listing:** texts and graphics are in `docs/marketing/store-listing.md` and
`docs/marketing/graphics/`.

## 4. Tracks

1. **Internal testing** (you and up to 100 testers, instant): upload the AAB, test.
2. **Closed testing** (the beta, 12+ testers for 14 days): add testers by email or a Google
   Group; share the opt-in link with the invite code.
3. **Production:** staged rollout 10% → 50% → 100% over a few days, watching Sentry and
   the admin console's reports.

## 5. Updates

- Small JS-only fixes: `eas update --branch production` (runtime version is the app
  version, so only compatible builds get it).
- Anything native, or a security fix that old versions must not keep: new build, then
  raise **Admin → Settings → Minimum app version** so old versions ask to update.
