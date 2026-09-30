import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setup, teardown, reset, createUser, call, befriend, makeCircle } from './helpers.js';

let ctx;
before(async () => (ctx = await setup()));
after(teardown);
beforeEach(() => reset(ctx.db));

const api = (...args) => call(ctx.app, ...args);

test('search: own university by name, anyone by exact code, never by email', async () => {
  const a = await createUser(ctx.db, { name: 'Asker' });
  await createUser(ctx.db, { name: 'Nusrat Jahan', email: 'nusrat@northsouth.edu' });
  const bracu = await createUser(ctx.db, { name: 'Nusrat Other', email: 'n@bracu.ac.bd' });
  let r = await api('GET', '/api/users/search?q=nusrat', { user: a });
  assert.deepEqual(r.body.results.map((x) => x.name), ['Nusrat Jahan']);
  assert.ok(!('email' in r.body.results[0]));
  assert.equal(r.body.results[0].relationship, 'none');
  r = await api('GET', `/api/users/search?q=${bracu.friendCode}`, { user: a });
  assert.deepEqual(r.body.results.map((x) => x.name), ['Nusrat Other']);
  r = await api('GET', '/api/users/search?q=nusrat%40northsouth.edu', { user: a });
  assert.equal(r.body.results.length, 0);
  assert.equal((await api('GET', '/api/users/search?q=a', { user: a })).status, 400);
  assert.equal((await api('GET', '/api/users/search?q=nusrat')).status, 401);
});

test('search wildcards are matched literally', async () => {
  const a = await createUser(ctx.db);
  await createUser(ctx.db, { name: 'Rafi' });
  assert.equal((await api('GET', '/api/users/search?q=%25%25', { user: a })).body.results.length, 0);
  assert.equal((await api('GET', '/api/users/search?q=__', { user: a })).body.results.length, 0);
});

test('a person’s card only when you already have something to do with them', async () => {
  const a = await createUser(ctx.db);
  const b = await createUser(ctx.db);
  const c = await createUser(ctx.db);
  const d = await createUser(ctx.db);
  await befriend(ctx.db, a, b);
  await makeCircle(ctx.db, a, [c]);
  assert.equal((await api('GET', `/api/users/${b.id}`, { user: a })).body.user.relationship, 'friend');
  assert.equal((await api('GET', `/api/users/${c.id}`, { user: a })).status, 200);
  assert.equal((await api('GET', `/api/users/${d.id}`, { user: a })).status, 404);
  assert.equal((await api('GET', `/api/users/${a.id}`, { user: a })).body.user.relationship, 'self');
});

test('reports: people and circles you know; stored for moderators', async () => {
  const a = await createUser(ctx.db);
  const b = await createUser(ctx.db);
  const circle = await makeCircle(ctx.db, b, []);
  assert.equal((await api('POST', '/api/reports', { user: a, body: { userId: b.id, reason: 'harassment', details: 'Keeps messaging' } })).status, 201);
  assert.equal((await api('POST', '/api/reports', { user: a, body: { circleId: circle, reason: 'spam' } })).status, 404, 'not in that circle');
  assert.equal((await api('POST', '/api/reports', { user: a, body: { reason: 'spam' } })).status, 400);
  assert.equal((await api('POST', '/api/reports', { user: a, body: { userId: a.id, reason: 'spam' } })).status, 400);
  assert.equal((await api('POST', '/api/reports', { user: a, body: { userId: b.id, reason: 'made-up' } })).status, 400);
  assert.equal((await ctx.db.one('select count(*) as n from reports')).n, 1);
});

test('feedback', async () => {
  const a = await createUser(ctx.db);
  assert.equal((await api('POST', '/api/feedback', { user: a, body: { message: 'Love it', appVersion: '1.0.0', screen: 'Home' } })).status, 201);
  assert.equal((await api('POST', '/api/feedback', { user: a, body: { message: '   ' } })).status, 400);
});

test('notifications list what is waiting for you', async () => {
  const a = await createUser(ctx.db, { name: 'Nusrat' });
  const b = await createUser(ctx.db);
  const c = await createUser(ctx.db);
  await befriend(ctx.db, a, b);
  await api('POST', '/api/friends/requests', { user: c, body: { userId: a.id } });
  await api('POST', '/api/watches', { user: b, body: { userId: a.id, scope: 'campus' } });
  await api('POST', '/api/circles', { user: b, body: { name: 'Study', inviteeIds: [a.id] } });
  const n = await api('GET', '/api/notifications', { user: a });
  assert.deepEqual(n.body.waiting.map((x) => x.type).sort(), ['circle_invite', 'friend_request', 'watch_request']);
  assert.equal((await api('GET', '/api/notifications?before=yesterday', { user: a })).status, 400);
});

test('maintenance mode: reading works, changing does not', async () => {
  const a = await createUser(ctx.db);
  await ctx.db.exec(`update app_settings set value = '{"enabled": true, "message": "Back at 3 PM"}' where key = 'maintenance'`);
  ctx.app.ctx.settings.invalidate();
  assert.equal((await api('GET', '/api/me', { user: a })).status, 200);
  const res = await api('PATCH', '/api/me', { user: a, body: { name: 'X' } });
  assert.equal(res.status, 503);
  assert.equal(res.body.error, 'Back at 3 PM');
  assert.equal((await api('GET', '/api/config')).body.maintenance.enabled, true);
  await ctx.db.exec(`update app_settings set value = '{"enabled": false, "message": ""}' where key = 'maintenance'`);
  ctx.app.ctx.settings.invalidate();
});

test('oversized bodies are refused', async () => {
  const a = await createUser(ctx.db);
  const res = await api('POST', '/api/feedback', { user: a, body: { message: 'x'.repeat(300 * 1024) } });
  assert.equal(res.status, 413);
});
