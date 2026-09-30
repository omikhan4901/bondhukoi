import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setup, teardown, reset, createUser, call, befriend, makeCircle, noQuietHours, NSU, LIBRARY, FAR_AWAY } from './helpers.js';
import { localHour } from '../src/lib/time.js';

let ctx;
before(async () => (ctx = await setup()));
after(teardown);
beforeEach(() => reset(ctx.db));

const api = (...args) => call(ctx.app, ...args);
const check = (user, point, extra = {}) => api('POST', '/api/presence/check', { user, body: { ...point, ...extra } });
const friendView = async (viewer, id) => (await api('GET', '/api/friends', { user: viewer })).body.friends.find((f) => f.id === id);

async function pair() {
  const a = await createUser(ctx.db, { name: 'Nusrat' });
  const b = await createUser(ctx.db, { name: 'Rafi' });
  await befriend(ctx.db, a, b);
  await noQuietHours(ctx.db, a, b);
  return [a, b];
}

test('arriving on campus: stored as a zone, seen by friends, never as coordinates', async () => {
  const [a, b] = await pair();
  const res = await check(a, NSU, { accuracy: 20 });
  assert.equal(res.status, 200);
  assert.equal(res.body.onCampus, true);
  assert.equal((await friendView(b, a.id)).presence.state, 'here');
  assert.equal((await friendView(b, a.id)).presence.onCampus, true);

  // Nothing anywhere in the database holds the coordinates.
  const dump = JSON.stringify(await ctx.db.many('select * from presence')) + JSON.stringify(await ctx.db.many('select * from transitions'));
  assert.ok(!dump.includes('23.815') && !dump.includes('90.425'));

  await check(a, FAR_AWAY);
  assert.equal((await friendView(b, a.id)).presence.state, 'away');
  const t = await ctx.db.many('select zone, kind from transitions order by at');
  assert.deepEqual(t, [
    { zone: 'campus', kind: 'enter' },
    { zone: 'campus', kind: 'exit' },
  ]);
});

test('pausing hides you at once and ignores readings until you resume', async () => {
  const [a, b] = await pair();
  await check(a, NSU);
  await api('PATCH', '/api/me/privacy', { user: a, body: { sharingEnabled: false } });
  assert.equal((await friendView(b, a.id)).presence.state, 'off');
  const res = await check(a, NSU);
  assert.equal(res.body.status, 'paused');
  assert.equal((await ctx.db.one('select on_campus from presence where user_id = $1', [a.id])).on_campus, false);
  await api('PATCH', '/api/me/privacy', { user: a, body: { sharingEnabled: true } });
  await check(a, NSU);
  assert.equal((await friendView(b, a.id)).presence.state, 'here');
});

test('quiet hours (in Bangladesh time) look exactly like paused to friends', async () => {
  const [a, b] = await pair();
  await check(a, NSU);
  const hour = localHour();
  await ctx.db.exec('update profiles set quiet_hours_enabled = true, quiet_start = $2, quiet_end = $3 where id = $1', [a.id, hour, (hour + 1) % 24]);
  const seen = (await friendView(b, a.id)).presence;
  assert.deepEqual(seen, { state: 'off', onCampus: false, circles: [], updatedAt: null });
  assert.equal((await check(a, NSU)).body.status, 'quiet');
});

test('not sharing campus: friends see "away" even on campus', async () => {
  const [a, b] = await pair();
  await api('PATCH', '/api/me/privacy', { user: a, body: { shareCampus: false } });
  const res = await check(a, NSU);
  assert.equal(res.body.onCampus, false);
  assert.equal((await friendView(b, a.id)).presence.state, 'away');
  const zones = await api('GET', '/api/presence/zones', { user: a });
  assert.equal(zones.body.zones.length, 0, 'the phone stops watching the campus edge');
});

test('stale answers become "unknown"', async () => {
  const [a, b] = await pair();
  await check(a, NSU);
  await ctx.db.exec(`update presence set checked_at = now() - interval '4 hours' where user_id = $1`, [a.id]);
  assert.equal((await friendView(b, a.id)).presence.state, 'unknown');
});

test('inaccurate readings change nothing', async () => {
  const [a, b] = await pair();
  await check(a, NSU);
  const res = await check(a, FAR_AWAY, { accuracy: 2000 });
  assert.equal(res.body.status, 'inaccurate');
  assert.equal((await friendView(b, a.id)).presence.state, 'here');
});

