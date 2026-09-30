import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { setup, teardown, reset, createUser, call, befriend, makeCircle, noQuietHours, LIBRARY, LIBRARY_ZONE } from './helpers.js';

let ctx;
before(async () => (ctx = await setup()));
after(teardown);
beforeEach(() => reset(ctx.db));

const api = (...args) => call(ctx.app, ...args);

async function trio() {
  const a = await createUser(ctx.db, { name: 'Admin Ana' });
  const b = await createUser(ctx.db, { name: 'Member Bina' });
  const c = await createUser(ctx.db, { name: 'Member Chayan' });
  await befriend(ctx.db, a, b);
  await befriend(ctx.db, a, c);
  return [a, b, c];
}

test('create a circle with friends, a zone and a map picture; invitees accept', async () => {
  const [a, b, c] = await trio();
  const stranger = await createUser(ctx.db);
  const png = await sharp({ create: { width: 1200, height: 900, channels: 3, background: '#88aacc' } }).png().toBuffer();
  const res = await api('POST', '/api/circles', {
    user: a,
    body: {
      name: ' Thesis group ',
      inviteeIds: [b.id, c.id, stranger.id],
      boundary: LIBRARY_ZONE,
      snapshotBase64: png.toString('base64'),
    },
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(res.body.invited, 2, 'strangers are skipped');
  const id = res.body.id;

  const file = [...ctx.files.keys()].find((k) => k.startsWith(`snapshots/${id}/`));
  const meta = await sharp(ctx.files.get(file)).metadata();
  assert.equal(meta.format, 'jpeg');
  assert.ok(meta.width <= 800);

  const inv = await api('GET', '/api/circles/invitations', { user: b });
  assert.equal(inv.body.invitations[0].name, 'Thesis group');
  assert.equal(inv.body.invitations[0].invitedBy.name, 'Admin Ana');
  assert.equal(inv.body.invitations[0].snapshotUrl, null, 'no zone picture before joining');

  const preview = await api('GET', `/api/circles/${id}`, { user: b });
  assert.equal(preview.status, 200);
  assert.equal(preview.body.me.status, 'pending');
  assert.ok(preview.body.members.every((m) => m.here === null), 'no status before joining');

  assert.equal((await api('POST', `/api/circles/${id}/accept`, { user: b })).status, 200);
  assert.equal((await api('POST', `/api/circles/${id}/decline`, { user: c })).status, 200);
  const list = await api('GET', '/api/circles', { user: b });
  assert.equal(list.body.circles[0].memberCount, 2);
  assert.match(list.body.circles[0].snapshotUrl, /signed/);
  assert.equal((await api('GET', `/api/circles/${id}`, { user: c })).status, 404);
  assert.equal((await api('GET', `/api/circles/${id}`, { user: stranger })).status, 404);
});

test('a circle needs at least one friend invited', async () => {
  const a = await createUser(ctx.db);
  const stranger = await createUser(ctx.db);
  const res = await api('POST', '/api/circles', { user: a, body: { name: 'Solo', inviteeIds: [stranger.id] } });
  assert.equal(res.status, 400);
  assert.equal((await ctx.db.one('select count(*) as n from circles')).n, 0, 'rolled back');
});

test('zones must be sensible shapes', async () => {
  const [a, b] = await trio();
  const bowtie = [
    { lat: 23.8150, lng: 90.4250 },
    { lat: 23.8160, lng: 90.4260 },
    { lat: 23.8150, lng: 90.4260 },
    { lat: 23.8160, lng: 90.4250 },
  ];
  const r1 = await api('POST', '/api/circles', { user: a, body: { name: 'X', inviteeIds: [b.id], boundary: bowtie } });
  assert.equal(r1.status, 400);
  assert.equal(r1.body.code, 'invalid_zone');
  const huge = [
    { lat: 23.7, lng: 90.3 },
    { lat: 23.7, lng: 90.5 },
    { lat: 23.9, lng: 90.5 },
  ];
  assert.equal((await api('POST', '/api/circles', { user: a, body: { name: 'X', inviteeIds: [b.id], boundary: huge } })).body.code, 'zone_too_big');
  const many = Array.from({ length: 101 }, (_, i) => ({ lat: 23.815 + Math.sin(i) / 1000, lng: 90.425 + Math.cos(i) / 1000 }));
  assert.equal((await api('POST', '/api/circles', { user: a, body: { name: 'X', inviteeIds: [b.id], boundary: many } })).status, 400);
});

test('admin-only changes; members and strangers are refused', async () => {
  const [a, b] = await trio();
  const stranger = await createUser(ctx.db);
  const id = await makeCircle(ctx.db, a, [b]);
  for (const [method, url, body] of [
    ['PATCH', `/api/circles/${id}`, { name: 'Renamed' }],
    ['DELETE', `/api/circles/${id}`],
    ['PUT', `/api/circles/${id}/zone`, { boundary: LIBRARY_ZONE }],
    ['DELETE', `/api/circles/${id}/zone`],
    ['PATCH', `/api/circles/${id}/members/${a.id}`, { role: 'member' }],
    ['DELETE', `/api/circles/${id}/members/${a.id}`],
  ]) {
    assert.equal((await api(method, url, { user: b, body })).status, 403, `${method} ${url} as member`);
    assert.equal((await api(method, url, { user: stranger, body })).status, 404, `${method} ${url} as stranger`);
  }
  assert.equal((await api('PATCH', `/api/circles/${id}`, { user: a, body: { name: 'Renamed' } })).status, 200);
});

test('chat links must be real group-chat links', async () => {
  const [a, b] = await trio();
  const id = await makeCircle(ctx.db, a, [b]);
  const set = (messengerLink) => api('PATCH', `/api/circles/${id}`, { user: a, body: { messengerLink } });
  assert.equal((await set('javascript:alert(1)')).status, 400);
  assert.equal((await set('http://m.me/j/abc')).status, 400);
  assert.equal((await set('https://evil.example/m.me')).status, 400);
  assert.equal((await set('https://m.me/j/AbCdEf')).status, 200);
  assert.equal((await set('https://chat.whatsapp.com/Abc123')).status, 200);
  assert.equal((await set(null)).status, 200);
});

test('inviting: admins always; members only when allowed; only their friends', async () => {
  const [a, b, c] = await trio();
  const d = await createUser(ctx.db);
  await befriend(ctx.db, b, d);
  const id = await makeCircle(ctx.db, a, [b]);
  assert.equal((await api('POST', `/api/circles/${id}/members`, { user: b, body: { userIds: [d.id] } })).status, 403);
  await api('PATCH', `/api/circles/${id}`, { user: a, body: { membersCanInvite: true } });
  const r = await api('POST', `/api/circles/${id}/members`, { user: b, body: { userIds: [d.id, c.id] } });
  assert.equal(r.body.invited, 1, 'b is not friends with c');
  const r2 = await api('POST', `/api/circles/${id}/members`, { user: a, body: { userIds: [c.id, d.id] } });
  assert.equal(r2.body.invited, 1, 'd was already invited');
});

test('removing and leaving keep the circle usable', async () => {
  const [a, b, c] = await trio();
  const id = await makeCircle(ctx.db, a, [b, c]);
  await api('PATCH', `/api/circles/${id}/members/${b.id}`, { user: a, body: { role: 'admin' } });
  assert.equal((await api('DELETE', `/api/circles/${id}/members/${a.id}`, { user: b })).status, 403, 'admins can’t remove admins');
  assert.equal((await api('PATCH', `/api/circles/${id}/members/${b.id}`, { user: b, body: { role: 'member' } })).status, 200);
  assert.equal((await api('PATCH', `/api/circles/${id}/members/${a.id}`, { user: a, body: { role: 'member' } })).status, 409, 'last admin');
  assert.equal((await api('DELETE', `/api/circles/${id}/members/${c.id}`, { user: a })).status, 200);

  // The last admin leaves: the longest-standing member takes over.
  assert.equal((await api('DELETE', `/api/circles/${id}/members/${a.id}`, { user: a })).status, 200);
  assert.equal((await ctx.db.one('select role from circle_members where circle_id = $1 and user_id = $2', [id, b.id])).role, 'admin');
  // The last person leaves: the circle is gone.
  await api('DELETE', `/api/circles/${id}/members/${b.id}`, { user: b });
  assert.equal(await ctx.db.one('select id from circles where id = $1', [id]), null);
});

test('the activity feed shows members who still share with you, today only', async () => {
  const [a, b, c] = await trio();
  await noQuietHours(ctx.db, a, b, c);
  const id = await makeCircle(ctx.db, a, [b, c]);
  await api('POST', '/api/presence/check', { user: b, body: LIBRARY });
  await api('POST', '/api/presence/check', { user: c, body: LIBRARY });
  await ctx.db.exec(`insert into transitions (user_id, zone, circle_id, kind, at) values ($1, 'circle', $2, 'exit', now() - interval '2 days')`, [b.id, id]);

  let feed = await api('GET', `/api/circles/${id}/activity`, { user: a });
  assert.equal(feed.body.events.length, 2);
  await api('PATCH', `/api/circles/${id}/me`, { user: c, body: { detectionEnabled: false } });
  await api('POST', '/api/blocks', { user: b, body: { userId: a.id } });
  feed = await api('GET', `/api/circles/${id}/activity`, { user: a });
  assert.equal(feed.body.events.length, 0, 'detection off and blocked are both hidden');
  const detail = await api('GET', `/api/circles/${id}`, { user: a });
  assert.ok(!detail.body.members.some((m) => m.id === b.id), 'blocked members are hidden from each other');
});

test('zone read and delete; deleting clears everyone’s presence in it', async () => {
  const [a, b] = await trio();
  await noQuietHours(ctx.db, a, b);
  const id = await makeCircle(ctx.db, a, [b]);
  await api('POST', '/api/presence/check', { user: b, body: LIBRARY });
  const zone = await api('GET', `/api/circles/${id}/zone`, { user: b });
  assert.equal(zone.body.boundary.length, 4);
  assert.equal((await api('DELETE', `/api/circles/${id}/zone`, { user: a })).status, 200);
  assert.deepEqual((await ctx.db.one('select circle_ids from presence where user_id = $1', [b.id])).circle_ids, []);
  assert.equal((await api('GET', `/api/circles/${id}/zone`, { user: b })).body.boundary, null);
});
