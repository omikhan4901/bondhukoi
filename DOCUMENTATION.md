# BondhuKoi — Developer Documentation

> Last updated: 2026-03-30
> Stack: Expo (React Native) · Fastify · Supabase + PostGIS

---

## 1. What Is BondhuKoi?

A privacy-first campus presence app. Users can see which friends and circle members are "inside" their university zone — without any live location tracing in the UI. Location is determined by checking if a GPS coordinate falls inside a predefined polygon boundary using PostGIS math on the server.

**What it is NOT:** a live tracker, a map tracker, or a location history recorder as visible in the UI.

---

## 2. Tech Stack

| Layer         | Technology                                                     |
| ------------- | -------------------------------------------------------------- |
| Mobile app    | Expo SDK 55, React Native, expo-router (file-based routing)    |
| UI            | Tamagui (styled components), Moti (animations)                 |
| State         | React Context (`AuthContext`), local `useState` per screen     |
| Maps          | `react-native-maps` — Apple Maps (iOS) / Google Maps (Android) |
| Location      | `expo-location` + `expo-task-manager` (background geofencing)  |
| Backend       | Node.js + Fastify v5                                           |
| Database      | Supabase (PostgreSQL) with PostGIS extension                   |
| Auth          | Fastify JWT (access token stored in AsyncStorage)              |
| Storage       | Supabase Storage buckets: `avatars`, `map-snapshots`           |
| Rate limiting | `@fastify/rate-limit` (in-memory, no Redis)                    |

---

## 3. Project Structure

```
BondhuKoi/
├── backend/
│   └── src/
│       ├── index.js              ← Fastify server entry
│       ├── db/database.js        ← All Supabase DB functions
│       ├── middleware/auth.js
│       ├── routes/
│       │   ├── auth.js           ← /api/auth/*
│       │   ├── users.js          ← /api/users/*
│       │   ├── friends.js        ← /api/friends/*
│       │   ├── circles.js        ← /api/circles/*
│       │   └── locations.js      ← /api/locations/*
│       └── utils/
│           ├── auth.js           ← JWT helpers, friend code generator
│           └── validation.js
│
└── frontend/BondhuKoiApp/
    ├── app.json                  ← Expo config (API keys, permissions)
    ├── app/
    │   ├── (tabs)/
    │   │   ├── index.js          ← Campus tab (home)
    │   │   ├── groups.js         ← Circles tab
    │   │   └── settings.js       ← Settings tab
    │   ├── group/[id].js         ← Circle detail screen
    │   ├── admin/boundary.js     ← Admin university boundary editor
    │   ├── map.js                ← Full-screen zone map
    │   ├── friends.js            ← Friends list screen
    │   ├── notifications.js      ← Notification inbox
    │   ├── feed.js               ← Activity feed (Coming Soon placeholder)
    │   ├── signup.js             ← Onboarding / registration
    │   └── trust.js              ← Trust/permissions onboarding
    ├── components/
    │   ├── SanctuaryComponents.js  ← Base UI primitives (Heading, BodyText, SanctuaryPage)
    │   ├── cards/                  ← CircleCard, FriendRow, MemberRow, SettingsRow, etc.
    │   ├── sheets/                 ← Bottom-sheet modals (see §7)
    │   ├── modals/                 ← BottomSheetModal, ConfirmModal, SuccessModal
    │   └── ui/                     ← Small UI pieces (StatusDot, AvatarStack, FilterPill, etc.)
    └── src/
        ├── context/AuthContext.js
        ├── hooks/useAuth.js
        ├── services/api.js         ← All API service objects
        ├── tasks/geofenceTask.js   ← Background geofence task
        └── utils/locationUtils.js  ← Boundary parsing (WKT/WKB integration)
```

---

## 4. Environment Variables