test('circles: only members who share it see you there; turning detection off hides you', async () => {
  const [a, b] = await pair();
  const c = await createUser(ctx.db); // friend of a, not in the circle
  await befriend(ctx.db, a, c);
  await noQuietHours(ctx.db, c);
  const circleId = await makeCircle(ctx.db, b, [a]);

  const res = await check(a, LIBRARY);
  assert.deepEqual(res.body.circleIds, [circleId]);
  const byB = (await friendView(b, a.id)).presence;
  assert.deepEqual(byB.circles, [{ id: circleId, name: 'Library crew' }]);
  const byC = (await friendView(c, a.id)).presence;
  assert.deepEqual(byC.circles, [], 'not in the circle, so not told about it');
  assert.equal(byC.onCampus, true);

  const detail = await api('GET', `/api/circles/${circleId}`, { user: b });
  assert.equal(detail.body.members.find((m) => m.id === a.id).here, true);

  await api('PATCH', `/api/circles/${circleId}/me`, { user: a, body: { detectionEnabled: false } });
  assert.deepEqual((await friendView(b, a.id)).presence.circles, []);
  assert.equal((await api('GET', `/api/circles/${circleId}`, { user: b })).body.members.find((m) => m.id === a.id).here, null);
  assert.deepEqual((await check(a, LIBRARY)).body.circleIds, [], 'detection off: not even checked');
});

test('watch alerts follow the scope and only start after acceptance', async () => {
  const [a, b] = await pair();
  const circleId = await makeCircle(ctx.db, a, [b]);
  await api('PUT', '/api/me/push-token', { user: b, body: { token: 'ExponentPushToken[bbbbbbbbbbbb]', platform: 'android' } });

  const w = await api('POST', '/api/watches', { user: b, body: { userId: a.id, scope: 'campus' } });
  ctx.pushed.length = 0;
  await check(a, NSU);
  assert.equal(ctx.pushed.length, 0, 'not accepted yet');
  await check(a, FAR_AWAY);

  await api('POST', `/api/watches/${w.body.id}/accept`, { user: a });
  ctx.pushed.length = 0;
  await check(a, LIBRARY); // enters campus and the circle
  assert.deepEqual(ctx.pushed.map((m) => m.body), ['Nusrat is on campus.'], 'campus scope: no circle alerts');

  await ctx.db.exec(`update watches set scope = 'all'`);
  ctx.pushed.length = 0;
  await check(a, FAR_AWAY);
  assert.deepEqual(ctx.pushed.map((m) => m.body).sort(), ['Nusrat left Library crew.', 'Nusrat left campus.']);

  const feed = await api('GET', '/api/notifications', { user: b });
  assert.equal(feed.body.alerts.length, 4, 'enter and leave, campus and circle, all after acceptance');
  assert.ok(feed.body.alerts.every((x) => x.user.id === a.id));
  void circleId;
});

test('an "all" watch never reveals circles the watcher is not in', async () => {
  const [a, b] = await pair();
  const other = await createUser(ctx.db);
  await makeCircle(ctx.db, a, [other], { name: 'Secret club' });
  await ctx.db.exec(`insert into watches (watcher_id, watched_id, scope, status, accepted_at) values ($1, $2, 'all', 'active', now() - interval '1 minute')`, [b.id, a.id]);
  await api('PUT', '/api/me/push-token', { user: b, body: { token: 'ExponentPushToken[bbbbbbbbbbbb]', platform: 'android' } });
  ctx.pushed.length = 0;
  await check(a, LIBRARY);
  assert.ok(ctx.pushed.every((m) => !m.body.includes('Secret club')));
  const feed = await api('GET', '/api/notifications', { user: b });
  assert.ok(feed.body.alerts.every((x) => x.place.kind === 'campus'));
});

test('zones for the phone: campus and circles with detection on', async () => {
  const [a, b] = await pair();
  const circleId = await makeCircle(ctx.db, b, [a]);
  const zones = await api('GET', '/api/presence/zones', { user: a });
  assert.deepEqual(zones.body.zones.map((z) => z.kind), ['campus', 'circle']);
  assert.equal(zones.body.zones[1].id, `circle:${circleId}`);
  assert.equal(zones.body.zones[0].boundary.length, 4);
  await api('PATCH', '/api/me/privacy', { user: a, body: { sharingEnabled: false } });
  assert.deepEqual((await api('GET', '/api/presence/zones', { user: a })).body.zones, []);
});

test('bad readings are rejected', async () => {
  const [a] = await pair();
  assert.equal((await check(a, { lat: 91, lng: 90 })).status, 400);
  assert.equal((await check(a, { lat: 'x', lng: 90 })).status, 400);
  assert.equal((await api('POST', '/api/presence/check', { user: a, body: { lat: 23.8 } })).status, 400);
  assert.equal((await check(a, NSU, { extra: 1 })).status, 400);
});

test('location checks are rate limited per person', async () => {
  const [a, b] = await pair();
  await ctx.db.exec(`insert into app_settings (key, value) values ('limits', '{"presence": {"max": 3}}') on conflict (key) do update set value = excluded.value`);
  ctx.app.ctx.settings.invalidate();
  await ctx.app.ctx.settings.all();
  const statuses = [];
  for (let i = 0; i < 4; i++) statuses.push((await check(a, NSU)).status);
  assert.deepEqual(statuses, [200, 200, 200, 429]);
  assert.equal((await check(b, NSU)).status, 200, 'someone else on the same network is unaffected');
  await ctx.db.exec(`delete from app_settings where key = 'limits'`);
  ctx.app.ctx.settings.invalidate();
});
