import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setup, teardown, reset, createUser, call, befriend } from './helpers.js';

let ctx;
before(async () => (ctx = await setup()));
after(teardown);
beforeEach(() => reset(ctx.db));

const api = (...args) => call(ctx.app, ...args);

test('send by friend code, the receiver accepts, both see each other', async () => {
  const a = await createUser(ctx.db, { name: 'Nusrat' });
  const b = await createUser(ctx.db, { name: 'Rafi' });
  const sent = await api('POST', '/api/friends/requests', { user: a, body: { friendCode: b.friendCode.toLowerCase() } });
  assert.equal(sent.status, 201);
  assert.equal(ctx.pushed.length, 0, 'no push without a device token');

  const incoming = await api('GET', '/api/friends/requests', { user: b });
  assert.equal(incoming.body.incoming.length, 1);
  assert.equal(incoming.body.incoming[0].user.name, 'Nusrat');
  assert.ok(!('email' in incoming.body.incoming[0].user));

  const accepted = await api('POST', `/api/friends/requests/${incoming.body.incoming[0].id}/accept`, { user: b });
  assert.equal(accepted.status, 200);
  const list = await api('GET', '/api/friends', { user: a });
  assert.deepEqual(list.body.friends.map((f) => f.name), ['Rafi']);
  assert.equal((await api('GET', '/api/friends/requests', { user: b })).body.incoming.length, 0);
});

test('only the receiver can accept; the sender and strangers cannot', async () => {
  const a = await createUser(ctx.db);
  const b = await createUser(ctx.db);
  const stranger = await createUser(ctx.db);
  await api('POST', '/api/friends/requests', { user: a, body: { userId: b.id } });
  const { id } = await ctx.db.one('select id from friend_requests');
  assert.equal((await api('POST', `/api/friends/requests/${id}/accept`, { user: a })).status, 404);
  assert.equal((await api('POST', `/api/friends/requests/${id}/accept`, { user: stranger })).status, 404);
  assert.equal((await api('DELETE', `/api/friends/requests/${id}`, { user: stranger })).status, 404);
  assert.equal((await ctx.db.one('select count(*) as n from friendships')).n, 0);
  // The sender can cancel.
  assert.equal((await api('DELETE', `/api/friends/requests/${id}`, { user: a })).status, 200);
  assert.equal((await ctx.db.one('select count(*) as n from friend_requests')).n, 0);
});

test('asking someone who already asked you makes you friends', async () => {
  const a = await createUser(ctx.db);
  const b = await createUser(ctx.db);
  await api('POST', '/api/friends/requests', { user: a, body: { userId: b.id } });
  const res = await api('POST', '/api/friends/requests', { user: b, body: { userId: a.id } });
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'friends');
  assert.equal((await ctx.db.one('select count(*) as n from friendships')).n, 1);
  assert.equal((await ctx.db.one('select count(*) as n from friend_requests')).n, 0);
});

test('yourself, existing friends, unknown codes and duplicates', async () => {
  const a = await createUser(ctx.db);
  const b = await createUser(ctx.db);
  assert.equal((await api('POST', '/api/friends/requests', { user: a, body: { friendCode: a.friendCode } })).status, 400);
  assert.equal((await api('POST', '/api/friends/requests', { user: a, body: { friendCode: 'ZZZZZZZZ' } })).status, 404);
  assert.equal((await api('POST', '/api/friends/requests', { user: a, body: { friendCode: 'bad' } })).status, 400);
  assert.equal((await api('POST', '/api/friends/requests', { user: a, body: {} })).status, 400);
  assert.equal(
    (await api('POST', '/api/friends/requests', { user: a, body: { userId: b.id, friendCode: b.friendCode } })).status,
    400,
    'one way at a time',
  );
  await api('POST', '/api/friends/requests', { user: a, body: { userId: b.id } });
  assert.equal((await api('POST', '/api/friends/requests', { user: a, body: { userId: b.id } })).status, 201, 'repeat is harmless');
  assert.equal((await ctx.db.one('select count(*) as n from friend_requests')).n, 1);
  await befriend(ctx.db, a, b);
  assert.equal((await api('POST', '/api/friends/requests', { user: a, body: { userId: b.id } })).status, 409);
});

test('blocked people look like wrong codes', async () => {
  const a = await createUser(ctx.db);
  const b = await createUser(ctx.db);
  await api('POST', '/api/blocks', { user: b, body: { userId: a.id } });
  const res = await api('POST', '/api/friends/requests', { user: a, body: { friendCode: b.friendCode } });
  assert.equal(res.status, 404);
  assert.equal((await api('POST', '/api/friends/requests', { user: b, body: { userId: a.id } })).status, 404);
});