### Backend (`.env`)

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=
PORT=3000
```

### Frontend (`.env`)

```
EXPO_PUBLIC_API_URL=http://<your-ip>:3000
```

---

## 5. Database Schema

### `users`

| Column                | Type        | Notes                                     |
| --------------------- | ----------- | ----------------------------------------- |
| `id`                  | uuid PK     |                                           |
| `name`                | varchar     |                                           |
| `email`               | varchar unique |                                        |
| `password_hash`       | varchar     |                                           |
| `university`          | varchar     | Used to look up university boundary       |
| `facebook`            | varchar     | Optional                                  |
| `instagram`           | varchar     | Optional                                  |
| `friend_code`         | varchar unique | 6-char code for adding friends         |
| `is_sharing_enabled`  | bool        | Sharing state                             |
| `track_university`    | bool        | Whether to track the university presence  |
| `auto_delete_history` | bool        |                                           |
| `avatar_color`        | text        | Optional                                  |
| `avatar_url`          | text        | Public Supabase URL from `avatars` bucket |
| `role`                | text        | `'user'` or `'admin'`                     |
| `is_inside`           | bool        | Updated by the location check endpoint    |
| `last_check_at`       | timestamptz | When the last PIP check ran               |
| `created_at`          | timestamptz |                                           |
| `updated_at`          | timestamptz |                                           |

### `friend_requests`

| Column         | Type         | Notes                                       |
| -------------- | ------------ | ------------------------------------------- |
| `id`           | uuid PK      |                                             |
| `from_user_id` | uuid → users |                                             |
| `to_user_id`   | uuid → users |                                             |
| `status`       | varchar      | `'pending'` \| `'accepted'` \| `'rejected'` |
| `created_at`   | timestamptz  |                                             |

### `watch_requests`

| Column            | Type         | Notes                                       |
| ----------------- | ------------ | ------------------------------------------- |
| `id`              | uuid PK      |                                             |
| `watcher_id`      | uuid → users | Person who wants to watch                   |
| `watched_user_id` | uuid → users | Person being watched                        |

### `circles`

| Column                | Type        | Notes                                  |
| --------------------- | ----------- | -------------------------------------- |
| `id`                  | uuid PK     |                                        |
| `name`                | varchar     |                                        |
| `description`         | text        |                                        |
| `type`                | varchar     | `'university'` \| `'custom'`           |
| `admin_id`            | uuid → users| Admin of the circle                    |
| `is_open`             | bool        | Open invites (any member can invite)   |
| `messenger_link`      | text        | Optional Messenger/WhatsApp URL        |
| `location_label`      | text        |                                        |
| `location_id`         | uuid        |                                        |
| `snapshot_url`        | text        | Public URL from `map-snapshots` bucket |
| `snapshot_updated_at` | timestamptz |                                        |
| `created_at`          | timestamptz |                                        |
| `updated_at`          | timestamptz |                                        |

### `circle_members`

| Column              | Type           | Notes                                  |
| ------------------- | -------------- | -------------------------------------- |
| `id`                | uuid PK        |                                        |
| `circle_id`         | uuid → circles |                                        |
| `user_id`           | uuid → users   |                                        |
| `role`              | varchar        | `'admin'` \| `'member'`                |
| `status`            | text           | `'pending'` \| `'active'`              |
| `detection_enabled` | bool           |                                        |
| `joined_at`         | timestamptz    |                                        |

### `university_boundaries`

| Column            | Type           | Notes                                 |
| ----------------- | -------------- | ------------------------------------- |
| `id`              | uuid PK        |                                       |
| `university_name` | text unique    | Must exactly match `users.university` |
| `boundary`        | GEOMETRY       | PostGIS Point/Polygon column          |
| `label`           | text           |                                       |
| `created_by`      | uuid → users   | Admin who drew it                     |
| `snapshot_url`    | text           |                                       |
| `updated_at`      | timestamptz    |                                       |

### `circle_boundaries`

| Column       | Type                  | Notes                       |
| ------------ | --------------------- | --------------------------- |
| `id`         | uuid PK               |                             |
| `circle_id`  | uuid → circles unique |                             |
| `boundary`   | GEOMETRY              | PostGIS polygon data        |
| `created_at` | timestamptz           |                             |
| `updated_at` | timestamptz           |                             |

### `locations`

| Column      | Type        | Notes                                           |
| ----------- | ----------- | ----------------------------------------------- |
| `id`        | uuid PK     |                                                 |
| `user_id`   | uuid → users|                                                 |
| `latitude`  | numeric     |                                                 |
| `longitude` | numeric     |                                                 |
| `accuracy`  | numeric     |                                                 |
| `circle_id` | uuid        |                                                 |
| `is_inside` | bool        | Used to log checks for the background geofencing|
| `timestamp` | timestamptz |                                                 |

### `activity_logs`

| Column      | Type        | Notes  |
| ----------- | ----------- | ------ |
| `id`        | uuid PK     |        |
| `user_id`   | uuid → users|        |
| `circle_id` | uuid        |        |
| `action`    | varchar     |        |
| `metadata`  | jsonb       |        |
| `timestamp` | timestamptz |        |

### `refresh_tokens`

| Column       | Type        | Notes |
| ------------ | ----------- | ----- |
| `id`         | uuid PK     |       |
| `user_id`    | uuid → users|       |
| `token`      | text        |       |
| `expires_at` | timestamptz |       |
| `created_at` | timestamptz |       |

### `status_transitions`

| Column            | Type        | Notes |
| ----------------- | ----------- | ----- |
| `id`              | uuid PK     |       |
| `user_id`         | uuid → users|       |
| `circle_id`       | uuid        |       |
| `transition_type` | text        |       |
| `timestamp`       | timestamptz |       |

### Core DB RPC Functions

- `check_user_inside_university`
- `check_user_inside_circles`
- `get_university_boundary_geojson`
- `get_all_university_boundaries_geojson`
- `get_circle_boundary`
- `get_circle_boundaries_batch`
- `prune_small_circles`

---

## 6. Backend API Reference

All routes require `Authorization: Bearer <jwt>` except auth routes.

### Auth — `/api/auth`

| Method | Path              | Body                                                       | Returns           |
| ------ | ----------------- | ---------------------------------------------------------- | ----------------- |
| POST   | `/register`       | `name, email, password, university, facebook?, instagram?` | `{ user, token }` |
| POST   | `/login`          | `email, password`                                          | `{ user, token }` |
| POST   | `/logout`         | —                                                          | `{ message }`     |
| DELETE | `/delete-account` | —                                                          | `{ message }`     |

### Users — `/api/users`

| Method | Path                      | Notes                                                            |
| ------ | ------------------------- | ---------------------------------------------------------------- |
| GET    | `/me`                     | Current user profile                                             |
| PATCH  | `/me`                     | Update name, socials, preferences, avatar colors                 |
| POST   | `/me/avatar`              | Body: `{ imageBase64 }` — uploads to `avatars` bucket, saves URL |
| GET    | `/search?q=`              | Search users by name/email (for circle invites)                  |
| GET    | `/notifications/feed`     | Unread notifications                                             |
| PATCH  | `/notifications/:id/read` | Mark read                                                        |

### Friends — `/api/friends`

| Method | Path                   | Notes                                             |
| ------ | ---------------------- | ------------------------------------------------- |
| POST   | `/requests`            | Body: `{ friendEmail? friendCode? }`              |
| GET    | `/requests/pending`    | Incoming/outgoing pending requests                |
| PATCH  | `/requests/:id/accept` |                                                   |
| DELETE | `/requests/:id`        | Reject/cancel                                     |
| GET    | `/list`                | All friends with `avatarUrl, facebook, instagram` |
| DELETE | `/:friendId`           | Unfriend                                          |
| POST   | `/watch`               | Body: `{ friendEmail, scope }`                    |
| GET    | `/watch/watched`       | Friends you're watching                           |
| PATCH  | `/watch/:id/accept`    |                                                   |
| DELETE | `/watch/:id`           | Remove watch                                      |

### Circles — `/api/circles`

| Method | Path                        | Notes                                               |
| ------ | --------------------------- | --------------------------------------------------- |
| POST   | `/`                         | Create circle                                       |
| GET    | `/`                         | List user's circles                                 |
| GET    | `/:id`                      | Circle detail + members                             |
| PATCH  | `/:id`                      | Update name/desc (admin only)                       |
| DELETE | `/:id`                      | Delete circle (admin only)                          |
| POST   | `/:id/members`              | Add member / Accept Invites                         |
| DELETE | `/:id/members/:userId`      | Remove member                                       |
| PATCH  | `/:id/members/:userId/role` | Change role (Member <> Admin)                       |
| PATCH  | `/:id/messenger-link`       | Set/update messenger link                           |
| PATCH  | `/:id/open-invite`          | Toggle open invites                                 |

### Location — `/api/locations`

| Method | Path                                 | Rate limit | Notes                                                                        |
| ------ | ------------------------------------ | ---------- | ---------------------------------------------------------------------------- |
| POST   | `/check`                             | 30/hr      | Body: `{ lat, lng }` — PostGIS runs PIP check updates states.                |
| GET    | `/boundaries`                        | —          | Returns university polygon + user's circle polygons for geofence setup       |
| GET    | `/circles/:id/boundary`              | —          | Get a circle's polygon                                                       |
| PUT    | `/circles/:id/boundary`              | 3/day      | Body: `{ boundary, snapshotUrl? }` — circle admin only                       |
| DELETE | `/circles/:id/boundary`              | —          | Removes boundary + clears snapshot                                           |
| GET    | `/admin/universities`                | —          | Admin only                                                                   |
| PUT    | `/admin/universities/:name/boundary` | 3/day      | Admin only — saves university WKT polygon                                    |

---

## 7. Frontend Sheets (Bottom Modal Components)

| Sheet                        | Trigger                    | Purpose                                                                                        |
| ---------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------- |
| `AddFriendSheet`             | Home / Friends screen      | Send friend request by email or friend code                                                    |
| `AvatarUploadSheet`          | Settings avatar tap        | Pick image → resize to 300×300 → upload to `avatars` bucket                                    |
| `BoundaryEditorSheet`        | Group detail "Draw Zone"   | Tap-to-place polygon editor with close-to-first-point mechanic; takes MapView snapshot on save |
| `CircleOptionsSheet`         | Circle card ⋮              | Leave circle                                                                                   |
| `CircleSettingsSheet`        | Group detail settings      | Rename / delete circle (admin)                                                                 |
| `EditSocialSheet`            | Settings socials           | Edit Facebook / Instagram handle                                                               |
| `ManageMemberSheet`          | Group detail member tap    | Kick / promote / demote member (admin)                                                         |
| `ManagePlacesSheet`          | (legacy)                   | Placeholder                                                                                    |
| `MessengerLinkSheet`         | Group detail               | Set Messenger/WhatsApp link (admin)                                                            |
| `PauseSharingSheet`          | Home / Settings            | Temporarily disable location sharing                                                           |
| `PendingFriendRequestsSheet` | Home                       | View and accept/reject incoming requests                                                       |
| `ShareCircleSheet`           | Group card share icon      | Generate invite link + invite friends directly                                                 |
| `SocialsSheet`               | Friend card socials button | View friend's Facebook/Instagram (opens in browser)                                            |
| `UnfriendSheet`              | Friends list               | Confirm unfriend                                                                               |
| `WatchSheet`                 | Friend card watch button   | Send watch request with scope                                                                  |
| `MessageStubSheet`           | —                          | "Direct messaging coming soon" placeholder                                                     |

---

## 8. Key Frontend Services (`src/services/api.js`)

### `authService`

`login`, `signup`, `logout`, `deleteAccount`

### `userService`

`getMe`, `updateProfile`, `uploadAvatar`, `searchUsers`, `updatePreferences`, `getSocials`, `updateSocials`

### `friendService`

`getFriendsList`, `sendFriendRequest`, `getPendingRequests`, `acceptFriendRequest`, `rejectFriendRequest`, `unfriend`, `sendWatchRequest`, `getWatchedFriends`, `acceptWatchRequest`, `removeWatch`

### `circleService`

`getCircles`, `getCircleById`, `createCircle`, `updateCircle`, `deleteCircle`, `addMember`, `removeMember`, `updateMemberRole`, `updateMessengerLink`, `updateOpenInvite`

### `notificationService`

`getNotifications`, `markRead`

### `locationService`

`checkLocation(lat, lng)` — sends coords to server for PIP check  
`getBoundaries()` — get all polygons for geofence registration  
`getCircleBoundary(circleId)`  
`saveCircleBoundary(circleId, boundary, snapshotUrl?)` — serializes coordinates to PostGIS format  
`deleteCircleBoundary(circleId)`  
`getAdminUniversities()`  
`saveUniversityBoundary(name, boundary)` — saves to PostGIS `university_boundaries`  
`uploadSnapshot(circleId, base64)` — deletes old, uploads new to `map-snapshots`

---

## 9. Location System — How It Works

### Flow

```
App opens / geofence event fires
        │
        ▼
