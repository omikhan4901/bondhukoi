# Threat model

BondhuKoi tells students whether friends are on campus. The thing to protect is **where
a student is**, and the people most likely to try to learn it are people close to them.

## What we protect

1. **Whereabouts:** whether someone is on campus or in a circle's place, now or before.
2. **Who knows whom:** friends, circles and watches.
3. **Account details:** university email, name, photo.

## Who might try, and what stops them

| Who | What they might try | What stops them | Tested in |
|---|---|---|---|
| A curious classmate with the API | Read other people's data by changing ids | Ownership checks on every route; fuzz test over all routes | `fuzz.test.js` |
| The same classmate with the app's public key | Query the database directly | RLS on, no grants for `anon`/`authenticated`, Data API off for `public` | `signup.test.js` |
| An ex or a stalker who is a friend | Watch someone without them knowing | Watches need the watched person's yes; "Who can see me" lists every watcher; either side ends it | `friends.test.js` |
| The same person after being removed | Keep seeing status | Unfriending ends watches; blocking ends everything and hides them in shared circles | `friends.test.js`, `circles.test.js` |
| A circle member | Learn about circles they're not in | Presence shows only circles both people are in; watch alerts likewise | `presence.test.js` |
| Someone outside the university | Make an account to watch students | University email only, checked in the database | `signup.test.js` |
| A banned person | Come back | One university email each; suspended accounts refused on every request | `auth.test.js`, `admin.test.js` |
| A leaked or rogue admin | See where people are | No admin route returns presence; 2FA; audit log | `admin.test.js` |
| A stolen phone | Use the signed-in app | "Sign out on every device" from another phone revokes tokens | `auth.test.js` |
| Someone flooding the API | Run up costs or knock it over | Per-user limits, body limits, Cloud Run max instances, $1 budget alert | `presence.test.js`, `misc.test.js` |
| Someone faking GPS | Pretend to be on campus | Low impact (only fools their friends); accepted | — |

## What we deliberately don't keep

- Coordinates: used for two spatial queries and dropped. Never in the database or logs.
- Place history beyond enter/exit events: pruned after 24 hours (or 30 days by choice).
- Presence older than 12 hours: cleared by a scheduled job.

## Accepted risks

- **Friends can infer patterns** from "on campus" over time. That's the product; quiet
  hours, pausing and per-circle detection let each student limit it.
- **GPS spoofing** is possible and not detected.
- **No user 2FA in v1.** Admins must use it.
