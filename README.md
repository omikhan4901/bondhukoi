# 🟢 BondhuKoi — *"Where is my friend?"*

> **A privacy-first, geofence-based friend & circle location app for university students.**  
> Built with React Native (Expo) + Fastify + Supabase/PostGIS.

[![React Native](https://img.shields.io/badge/React%20Native-0.83-blue?logo=react)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK%2055-black?logo=expo)](https://expo.dev/)
[![Fastify](https://img.shields.io/badge/Fastify-v5-green?logo=fastify)](https://fastify.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostGIS-orange?logo=supabase)](https://supabase.com/)
[![License](https://img.shields.io/badge/license-ISC-blue)](./LICENSE)

---

## 📱 Demo

<p align="center">
  <a href="https://youtube.com/shorts/_Thc_gN7YzY" target="_blank">
    <img src="https://img.youtube.com/vi/_Thc_gN7YzY/hqdefault.jpg" alt="BondhuKoi app demo — click to watch" width="320" />
  </a>
  <br/>
  <em>Click to watch the full demo on YouTube ↑</em>
</p>

---

## 📖 What is BondhuKoi?

**BondhuKoi** (Bengali: *"Where is my friend?"*) is a location-sharing mobile app designed for Bangladeshi university students. Instead of broadcasting raw GPS coordinates, it uses **geofence zones** — users can see whether their friends are *inside* their shared circle zone (e.g., campus, library, canteen), never their exact position.

### Key Philosophy
- 🔒 **Privacy by design** — coordinates are checked server-side and immediately discarded. No raw GPS is ever stored.
- 🏫 **University-aware** — PostGIS-backed campus boundaries let users know if friends are on campus.
- 🌙 **Sleep window** — automatic silence between 6 PM and 6 AM unless opted in.
- 👥 **Circles** — custom zones (friend groups, departments, etc.) with polygon boundary editors.

---

## ✨ Features

### 🔐 Authentication
- Email/password signup & login with bcrypt hashing
- JWT access tokens (short-lived) + rotating refresh tokens (7-day, securely stored in DB)
- Auto-refresh on 401 with retry logic
- Google Sign-In support (via `expo-auth-session`)
- Unique friend codes generated on signup for easy discovery

### 📍 Location & Geofencing
- **Server-side Point-in-Polygon (PIP)** using PostGIS spatial queries — no raw coordinates stored
- **Client-side geofences** registered via `expo-location` background task
- University boundary checks (campus-wide geofence)
- Per-circle boundary checks with custom polygon editor
- **Privacy gates**:
  - Master sharing kill-switch (pause all sharing instantly)
  - Per-circle detection toggle
  - 6 PM–6 AM sleep window (opt-out available)
  - `track_university` flag to exclude campus from tracking
- Stale-data auto-refresh (re-pings after 10 minutes of inactivity)

### 👥 Circles (Groups)
- Create custom zones requiring at minimum 3 people (creator + 2 invitees)
- Circle types: `university`, `custom`
- Admin/member roles with fine-grained permissions
- Invite-only or open-invite mode
- Polygon boundary editor with map snapshot (saved to Supabase storage)
- Messenger link integration per circle
- Circle invitation flow (accept/reject)
- Automatic pruning of under-populated circles

### 👫 Friends
- Send friend requests by **email** or **friend code**
- Accept/reject incoming requests
- Paginated friends list (50/page)
- Unfriend
- **Watch system** — subscribe to a friend's entry/exit events from shared zones

### 🔔 Notifications
- Unified feed: friend requests, watch requests, circle invites, watch alerts
- Cursor-based pagination for infinite scroll
- Real-time watch alerts (ENTER/EXIT transitions logged per circle)

### 👤 User Profile
- Profile picture upload (base64 → Supabase `avatars` bucket)
- Edit name, Facebook & Instagram handles
- Privacy preferences (auto-delete history, evening pings, university tracking)
- Account deletion with cascade cleanup

### 🛠 Admin Panel (In-App)
- Admin-only university boundary manager
- Map snapshot upload on boundary save
- Role-based access control (`role: 'admin'`)

---

## 🏗 Architecture

```
BondhuKoi/
├── backend/                    # Fastify REST API
│   ├── src/
│   │   ├── index.js            # Server bootstrap, plugin registration
│   │   ├── routes/
│   │   │   ├── auth.js         # Signup, login, refresh, logout, verify
│   │   │   ├── users.js        # Profile, sharing, preferences, avatar, notifications
│   │   │   ├── circles.js      # CRUD, members, invitations, privacy
│   │   │   ├── friends.js      # Requests, watch system, friends list
│   │   │   └── locations.js    # PIP check, boundaries, admin university mgmt
│   │   ├── db/
│   │   │   └── database.js     # Supabase client + all DB query functions
│   │   ├── middleware/
│   │   │   └── auth.js         # JWT verify middleware
│   │   └── utils/
│   │       ├── auth.js         # hashPassword, comparePasswords, generateToken
│   │       └── validation.js   # Joi schemas (signup, login, createCircle, etc.)
│   └── migrations/
│       └── migration.sql       # DB migration scripts
│
└── frontend/
    └── BondhuKoiApp/           # Expo React Native app
        ├── app/                # Expo Router file-based navigation
        │   ├── (auth)/         # Login, Google OAuth screens
        │   ├── (tabs)/         # Main tab navigator
        │   │   ├── index.js    # Home / status screen
        │   │   ├── groups.js   # Circles tab
        │   │   └── settings.js # Settings tab
        │   ├── friends.js      # Friends management screen
        │   ├── map.js          # Interactive map view
        │   ├── notifications.js# Notification feed
        │   ├── signup.js       # Multi-step signup flow
        │   ├── settings.js     # Full settings screen
        │   ├── admin/          # Admin boundary manager
        │   ├── group/          # Circle detail screens
        │   └── place/          # Place detail screens
        ├── components/
        │   ├── sheets/         # Bottom sheets (18 sheets: AddFriend, WatchSheet, BoundaryEditor, etc.)
        │   ├── cards/          # Circle & friend cards
        │   ├── modals/         # Confirmation modals
        │   └── ui/             # Reusable UI primitives
        └── src/
            ├── context/
            │   ├── AuthContext.js           # Auth state, login/signup/logout
            │   └── LocationStatusContext.js # Geofence state, permission management
            ├── services/
            │   └── api.js       # All API calls (authService, userService, circleService, friendService, locationService, notificationService)
            ├── hooks/
            │   └── useAuth.js   # Auth context hook
            └── tasks/
                └── geofenceTask.js  # Background geofence task (expo-task-manager)
```

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Mobile App** | React Native 0.83 + Expo SDK 55 |
| **Navigation** | Expo Router (file-based) |
| **UI Library** | Tamagui v2 |
| **Animations** | Moti + React Native Reanimated |
| **Maps** | react-native-maps (Google Maps) |
| **Backend** | Fastify v5 (Node.js) |
| **Auth** | JWT (`@fastify/jwt`) + bcrypt + rotating refresh tokens |
| **Database** | Supabase (PostgreSQL + PostGIS) |
| **Storage** | Supabase Storage (avatars, map-snapshots) |
| **Rate Limiting** | `@fastify/rate-limit` |
| **Validation** | Joi |
| **Google Auth** | `google-auth-library` + `expo-auth-session` |
| **Geofencing** | `expo-location` + `expo-task-manager` |

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18
- Expo CLI (`npm install -g expo-cli`)
- A [Supabase](https://supabase.com/) project with PostGIS enabled
- Android Studio / Xcode for native builds

### Backend Setup

```bash
cd backend
cp .env.example .env
# Fill in your Supabase credentials and JWT secret
npm install
npm run dev
```

**Required `.env` variables:**
```env
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret_here
CORS_ORIGIN=*
```

### Frontend Setup

```bash
cd frontend/BondhuKoiApp
cp .env.example .env
# Set EXPO_PUBLIC_API_URL to your backend URL
npm install
npx expo start
```

**Required `.env` variables:**
```env
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Running the App

```bash
# Start Expo dev server
npx expo start

# Run on Android
npx expo run:android

# Run on iOS
npx expo run:ios
```

---

## 🗄 Database Schema (Key Tables)

| Table | Purpose |
|---|---|
| `users` | User profiles, university, sharing settings, friend codes |
| `friendships` | Mutual friend relationships |
| `friend_requests` | Pending friend requests |
| `watch_requests` | Priority watch subscriptions |
| `circles` | Zone groups with type, open-invite, messenger link |
| `circle_members` | Membership with role (admin/member), status (active/pending), detection toggle |
| `circle_boundaries` | PostGIS geometry for each circle polygon |
| `university_boundaries` | PostGIS geometry for campus polygons |
| `status_transitions` | ENTER/EXIT event log per user per circle |
| `refresh_tokens` | Rotating refresh token store (7-day TTL) |
| `activity_log` | Audit trail for circle events |

---

## 📡 API Reference

### Auth — `/api/auth`
| Method | Endpoint | Description |
|---|---|---|
| POST | `/signup` | Register new user |
| POST | `/login` | Login with email/password |
| GET | `/verify` | Verify JWT token |
| POST | `/refresh` | Rotate refresh token |
| POST | `/logout` | Invalidate refresh token |

### Users — `/api/users`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/me` | Get current user profile |
| PATCH | `/me` | Update profile (name, socials) |
| PATCH | `/me/sharing` | Toggle location sharing |
| PATCH | `/me/preferences` | Update privacy settings |
| POST | `/me/avatar` | Upload profile picture |
| DELETE | `/me` | Permanently delete account |
| GET | `/search/:query` | Search users by name/email |
| GET | `/notifications/feed` | Unified notification feed |

### Circles — `/api/circles`
| Method | Endpoint | Description |
|---|---|---|
| POST | `/` | Create circle (min 3 members) |
| GET | `/` | Get all user circles |
| GET | `/university` | Get campus circles |
| GET | `/invitations` | Pending invitations |
| GET | `/:id` | Circle detail + members |
| PATCH | `/:id` | Update circle settings |
| DELETE | `/:id` | Delete circle |
| POST | `/:id/members` | Add member |
| DELETE | `/:id/members/:userId` | Remove member / Leave |
| PATCH | `/:id/members/:userId/role` | Change member role |
| PATCH | `/:id/members/me/privacy` | Toggle detection |
| POST | `/:id/accept` | Accept invitation |
| POST | `/:id/reject` | Reject invitation |

### Friends — `/api/friends`
| Method | Endpoint | Description |
|---|---|---|
| POST | `/requests` | Send friend request |
| GET | `/requests/pending` | Pending requests |
| PATCH | `/requests/:id/accept` | Accept friend request |
| DELETE | `/requests/:id` | Reject friend request |
| GET | `/list` | Paginated friends list |
| DELETE | `/:friendId` | Unfriend |
| POST | `/watch` | Send watch request |
| PATCH | `/watch/:id/accept` | Accept watch request |
| DELETE | `/watch/:id` | Remove watch |
| GET | `/watch/list` | Watched friends list |

### Locations — `/api/locations`
| Method | Endpoint | Description |
|---|---|---|
| POST | `/check` | PIP check (rate limited: 30/hr) |
| GET | `/boundaries` | All boundaries for geofence registration |
| GET | `/circles/:id/boundary` | Circle polygon |
| PUT | `/circles/:id/boundary` | Save circle polygon |
| DELETE | `/circles/:id/boundary` | Delete circle boundary |
| GET | `/admin/universities` | All university boundaries (admin) |
| PUT | `/admin/universities/:name/boundary` | Save university polygon (admin) |

---

## 🔮 Roadmap / Planned Features

> Items planned for future development:

### 🔴 High Priority
- [ ] **Push Notifications** — Firebase Cloud Messaging (FCM) for real-time watch alerts instead of polling
- [ ] **Real-time presence** — WebSocket-based live status updates (Fastify WebSocket plugin is already registered)
- [ ] **Messenger / In-App Chat** — Group messaging per circle (schema stub exists via `messenger_link`)
- [ ] **iOS App Store & Google Play deployment** — Production build pipeline (EAS Build)

### 🟡 Medium Priority
- [ ] **Google Sign-In improvements** — Full native flow for production Android/iOS builds
- [ ] **Mutual friends discovery** — "Friends in common" for easier circle building
- [ ] **Circle activity feed** — Timeline of who entered/exited when
- [ ] **Map visualization** — Live dot map showing friends' zone status (not raw GPS)
- [ ] **Admin dashboard** — Web-based admin panel for university boundary management
- [ ] **QR Code friend invites** — Scan QR to send friend request instantly

### 🟢 Low Priority / Polish
- [ ] **Dark/Light mode toggle** — System auto-detect is live; manual override UI
- [ ] **Localization (Bengali/English)** — i18n support for native Bangladeshi users
- [ ] **Offline support** — Cache last known status in AsyncStorage for offline viewing
- [ ] **Circle discovery** — Browse open circles at your university
- [ ] **Notification preferences** — Fine-tune which alerts trigger FCM vs. in-app only
- [ ] **Tighten rate limits** — Production-safe values for boundary saving endpoints
- [ ] **Heroku / Railway migration** — Self-hosted Postgres + PostGIS replacing Supabase (migration guide exists)

---

## 🔒 Security Notes

- JWT secrets stored in environment variables, never committed
- Service Role Key is **backend-only** — frontend only uses Supabase Anon Key
- Coordinates are never stored — only used for instant PIP calculation
- Refresh tokens are rotated on each use and stored hashed in DB
- Rate limiting on all sensitive endpoints (`@fastify/rate-limit`)
- Input validation via Joi on all POST/PATCH endpoints

---

## 👤 Author

**Omikhi** — Computer Science student, Bangladesh  
Built as a personal project for university students.

---

## 📄 License

ISC License — See [LICENSE](./LICENSE) for details.