expo-location.getCurrentPositionAsync()
        │
        ▼
POST /api/locations/check  { lat, lng }
        │
Server: PostGIS RPC ST_Contains / ST_Within math against geometry boundaries
        │
Server: UPDATE users SET is_inside = true/false along with transition states.
        │
        ▼
Response: { isInside, isInUniversity, insideCircleIds }
        │
        ▼
Friends see updated presence dot on next screen load based on roles and permissions.
```

### Background geofencing

- App registers **bounding circles** (not polygons) with the OS on startup via `expo-location.startGeofencingAsync`
- The OS fires `GEOFENCE_TASK` when the device enters/exits any registered circle
- On trigger: get precise position → call `/check` → done
- iOS hard limit: 20 active geofences per app. Circle cap keeps us well within this.

### Point-in-polygon math (PostGIS)

Uses robust `ST_Within` and `ST_Contains` spatial intersection matching in Supabase RPCs. `GEOMETRY` layers have replaced standard ray-casting mathematics across the schema. Polygons are stored as geometry using SRID 4326.

---

## 10. Avatar System

1. **Pick image** — `expo-image-picker` (camera or gallery)
2. **Resize** — `expo-image-manipulator` → 300×300px, JPEG quality 0.5 (~20–40 KB)
3. **Encode** — `expo-file-system` reads as base64
4. **Upload** — `POST /api/users/me/avatar` → backend uploads to Supabase `avatars` bucket, saves public URL to `users.avatar_url`
5. **Display** — All avatar displays check `avatarUrl` first, fall back to initial letter + deterministic color from name hash

**Deterministic color:** `hash(name) % 8` picks from a fixed palette of 8 colours. Same name always gets same color.

Avatars are uploaded at signup (optional) and from Settings → profile photo.

---

## 11. Auth Flow

1. **Signup** → `POST /api/auth/register` → receive `{ user, token }` → store token in AsyncStorage → `AuthContext` login state
2. **Login** → `POST /api/auth/login` → same
3. **Token** → attached as `Authorization: Bearer <token>` on every subsequent request
4. **Refresh Tokens** → stored in `refresh_tokens` relation table DB for managing long-lived app sessions cleanly.
5. **Logout** → clears AsyncStorage token → `AuthContext` resets → navigate to login
6. **Delete account** → `DELETE /api/auth/delete-account` → cascades in DB → same client-side logout

---

## 12. Admin Panel

- **Who:** Any user with `users.role = 'admin'`
- **How to set:** `UPDATE users SET role = 'admin' WHERE email = 'your@email.com';` in Supabase SQL editor
- **Access:** Settings tab → amber "Admin: University Boundaries" row (only visible if `user.role === 'admin'`)
- **Screen:** `app/admin/boundary.js` — university selector tabs + WKT tap-to-draw polygon editor
- **Auth:** All admin routes verify `users.role === 'admin'` server-side

---

## 13. Notifications

Notifications are stored in the `notifications` table. Types and what happens on action:

| Type             | Message                                 | Action                                                            |
| ---------------- | --------------------------------------- | ----------------------------------------------------------------- |
| `friend_request` | "X wants to be friends"                 | Accept → `PATCH /friends/requests/:id/accept` / Reject → `DELETE` |
| `watch_request`  | "X wants to watch your location status" | Accept → `PATCH /friends/watch/:id/accept`                        |
| `circle_invite`  | "X invited you to Y"                    | Accept → `POST /circles/:id/members`                              |

On accept/reject, the notification is removed from the feed client-side. Success modal confirms.

**Watch wording note:** Accepting a watch request means _they_ watch _you_ — the success message correctly reads "They can now see your location status."

---

## 14. Screens Quick Reference

| Screen         | File                 | Key behaviour                                                                |
| -------------- | -------------------- | ---------------------------------------------------------------------------- |
| Campus (home)  | `(tabs)/index.js`    | Friend list, stats, location zone card (→ map.js), geofence setup on mount   |
| Circles        | `(tabs)/groups.js`   | Circle cards with snapshot backgrounds, leave/share/options (role based view)|
| Settings       | `(tabs)/settings.js` | Socials, privacy toggles, watched friends, avatar, account edit, admin row   |
| Circle Detail  | `group/[id].js`      | Members, messenger link, zone boundary with snapshot preview, admin controls |
| Zone Map       | `map.js`             | Full map with university (blue) + circle (amber) polygons, Check Now button  |
| Friends        | `friends.js`         | Friend cards with avatar, watch status, socials/message/unfriend actions     |
| Notifications  | `notifications.js`   | Inbox for friend/watch/circle requests                                       |
| Signup         | `signup.js`          | Multi-step: name → email/password → university → optional avatar             |
| Admin Boundary | `admin/boundary.js`  | Tap-to-draw WKT university polygon editor, university selector tabs          |
| Feed           | `feed.js`            | "Coming Soon" placeholder — will show activity from `activity_logs`          |

---

## 15. Running the Project

### Backend

```bash
cd backend
npm install
npm run dev        # nodemon with --experimental-vm-modules
```

### Frontend

```bash
cd frontend/BondhuKoiApp
npm install
npx expo start     # scan QR with Expo Go, or press 'i'/'a' for simulator
```

> **Important:** Set `EXPO_PUBLIC_API_URL` in the frontend `.env` to your machine's local IP (not `localhost`) so the phone can reach the backend.

### Supabase Storage Buckets Required

- `avatars` — public
- `map-snapshots` — public

---

## 16. Known Limitations / Future Work

| Item                               | Status                                                    |
| ---------------------------------- | --------------------------------------------------------- |
| Location feature (zone check)      | ✅ Complete                                               |
| Custom Polygon Engine              | ✅ Complete (PostGIS mapped)                              |
| Live location / real-time tracking | ❌ Intentionally excluded                                 |
| Activity feed (circle events)      | ⏳ In Progress — scaffolding (`activity_logs`) added      |
| Direct messaging                   | ⏳ Placeholder (MessageStubSheet)                         |
| JWT refresh tokens                 | ⏳ In Progress — schema is implemented                    |
| Two-factor auth                    | ⏳ Mentioned in Security settings as "coming next update" |
| Rate limiting persistence          | ⏳ In-memory only — resets on server restart              |