test('a friend request push goes to the receiver’s devices when they want it', async () => {
  const a = await createUser(ctx.db, { name: 'Nusrat' });
  const b = await createUser(ctx.db);
  await api('PUT', '/api/me/push-token', { user: b, body: { token: 'ExponentPushToken[bbbbbbbbbbbb]', platform: 'android' } });
  await api('POST', '/api/friends/requests', { user: a, body: { userId: b.id } });
  assert.equal(ctx.pushed.length, 1);
  assert.equal(ctx.pushed[0].to, 'ExponentPushToken[bbbbbbbbbbbb]');
  assert.match(ctx.pushed[0].body, /Nusrat/);

  const c = await createUser(ctx.db);
  await api('PATCH', '/api/me/notifications', { user: b, body: { friendRequests: false } });
  await api('POST', '/api/friends/requests', { user: c, body: { userId: b.id } });
  assert.equal(ctx.pushed.length, 1, 'turned off');
});

test('unfriending ends watches both ways', async () => {
  const a = await createUser(ctx.db);
  const b = await createUser(ctx.db);
  await befriend(ctx.db, a, b);
  await ctx.db.exec(`insert into watches (watcher_id, watched_id, status) values ($1, $2, 'active'), ($2, $1, 'pending')`, [a.id, b.id]);
  assert.equal((await api('DELETE', `/api/friends/${b.id}`, { user: a })).status, 200);
  assert.equal((await ctx.db.one('select count(*) as n from watches')).n, 0);
  assert.equal((await api('DELETE', `/api/friends/${b.id}`, { user: a })).status, 404);
});

test('watch: only the watched person can accept (the old self-accept hole)', async () => {
  const a = await createUser(ctx.db);
  const b = await createUser(ctx.db);
  await befriend(ctx.db, a, b);
  const req = await api('POST', '/api/watches', { user: a, body: { userId: b.id, scope: 'campus' } });
  assert.equal(req.status, 201);
  // The watcher knows the id (it was returned to them) and tries to approve it themselves.
  assert.equal((await api('POST', `/api/watches/${req.body.id}/accept`, { user: a })).status, 404);
  assert.equal((await ctx.db.one('select status from watches')).status, 'pending');
  assert.equal((await api('POST', `/api/watches/${req.body.id}/accept`, { user: b })).status, 200);
  assert.equal((await ctx.db.one('select status from watches')).status, 'active');
});

test('watch: friends only, no duplicates, either side can end it, strangers cannot', async () => {
  const a = await createUser(ctx.db);
  const b = await createUser(ctx.db);
  const stranger = await createUser(ctx.db);
  assert.equal((await api('POST', '/api/watches', { user: a, body: { userId: b.id, scope: 'all' } })).status, 404);
  await befriend(ctx.db, a, b);
  const w = await api('POST', '/api/watches', { user: a, body: { userId: b.id, scope: 'all' } });
  assert.equal((await api('POST', '/api/watches', { user: a, body: { userId: b.id, scope: 'campus' } })).status, 409);
  assert.equal((await api('POST', '/api/watches', { user: a, body: { userId: a.id, scope: 'campus' } })).status, 404);
  assert.equal((await api('DELETE', `/api/watches/${w.body.id}`, { user: stranger })).status, 404);
  assert.equal((await api('POST', `/api/watches/${w.body.id}/accept`, { user: stranger })).status, 404);
  const lists = await api('GET', '/api/watches', { user: b });
  assert.equal(lists.body.watchers.length, 1);
  assert.equal(lists.body.watchers[0].status, 'pending');
  assert.equal((await api('DELETE', `/api/watches/${w.body.id}`, { user: b })).status, 200);
});

test('watch: turned off by an admin switch', async () => {
  const a = await createUser(ctx.db);
  const b = await createUser(ctx.db);
  await befriend(ctx.db, a, b);
  await ctx.db.exec(`update app_settings set value = '{"watch": false, "feed": true}' where key = 'features'`);
  ctx.app.ctx.settings.invalidate();
  assert.equal((await api('POST', '/api/watches', { user: a, body: { userId: b.id, scope: 'campus' } })).status, 403);
  ctx.app.ctx.settings.invalidate();
});

test('blocking ends friendship, requests and watches, and hides people from search', async () => {
  const a = await createUser(ctx.db, { name: 'Nusrat Jahan' });
  const b = await createUser(ctx.db, { name: 'Rafi Hasan' });
  await befriend(ctx.db, a, b);
  await ctx.db.exec(`insert into watches (watcher_id, watched_id, status) values ($1, $2, 'active')`, [b.id, a.id]);
  assert.equal((await api('POST', '/api/blocks', { user: a, body: { userId: b.id } })).status, 200);
  assert.equal((await api('GET', '/api/friends', { user: b })).body.friends.length, 0);
  assert.equal((await ctx.db.one('select count(*) as n from watches')).n, 0);
  assert.equal((await api('GET', '/api/users/search?q=nusrat', { user: b })).body.results.length, 0);
  assert.equal((await api('GET', `/api/users/by-code/${a.friendCode}`, { user: b })).status, 404);
  assert.equal((await api('GET', '/api/blocks', { user: a })).body.blocked.length, 1);
  assert.equal((await api('POST', '/api/blocks', { user: a, body: { userId: a.id } })).status, 400);
  assert.equal((await api('DELETE', `/api/blocks/${b.id}`, { user: a })).status, 200);
  assert.equal((await api('GET', '/api/users/search?q=nusrat', { user: b })).body.results.length, 1);
});
