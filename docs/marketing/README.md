# BondhuKoi marketing kit

Everything for the NSU beta and the public launch, built like the ResumeX kit. Only claim
what the app does today; never publish made-up quotes or numbers.

| Start here | |
|---|---|
| 1. [Marketing plan](marketing-plan.md) | Strategy (dense, campus by campus), audience, launch week, 90 days, metrics |
| 2. [Beta launch](beta-launch.md) | The first 80 students: set-up clicks, four-week sequence, invite messages (English and Bangla), daily admin check |
| 3. [Facebook posts](facebook-posts.md) | Page setup text plus 16 ready posts in English and Bangla |
| 4. [Outreach templates](outreach-templates.md) | Group admins, clubs, ambassadors, university offices, and replies to hard questions ("isn't this a stalking app?") |
| 5. [Store listing](store-listing.md) | Google Play texts, graphics and screenshot captions |
| 6. [Videos](videos/README.md) | Short clips to record from the real app, with post copy |

## Graphics

All in [`graphics/`](graphics), built from [`graphics/graphics.html`](graphics/graphics.html)
with real screens of the app (sample students, no real people).

| File | Size | Use it for |
|---|---|---|
| `01-launch.png` | 1080×1080 | Launch post, founder story |
| `02-what-friends-see.png` | 1080×1080 | Privacy post (EN and Bangla B2) |
| `03-circles.png` | 1080×1080 | Circles post |
| `04-privacy-1.png` … `04-privacy-5.png` | 1080×1080 | The privacy carousel |
| `05-quiet.png` | 1080×1080 | Quiet hours |
| `06-who-can-see-me.png` | 1080×1080 | "Who can see me" |
| `07-break-it.png` | 1080×1080 | "Break it" week for CSE students |
| `08-alerts.png` | 1080×1080 | Arrival alerts |
| `09-ambassadors.png` | 1080×1080 | Ambassador recruitment |
| `10-bangla.png` | 1080×1080 | Bangla launch post |
| `cover.png` | 1640×624 | Facebook cover |
| `profile.png` | 720×720 | Facebook profile picture |
| `play-icon.png` | 512×512 | Google Play icon |
| `play-feature.png` | 1024×500 | Google Play feature graphic |
| `play-shot-1.png` … `play-shot-6.png` | 1080×1920 | Google Play screenshots |

### Editing and re-exporting

1. Edit the text in `graphics.html` (open it in Chrome to see every graphic).
2. After a design change, re-take the app screens: build the web demo
   (`EXPO_PUBLIC_DEMO=1 npx expo export --platform web` in `frontend/BondhuKoiApp`), serve
   it, and save 390×800 screenshots at 3× into `graphics/shots/` (home, circle, friend,
   visibility, privacy, add-friend, notifications, circles).
3. Export: `node graphics/export.mjs` (needs `playwright-core`), or in Chrome DevTools
   right-click a `<section>` → *Capture node screenshot*.

Fonts (Inter, Plus Jakarta Sans, Noto Sans Bengali) are bundled in `graphics/fonts/` under
the SIL Open Font License, so the Bangla graphic renders anywhere.

The web demo can't show maps, so circle cover pictures appear only in screenshots taken on
a phone. For the Play Store, you may swap `shots/circle.jpg` for a phone screenshot of a
circle with its map cover.
