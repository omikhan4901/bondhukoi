# Beta launch: the first 80 students

A step-by-step plan for the invite-only beta at NSU (CSE first), done with features that
already exist. It also covers Google Play's rule for new developer accounts: a closed test
with at least 12 testers for 14 days before going public.

## 1. Set up (about an hour, the day before)

**Google Play Console → Testing → Closed testing:** create a track, upload the production
build, and add testers through a Google Group (e.g. `bondhukoi-beta@googlegroups.com`) so
anyone who joins the group can install. Copy the opt-in link.

**Admin console → Universities:** check NSU's email domain and that its campus boundary is
drawn (Draw boundary → click the corners → click the first corner to close → Save).

**Admin console → Invites → New invite code:**
- Places: **90** (80 students, you and a few spares) · University: **NSU** ·
  Ends: 4 weeks from launch · Note: `Beta 1`.
- It makes a random code like `BK-7KQ2XM`. Random codes can't be guessed and passed around.

**Admin console → Settings:**
- Sign-ups: Open **on**, Invite code required **on**.
- Banner: `Welcome to the beta! Tell us anything that feels off: You → Help and feedback.`

**Backups:** run Actions → Database backup once, so you have a copy from before the beta.

Then sign up yourself with a fresh test account on a second phone and check the whole flow.

## 2. The four weeks

| When | What | Where |
|---|---|---|
| Day −2 | Teaser: "Building something for our batch: see which friends are on campus, without anyone seeing where you are. 80 spots on Sunday." | Your profile, batch group |
| Day 0 | Send invites (below), 20 at a time, so you can answer questions. | Messenger, WhatsApp |
| Day 0 | Watch Admin → Sign-ups: who verified, who added a friend, who joined a circle. | Admin |
| Day 1 | Make circles for your own groups (thesis, lab, club) and invite people. Circles give people a reason to stay. | App |
| Day 2 | Message anyone who signed up but has no friend yet (Sign-ups, first steps empty). One personal line: "Add me, my code is …". | Messenger |
| Day 3 | Post the "Walk in, friends see On campus" clip. | Group, page |
| Day 5 | Read Admin → Feedback and Reports. Fix quick things. Reply to everyone. | Admin |
| Day 7 | "What we fixed this week" round-up, 3 bullets. | Group |
| Day 10 | Privacy explainer carousel. | Page |
| Day 14 | Google Form, 5 questions (below). Closed test hits 14 days: apply for production access. | Group |
| Day 17–21 | "Break it" week for CSE students (marketing plan §3). | CSE groups |
| Day 28 | Thank-you post with real numbers. Turn "Invite code required" off when you're ready to launch. | Page |

**Feedback form (5 questions):** What do you use BondhuKoi for? What confused you? Did
your status update when you arrived on campus without opening the app (yes / no /
sometimes, and which phone)? What's missing? Would you tell a friend about it (0–10)?

## 3. Invite messages

**English (Messenger / WhatsApp)**

> Hey [name]! I built BondhuKoi: it shows which friends are on campus, without anyone
> seeing where you are (it never stores your location, and the code is open).
> I'm inviting 80 people from our batch to the beta. Android only for now:
> 1) Join the tester group: [Google Group link]
> 2) Install: [Play opt-in link]
> 3) Sign up with your @northsouth.edu email and the code **[BK-XXXXXX]**
> Then add me, my code is [your friend code]. Tell me anything that's confusing 🙏

**Bangla**

> হাই [name]! আমি BondhuKoi বানিয়েছি: কোন বন্ধু এখন ক্যাম্পাসে আছে দেখা যায়, কিন্তু কেউ
> তোমার লোকেশন দেখতে পায় না (লোকেশন কখনো সেভ হয় না, কোডও ওপেন)।
> আমাদের ব্যাচের ৮০ জনকে বেটাতে ইনভাইট করছি। আপাতত শুধু Android:
> ১) টেস্টার গ্রুপে জয়েন করো: [Google Group link]
> ২) ইনস্টল করো: [Play opt-in link]
> ৩) তোমার @northsouth.edu ইমেইল আর কোড **[BK-XXXXXX]** দিয়ে সাইন আপ করো
> তারপর আমাকে অ্যাড করো, আমার কোড [your friend code]। কোথাও কনফিউজিং লাগলে জানিও 🙏

**Group post (pin it)**

> 🟠 80 spots in the BondhuKoi beta, for NSU students.
> See which friends are on campus right now, and make circles for your thesis lab or club
> room. Only "on campus" or "away", never a dot on a map; quiet from 6 PM to 6 AM.
> Android · invite code **[BK-XXXXXX]** · steps in the first comment 👇

## 4. What to check every day (10 minutes)

1. **Admin → Reports:** anything about stalking or harassment first. Suspend if someone's
   at risk, then look into it.
2. **Admin → Feedback:** reply by email to everyone within a day.
3. **Admin → Sign-ups:** anyone stuck with no friend? Message them.
4. **Admin → Overview:** active students, sharing, database size.
5. Sentry: any new crash? Fix the top one first.
