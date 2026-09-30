import { SignJWT } from 'jose';
import { createDb } from '../src/db.js';
import { buildApp } from '../src/app.js';
import { createTokenVerifier } from '../src/adapters/tokens.js';

export const SUPABASE_URL = 'http://supabase.test';
export const JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';
const DB_URL = process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres@localhost:54329/postgres';

// A square around North South University (Bashundhara, Dhaka), about 400 m across,
// and points inside and outside it.
export const NSU = { lat: 23.8151, lng: 90.4255 };
export const NSU_ZONE = [
  { lat: 23.8133, lng: 90.4235 },
  { lat: 23.8133, lng: 90.4275 },
  { lat: 23.8169, lng: 90.4275 },
  { lat: 23.8169, lng: 90.4235 },
];
export const LIBRARY = { lat: 23.8155, lng: 90.4250 };
export const LIBRARY_ZONE = [
  { lat: 23.8153, lng: 90.4247 },
  { lat: 23.8153, lng: 90.4253 },
  { lat: 23.8157, lng: 90.4253 },
  { lat: 23.8157, lng: 90.4247 },
];
export const FAR_AWAY = { lat: 23.7808, lng: 90.2792 }; // Savar

/** In-memory stand-ins for Supabase Storage, Expo push and the Auth admin API. */
export function fakes(db) {
  const files = new Map();
  const pushed = [];
  return {
    files,
    pushed,
    storage: {
      async upload(bucket, path, buffer) {
        files.set(`${bucket}/${path}`, buffer);
      },
      async remove(bucket, paths) {
        for (const p of paths) files.delete(`${bucket}/${p}`);
      },
      publicUrl: (bucket, path) => (path ? `https://storage.test/${bucket}/${path}` : null),
      signedUrl: async (bucket, path) => (path ? `https://storage.test/signed/${bucket}/${path}?token=x` : null),
    },
    push: {
      async send(messages) {
        pushed.push(...messages);
      },
    },
    authAdmin: {
      async deleteUser(id) {
        await db.exec('delete from auth.users where id = $1', [id]);
      },
      async setBan() {},
    },
  };
}

let shared;

/** One app and database connection for the whole test file. */
export async function setup() {
  if (shared) return shared;
  const db = createDb({ connectionString: DB_URL, max: 3 });
  const f = fakes(db);
  const app = await buildApp({
    config: { logLevel: 'silent', corsOrigins: [], trustProxy: false },
    db,
    verifyToken: createTokenVerifier({ supabaseUrl: SUPABASE_URL, jwtSecret: JWT_SECRET }),
    storage: f.storage,
    push: f.push,
    authAdmin: f.authAdmin,
    logger: false,
  });
  shared = { app, db, ...f };
  return shared;
}

export async function teardown() {
  if (!shared) return;
  await shared.app.close();
  await shared.db.close();
  shared = null;
}

/** Empties every table and puts back two universities (NSU with a campus zone). */
export async function reset(db) {
  await db.exec(`
    truncate auth.users, universities, circles, reports, feedback, invite_codes, admin_audit, app_settings cascade;
    insert into app_settings (key, value) values
      ('signups', '{"open": true, "invitesRequired": false}'),
      ('maintenance', '{"enabled": false, "message": ""}'),
      ('banner', '{"text": "", "tone": "info"}'),
      ('minAppVersion', '"1.0.0"'),
      ('features', '{"watch": true, "feed": true, "googleSignIn": false}');
  `);
  const wkt = `POLYGON((${[...NSU_ZONE, NSU_ZONE[0]].map((p) => `${p.lng} ${p.lat}`).join(', ')}))`;
  await db.exec(
    `insert into universities (name, short_name, email_domains, boundary)
     values ('North South University', 'NSU', array['northsouth.edu'], ST_GeomFromText($1, 4326)),
            ('BRAC University', 'BRACU', array['bracu.ac.bd', 'g.bracu.ac.bd'], null)`,
    [wkt],
  );
  if (shared) shared.pushed.length = 0;
  if (shared) shared.files.clear();
}

let counter = 0;

/** Creates an account the way Supabase Auth would, and a signed access token for it. */
export async function createUser(db, { name, email, aal = 'aal1', meta = {} } = {}) {
  counter += 1;
  const address = email || `student${counter}@northsouth.edu`;
  const row = await db.one('insert into auth.users (email, raw_user_meta_data, email_confirmed_at) values ($1, $2, now()) returning id', [
    address,
    { name: name || `Student ${counter}`, ...meta },
  ]);
  const token = await tokenFor(row.id, { aal });
  const profile = await db.one('select name, friend_code from profiles where id = $1', [row.id]);
  return { id: row.id, email: address, token, name: profile.name, friendCode: profile.friend_code };
}

export async function tokenFor(userId, { aal = 'aal1', issuedAt, secret = JWT_SECRET, issuer = `${SUPABASE_URL}/auth/v1`, expiresIn = '1h' } = {}) {
  const jwt = new SignJWT({ aal, email: 'x@northsouth.edu', role: 'authenticated' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setAudience('authenticated')
    .setIssuer(issuer)
    .setExpirationTime(expiresIn);
  if (issuedAt) jwt.setIssuedAt(issuedAt);
  else jwt.setIssuedAt();
  return jwt.sign(new TextEncoder().encode(secret));
}

/** Calls the API as `user` (or signed out) and returns { status, body }. */
export async function call(app, method, url, { user, body, headers = {} } = {}) {
  const res = await app.inject({
    method,
    url,
    payload: body,
    headers: { ...(user ? { authorization: `Bearer ${user.token}` } : {}), ...headers },
  });
  let parsed = null;
  try {
    parsed = res.json();
  } catch {
    parsed = res.body;
  }
  return { status: res.statusCode, body: parsed };
}

/** Makes two users friends directly in the database. */
export async function befriend(db, a, b) {
  const [x, y] = a.id < b.id ? [a.id, b.id] : [b.id, a.id];
  await db.exec('insert into friendships (user_a, user_b) values ($1, $2) on conflict do nothing', [x, y]);
}

/** Creates a circle with `admin` as admin and `members` as active members, plus a zone. */
export async function makeCircle(db, admin, members = [], { name = 'Library crew', zone = LIBRARY_ZONE } = {}) {
  const c = await db.one(
    `insert into circles (name, created_by, university_id) values ($1, $2, (select university_id from profiles where id = $2)) returning id`,
    [name, admin.id],
  );
  await db.exec(`insert into circle_members (circle_id, user_id, role, status, joined_at) values ($1, $2, 'admin', 'active', now())`, [c.id, admin.id]);
  for (const m of members) {
    await db.exec(`insert into circle_members (circle_id, user_id, role, status, joined_at) values ($1, $2, 'member', 'active', now())`, [c.id, m.id]);
  }
  if (zone) {
    const wkt = `POLYGON((${[...zone, zone[0]].map((p) => `${p.lng} ${p.lat}`).join(', ')}))`;
    await db.exec('insert into circle_boundaries (circle_id, boundary) values ($1, ST_GeomFromText($2, 4326))', [c.id, wkt]);
  }
  return c.id;
}

/** Turns quiet hours off so presence tests don't depend on the time of day. */
export async function noQuietHours(db, ...users) {
  await db.exec('update profiles set quiet_hours_enabled = false where id = any($1)', [users.map((u) => u.id)]);
}
