# BondhuKoi design rules

The app follows the same principles as ResumeX, adapted for a phone and with its own
colour. These rules replace the old "Digital Sanctuary" and "Midnight Sanctuary" systems.

## Principles

1. **One clear next action per screen.** If a screen has two equally loud buttons, one of
   them is in the wrong place.
2. **Little text.** A title, at most one line of explanation, then the content. Details
   appear when tapped (progressive disclosure), not up front.
3. **Status first.** The most important thing (am I sharing? who's on campus?) is at the
   top in a big, glanceable form. Detail is one tap away.
4. **Quiet surfaces.** White cards with a 1 px border on a very light slate page. Small
   brand-tinted icon tiles. No gradients, glows, glass blur, drop-shadow stacks or
   illustrated mock-ups.
5. **One accent colour,** used sparingly: the main button, the active tab, key numbers.
6. **Honest states.** Every list has a designed empty state, a loading skeleton and an
   offline message. Never a blank screen or a spinner alone.
7. **Sheets never fill the screen.** Cap the height at 85% and scroll inside.
8. **Plain words.** "On campus", "Away", "Sharing paused". Not "Sanctuary" or "Vault".

## Tokens (`src/theme/tokens.js`)

| Token | Light | Dark | Use |
|---|---|---|---|
| `brand` | `#C2410C` | `#FB923C` | Primary buttons, links, active tab |
| `brandPressed` | `#9A3412` | `#FDBA74` | Pressed primary |
| `brandSoft` | `#FFF4EE` | `#2A1508` | Icon tiles, selected rows |
| `brandLine` | `#FFE4D5` | `#7C2D12` | Icon tile borders |
| `ink` | `#0F172A` | `#F1F5F9` | Headings and body text |
| `muted` | `#5B6B7F` | `#94A3B8` | Secondary text |
| `page` | `#F8FAFC` | `#0B1220` | Screen background |
| `surface` | `#FFFFFF` | `#111A2E` | Cards, sheets, inputs |
| `line` | `#E2E8F0` | `#1E293B` | Borders |
| `here` | `#15803D` | `#4ADE80` | "On campus" / "Here" text |
| `hereDot` | `#16A34A` | `#22C55E` | Status dots |
| `away` | `#94A3B8` | `#64748B` | "Away" |
| `paused` | `#B45309` | `#FBBF24` | "Sharing paused" |
| `danger` | `#DC2626` | `#F87171` | Destructive actions only |

White text on `brand` is 5.2:1 and `muted` is at least 4.9:1 on every light surface (both pass WCAG AA). A test
checks every text/background pair used by the kit.

- **Spacing:** 4, 8, 12, 16, 24, 32. Screen side padding 16 (20 on wide phones).
- **Radius:** 12 (inputs, buttons, list rows), 16 (cards), 24 (sheet top corners), full
  (avatars, pills).
- **Type:** Plus Jakarta Sans for headings, Inter for everything else.
  Display 28/34 bold · Title 20/26 semibold · Body 16/24 · Secondary 14/20 · Caption 12/16.
- **Touch targets:** at least 44 × 44.
- **Motion:** 150 to 250 ms fades and slides; none when "reduce motion" is on.

## Components

`Screen`, `Header`, `Card`, `IconTile`, `Button` (primary, secondary, ghost, danger),
`Input`, `ListRow`, `StatusPill`, `Avatar`, `AvatarStack`, `Sheet`, `ConfirmDialog`,
`EmptyState`, `Toast`, `Skeleton`, `Stat`. Screens are built only from these. A dev-only
"Kitchen sink" screen shows all of them in light and dark.

## Navigation

Four tabs: **Home · Circles · Friends · You**. Notifications are a bell in the header.

| Screen | The one action |
|---|---|
| Onboarding | Continue |
| Home | Share my friend code (until you have friends), then nothing: it's a status page |
| Circles | New circle |
| Circle detail | Invite people (admins) |
| Friends | Add friend |
| You | none (a settings list) |
