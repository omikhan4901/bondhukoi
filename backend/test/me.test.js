import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { setup, teardown, reset, createUser, call, befriend, makeCircle } from './helpers.js';

let ctx;
before(async () => (ctx = await setup()));
after(teardown);
beforeEach(() => reset(ctx.db));

const api = (...args) => call(ctx.app, ...args);

test('profile: your own email, friend code and university; updates are cleaned', async () => {
  const a = await createUser(ctx.db, { name: 'Nusrat', email: 'nusrat@northsouth.edu' });
  const me = await api('GET', '/api/me', { user: a });
  assert.equal(me.body.user.email, 'nusrat@northsouth.edu');
  assert.equal(me.body.user.university.shortName, 'NSU');
  assert.match(me.body.user.friendCode, /^[A-HJ-NP-Z2-9]{8}$/);
  assert.equal(me.body.privacy.quietStart, 18);

  const upd = await api('PATCH', '/api/me', { user: a, body: { name: '  Nusrat   Jahan ', instagram: '@nusrat.j' } });
  assert.equal(upd.body.user.name, 'Nusrat Jahan');
  assert.equal(upd.body.user.instagram, 'nusrat.j');
  assert.equal((await api('PATCH', '/api/me', { user: a, body: { facebook: 'https://evil.example/x' } })).status, 400);
  assert.equal((await api('PATCH', '/api/me', { user: a, body: { name: '   ' } })).status, 400);
  assert.equal((await api('PATCH', '/api/me', { user: a, body: { role: 'admin' } })).status, 400, 'unknown fields are refused');
  assert.equal((await api('PATCH', '/api/me/privacy', { user: a, body: { quietStart: 24 } })).status, 400);
});

test('avatar: re-encoded to a small JPEG with no metadata, old file removed', async () => {
  const a = await createUser(ctx.db);
  const withExif = await sharp({ create: { width: 900, height: 600, channels: 3, background: '#c2410c' } })
    .jpeg()
    .withExif({ IFD0: { Make: 'PhoneCo', Model: 'Secret' } })
    .toBuffer();
  const res = await api('POST', '/api/me/avatar', { user: a, body: { imageBase64: withExif.toString('base64') } });
  assert.equal(res.status, 200);
  const [key] = [...ctx.files.keys()];
  const meta = await sharp(ctx.files.get(key)).metadata();
  assert.equal(meta.width, 256);
  assert.equal(meta.exif, undefined);
  assert.ok(res.body.user.avatarUrl.endsWith(key.replace('avatars/', '')));

  await api('POST', '/api/me/avatar', { user: a, body: { imageBase64: withExif.toString('base64') } });
  assert.equal(ctx.files.size, 1, 'the previous photo is deleted');
  assert.equal((await api('POST', '/api/me/avatar', { user: a, body: { imageBase64: Buffer.from('not an image at all').toString('base64') } })).status, 400);
  await api('DELETE', '/api/me/avatar', { user: a });
  assert.equal(ctx.files.size, 0);
});

test('deleting your account removes everything and hands your circles over', async () => {
  const a = await createUser(ctx.db);
  const b = await createUser(ctx.db);
  await befriend(ctx.db, a, b);
  const shared = await makeCircle(ctx.db, a, [b]);
  const solo = await makeCircle(ctx.db, a, []);
  await ctx.db.exec(`insert into watches (watcher_id, watched_id) values ($1, $2)`, [b.id, a.id]);
  await ctx.db.exec(`insert into transitions (user_id, zone, kind) values ($1, 'campus', 'enter')`, [a.id]);

  assert.equal((await api('DELETE', '/api/me', { user: a, body: {} })).status, 400, 'needs confirmation');
  assert.equal((await api('DELETE', '/api/me', { user: a, body: { confirm: 'DELETE' } })).status, 200);
  for (const table of ['profiles', 'friendships', 'watches', 'transitions']) {
    const n = await ctx.db.one(`select count(*) as n from ${table} where ${table === 'profiles' ? 'id' : table === 'friendships' ? 'user_a' : table === 'watches' ? 'watched_id' : 'user_id'} = $1`, [a.id]);
    assert.equal(n.n, 0, table);
  }
  assert.equal((await ctx.db.one('select role from circle_members where circle_id = $1 and user_id = $2', [shared, b.id])).role, 'admin');
  assert.equal(await ctx.db.one('select id from circles where id = $1', [solo]), null);
  assert.equal((await api('GET', '/api/me', { user: a })).status, 401);
});

test('who can see me', async () => {
  const a = await createUser(ctx.db);
  const b = await createUser(ctx.db, { name: 'Watcher' });
  const c = await createUser(ctx.db, { name: 'Blocked' });
  await befriend(ctx.db, a, b);
  await makeCircle(ctx.db, a, [b]);
  await ctx.db.exec(`insert into watches (watcher_id, watched_id, scope) values ($1, $2, 'all')`, [b.id, a.id]);
  await api('POST', '/api/blocks', { user: a, body: { userId: c.id } });
  const v = await api('GET', '/api/me/visibility', { user: a });
  assert.equal(v.body.friends.length, 1);
  assert.equal(v.body.circles[0].otherMembers, 1);
  assert.equal(v.body.watchers[0].user.name, 'Watcher');
  assert.equal(v.body.watchers[0].status, 'pending');
  assert.equal(v.body.blocked[0].name, 'Blocked');
});

test('push tokens move to whoever signed in on the device last', async () => {
  const a = await createUser(ctx.db);
  const b = await createUser(ctx.db);
  const token = 'ExponentPushToken[cccccccccccc]';
  await api('PUT', '/api/me/push-token', { user: a, body: { token, platform: 'android' } });
  await api('PUT', '/api/me/push-token', { user: b, body: { token, platform: 'android' } });
  assert.equal((await ctx.db.one('select user_id from push_tokens')).user_id, b.id);
  assert.equal((await api('PUT', '/api/me/push-token', { user: a, body: { token: 'nope', platform: 'android' } })).status, 400);
  await api('DELETE', '/api/me/push-token', { user: a, body: { token } });
  assert.equal((await ctx.db.one('select count(*) as n from push_tokens')).n, 1, 'a can’t remove b’s token');
});

test('choosing 24-hour history deletes older events straight away', async () => {
  const a = await createUser(ctx.db);
  await api('PATCH', '/api/me/privacy', { user: a, body: { shortHistory: false } });
  await ctx.db.exec(`insert into transitions (user_id, zone, kind, at) values ($1, 'campus', 'enter', now() - interval '3 days'), ($1, 'campus', 'exit', now())`, [a.id]);
  await api('PATCH', '/api/me/privacy', { user: a, body: { shortHistory: true } });
  assert.equal((await ctx.db.one('select count(*) as n from transitions')).n, 1);
});
