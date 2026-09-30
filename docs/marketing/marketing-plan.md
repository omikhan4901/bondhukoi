# BondhuKoi marketing plan (first 90 days)

A practical plan for getting BondhuKoi its first few thousand students, written in the
same way as the ResumeX plan and for the same person: someone who hasn't done marketing
before. Everything here costs little or nothing.

## The one-sentence strategy

**Start with one batch at one university (NSU CSE), make the app genuinely useful there
(a friend graph only works when your friends are on it), then spread campus by campus
through clubs and ambassadors, leading every message with privacy.**

A friend-finder is only useful when your friends use it. So unlike ResumeX, BondhuKoi grows
**densely, one group at a time**, not broadly. 80 students in one department beat 800
scattered across the country.

---

## Who you're talking to

| Person | Situation | What they care about | What to show them |
|---|---|---|---|
| **First-year, "Tahmid", 19** | New, doesn't know where friends are between classes | "Is anyone on campus right now?" | Home: "On campus now · 3" |
| **Final-year CSE, "Nusrat", 23** | Thesis group, lab hours, chaotic group chat | Knowing who's at the lab without 20 messages | Circles with a zone, "Here now" |
| **Club organiser, "Rafi", 21** | Runs events | Who has arrived at the venue | A circle for the event place |
| **Privacy-conscious, "Ayesha", 22** | Hates location apps | That nobody sees where she is, including the app | "Who can see me", quiet hours, open code |
| **The CSE sceptic, "Arif", 24** | Knows how apps leak data | Whether the claims are true | The public code, the security review, "break it" week |

Write every post for **one** of them.

---

## What makes BondhuKoi different (use these everywhere)

1. **It never stores your location.** Only "on campus" or "away". Never a dot on a map.
2. **Not even the admins can see where you are.** Enforced in the code and tested.
3. **You choose who sees what,** and one screen shows everyone who can see you.
4. **Quiet at night:** nothing is shared from 6 PM to 6 AM unless you want.
5. **Only students from your university** can join.
6. **Open source:** CSE students can read exactly how it works.

**Never promise safety** ("keeps you safe", "know where your friends are"). Promise: "see
who's on campus", "find your friends between classes", "private by design".

**Never publish made-up reviews or numbers.** Get real ones from the beta.

---

## 1. Before you post anything (about 3 hours)

### Product
- [ ] Production is live (docs/deploy.md) and the app is in Google Play **closed testing**.
- [ ] You've done the real-phone checklist (docs/testing.md) on at least two phones.
- [ ] The NSU campus boundary is drawn (Admin → Universities).
- [ ] The website is live with the privacy policy, with omi@omikhan.com as the contact email.

### Facebook page
- [ ] Create a Page named **BondhuKoi**, category *App page* or *Software*.
- [ ] Username `@bondhukoiapp` (or the closest available).
- [ ] Profile picture `graphics/profile.png`, cover `graphics/cover.png`.
- [ ] Bio and About from [facebook-posts.md](facebook-posts.md#page-setup).
- [ ] Publish posts 3, 4 and 5 **before** inviting anyone, so the page isn't empty.

### Tracking
- [ ] A Google Sheet with the columns in [Metrics](#metrics-to-track-weekly).
- [ ] An invite code per channel (Admin → Invites): `BK-…` codes are random; write in
      the note which channel each is for.

---

## 2. The closed beta (weeks 1–4)

Run [beta-launch.md](beta-launch.md): about 80 NSU CSE students, invite codes, a four-week
rhythm. It doubles as Google Play's required 14-day closed test with 12+ testers.

**Beta goal:** 60+ students activated (a friend and a circle), a week-2 retention you're
happy with, and 5 real quotes you can use (with permission).

---

## 3. "Break it" week (week 3 of the beta)

CSE students will poke at the API anyway. Invite them to, publicly:

- Post 8 on your profile and in CSE groups: the code is open, here's the security review,
  report problems privately, you'll be thanked in `SECURITY.md`.
- Fix what's reported fast and post a "what you found and what we fixed" round-up.

This builds more trust with a CSE audience than any ad.

---

## 4. Public launch week (after the beta, once on Google Play)

| Day | What to do |
|---|---|
| **Day 1 (8–10 pm)** | Founder story (post 1) on **your personal profile**; share the page's launch post (post 2). Ask 10 beta students to comment in the first hour. |
| **Day 2** | NSU department, batch and club groups: the group version of the launch post. Reply to everything. |
| **Day 3** | Page: the privacy explainer carousel (post 5). DM 5 club presidents (outreach file). |
| **Day 4** | Reel: `videos/on-campus-story.mp4` ("Walk in, friends see 'On campus'"). |
| **Day 5** | Page: Bangla launch post (B1). |
| **Day 7** | Review the sheet: which post brought sign-ups (by invite code)? Do more of that. |

**Launch-week goal:** 300 NSU sign-ups, and every comment answered.

---

## 5. Days 31–90: campus by campus

- **Ambassadors at 2–3 more universities** (BRACU, IUB, EWU…). For each: add the
  university and its email domain, **draw its campus boundary** (Admin → Universities),
  create an invite code with its university set, and recruit 1–2 ambassadors (post 10).
- **Clubs:** a circle is perfect for a club room or event venue. Offer club presidents a
  5-minute demo at their next meeting.
- **Short videos weekly:** screen recordings of the real app (videos/README.md).
- **Semester start** (orientation weeks) is the best moment of the year: new students
  want to find people. Plan a push for it.

**Targets (guesses, adjust after month one):** 500 users by day 30, 1,500 by day 60,
3,000 by day 90, with most of them in dense groups.

---

## Weekly routine (about 3–4 hours)

| Day | Page post | Other |
|---|---|---|
| **Sunday** | Feature post (circles, alerts, QR) | 2 group posts |
| **Tuesday** | Privacy post (one fact, plainly) | Reply to all messages; Admin → Reports and Feedback |
| **Thursday** | Engagement post (question, poll) | 1 club DM |
| **Saturday** | Bangla post or a student's quote | Fill in the metrics sheet |

Best times: **8–10 pm Bangladesh time**; check Page Insights after 3 weeks.

---

## Facebook groups without getting banned

Same rules as ResumeX: read the rules, lead with something useful, 2–3 groups a day with
different text, answer every comment, link in the first comment if the group punishes links.

---

## Paid ads

Not before the public launch, and only after an organic post clearly works. BondhuKoi is
local by nature: target **one university's area** (a 2 km radius around campus), ages
18–25, ৳300 a day for 5 days, with the best organic creative. Use a separate invite code
so you can count sign-ups from ads.

---

## Metrics to track weekly

| Week | New students | Activated (friend + circle) | Weekly active | % sharing on | Circles created | Reports | Page followers | Best post | Sign-ups by code |
|---|---|---|---|---|---|---|---|---|---|

Everything but the Facebook columns is in the admin console (Overview and Sign-ups).

**The number that matters most: activated students per week.** A sign-up without a
friend on the app is a lost user; if activation is low, fix onboarding before marketing more.
