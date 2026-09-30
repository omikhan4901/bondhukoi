import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setup, teardown, reset, createUser, call, befriend, makeCircle } from './helpers.js';

// Walks every registered route, so a new route is covered without anyone remembering to.
let ctx;
before(async () => (ctx = await setup()));
after(teardown);
beforeEach(() => reset(ctx.db));

const PUBLIC = new Set(['GET /health', 'GET /api/config', 'GET /api/universities', 'POST /api/signup-check']);
const routes = () => ctx.app.routeList.filter((r) => r.url !== '*' && !r.url.startsWith('/documentation'));

test('every route except the public ones needs a signed-in user', async () => {
  const unguarded = [];
  for (const r of routes()) {
    if (PUBLIC.has(`${r.method} ${r.url}`)) continue;
    const url = r.url
      .replace(':code', 'ABCDEFGH')
      .replace(/:[a-zA-Z]+/g, '00000000-0000-4000-8000-000000000000');
    const res = await call(ctx.app, r.method, url, { body: r.method === 'GET' || r.method === 'DELETE' ? undefined : {} });
    if (res.status !== 401) unguarded.push(`${r.method} ${r.url} → ${res.status}`);
  }
  assert.deepEqual(unguarded, []);
});

test('a stranger can’t read or change anything that belongs to other people', async () => {
  const a = await createUser(ctx.db, { name: 'Owner' });
  const b = await createUser(ctx.db, { name: 'Friend' });
  const c = await createUser(ctx.db, { name: 'Requester' });
  const stranger = await createUser(ctx.db, { name: 'Stranger' });
  await befriend(ctx.db, a, b);
  const circleId = await makeCircle(ctx.db, a, [b]);
  const request = await ctx.db.one('insert into friend_requests (from_user_id, to_user_id) values ($1, $2) returning id', [c.id, a.id]);
  const watch = await ctx.db.one(`insert into watches (watcher_id, watched_id, status) values ($1, $2, 'pending') returning id`, [b.id, a.id]);

  // Everything except the stranger's own "last active" time, which signing in updates.
  const snapshot = async () =>
    JSON.stringify(
      await Promise.all(
        ['profiles', 'friendships', 'friend_requests', 'watches', 'circles', 'circle_members', 'circle_boundaries', 'blocks'].map((t) =>
          ctx.db.many(`select * from ${t} order by 1`),
        ),
      ),
      (k, v) => (k === 'last_active_at' || k === 'updated_at' ? undefined : v),
    );
  const before = await snapshot();

  const ids = { circleId, userId: a.id, requestId: request.id, watchId: watch.id, code: a.friendCode };
  // Bodies that would do damage if ownership weren't checked.
  const bodies = {
    'PATCH /api/circles/:circleId': { name: 'Hijacked', messengerLink: 'https://m.me/j/evil' },
    'PUT /api/circles/:circleId/zone': { boundary: [{ lat: 1, lng: 1 }, { lat: 1, lng: 1.001 }, { lat: 1.001, lng: 1.001 }] },
    'POST /api/circles/:circleId/members': { userIds: [stranger.id] },
    'PATCH /api/circles/:circleId/members/:userId': { role: 'member' },
    'PATCH /api/circles/:circleId/me': { detectionEnabled: false },
  };
  // Allowed on purpose: looking someone up by the friend code they shared, and no-ops that 404.
  const allowed = new Set(['GET /api/users/by-code/:code']);

  const leaks = [];
  for (const r of routes()) {
    if (!/:/.test(r.url)) continue;
    const key = `${r.method} ${r.url}`;
    if (allowed.has(key)) continue;
    const url = r.url.replace(/:([a-zA-Z]+)/g, (_, name) => ids[name]);
    const body = r.method === 'GET' ? undefined : bodies[key] || {};
    const res = await call(ctx.app, r.method, url, { user: stranger, body });
    if (res.status < 400 || res.status >= 500) leaks.push(`${key} → ${res.status}`);
  }
  assert.deepEqual(leaks, []);
  assert.equal(await snapshot(), before, 'nothing changed');
});

test('junk input never causes a server error', async () => {
  const u = await createUser(ctx.db);
  const junk = [
    [],
    'string',
    123,
    null,
    { __proto__: { admin: true } },
    { constructor: { prototype: { admin: true } } },
    { name: { $ne: null } },
    { lat: '1e309', lng: [] },
    { userId: "' or 1=1 --" },
    { userIds: ['x'.repeat(5000)] },
    { boundary: 'POLYGON((0 0))' },
    { deep: JSON.parse('['.repeat(200) + ']'.repeat(200)) },
  ];
  const failures = [];
  for (const r of routes()) {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(r.method)) continue;
    const url = r.url
      .replace(':code', 'ABCDEFGH')
      .replace(/:[a-zA-Z]+/g, '00000000-0000-4000-8000-000000000000');
    for (const body of junk) {
      const res = await ctx.app.inject({
        method: r.method,
        url,
        headers: { authorization: `Bearer ${u.token}`, 'content-type': 'application/json' },
        payload: JSON.stringify(body),
      });
      if (res.statusCode >= 500) failures.push(`${r.method} ${r.url} ${JSON.stringify(body).slice(0, 40)} → ${res.statusCode}`);
    }
    const broken = await ctx.app.inject({
      method: r.method,
      url,
      headers: { authorization: `Bearer ${u.token}`, 'content-type': 'application/json' },
      payload: '{"unterminated',
    });
    if (broken.statusCode >= 500) failures.push(`${r.method} ${r.url} broken JSON → ${broken.statusCode}`);
  }
  assert.deepEqual(failures, []);
});

test('ids that aren’t uuids are a 400, not a database error', async () => {
  const u = await createUser(ctx.db);
  for (const url of ['/api/circles/1', "/api/circles/1' or '1'='1", '/api/users/..%2f..%2fetc']) {
    const res = await call(ctx.app, 'GET', url, { user: u });
    assert.ok([400, 404].includes(res.status), `${url} → ${res.status}`);
  }
});
