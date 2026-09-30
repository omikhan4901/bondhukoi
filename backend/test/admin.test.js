import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setup, teardown, reset, createUser, call, befriend, makeCircle, noQuietHours, NSU_ZONE, LIBRARY } from './helpers.js';
import { collectAlerts } from '../src/routes/internal.js';

let ctx;
before(async () => (ctx = await setup()));
after(teardown);
beforeEach(() => reset(ctx.db));

const api = (...args) => call(ctx.app, ...args);

async function admin(role = 'super', aal = 'aal2') {
  const u = await createUser(ctx.db, { name: `${role} admin`, aal });
  await ctx.db.exec('insert into admins (user_id, role) values ($1, $2)', [u.id, role]);
  return u;
}

test('the console needs an admin with two-factor on', async () => {
  const user = await createUser(ctx.db);
  assert.equal((await api('GET', '/api/admin/overview', { user })).status, 403);
  const noTwoFactor = await admin('super', 'aal1');
  const res = await api('GET', '/api/admin/overview', { user: noTwoFactor });
  assert.equal(res.status, 403);
  assert.equal(res.body.code, 'two_factor_required');
  assert.equal((await api('GET', '/api/admin/overview', { user: await admin() })).status, 200);
});

test('moderators can moderate but not change settings, bans, admins or universities', async () => {
  const mod = await admin('moderator');
  const target = await createUser(ctx.db);
  const uni = await ctx.db.one(`select id from universities where short_name = 'NSU'`);
  for (const [method, url, body] of [
    ['PUT', '/api/admin/settings/maintenance', { enabled: true, message: '' }],
    ['PUT', '/api/admin/limits', { presence: 5 }],
    ['POST', `/api/admin/users/${target.id}/ban`, {}],
    ['DELETE', `/api/admin/users/${target.id}`, { confirm: 'DELETE' }],
    ['POST', '/api/admin/admins', { email: 'x@northsouth.edu', role: 'moderator' }],
    ['POST', '/api/admin/universities', { name: 'X U', shortName: 'XU', emailDomains: ['x.edu'] }],
    ['PUT', `/api/admin/universities/${uni.id}/boundary`, { boundary: NSU_ZONE }],
    ['POST', '/api/admin/invites', { maxUses: 10 }],
  ]) {
    assert.equal((await api(method, url, { user: mod, body })).status, 403, `${method} ${url}`);
  }
  assert.equal((await api('POST', `/api/admin/users/${target.id}/suspend`, { user: mod, body: { reason: 'spam' } })).status, 200);
  const other = await admin('moderator');
  assert.equal((await api('POST', `/api/admin/users/${other.id}/suspend`, { user: mod, body: {} })).status, 403, 'not on other admins');
});

test('suspending signs someone out, hides them, and is audited; restoring undoes it', async () => {
  const boss = await admin();
  const a = await createUser(ctx.db, { name: 'Troublemaker' });
  const b = await createUser(ctx.db);
  await befriend(ctx.db, a, b);
  await noQuietHours(ctx.db, a);
  await api('POST', '/api/presence/check', { user: a, body: LIBRARY });

  assert.equal((await api('POST', `/api/admin/users/${a.id}/suspend`, { user: boss, body: { reason: 'Harassment reports' } })).status, 200);
  assert.equal((await api('GET', '/api/me', { user: a })).status, 401, 'existing session ended');
  const friends = await api('GET', '/api/friends', { user: b });
  assert.equal(friends.body.friends[0].presence.state, 'off');
  const log = await api('GET', '/api/admin/audit', { user: boss });
  assert.equal(log.body.entries[0].action, 'user_suspended');
  assert.equal(log.body.entries[0].after.reason, 'Harassment reports');

  await api('POST', `/api/admin/users/${a.id}/restore`, { user: boss, body: {} });
  assert.equal((await ctx.db.one('select status from profiles where id = $1', [a.id])).status, 'active');
  assert.equal((await api('POST', `/api/admin/users/${boss.id}/suspend`, { user: boss, body: {} })).status, 400, 'not yourself');
});

test('no admin route ever returns where anyone is', async () => {
  const boss = await admin();
  const a = await createUser(ctx.db);
  const b = await createUser(ctx.db);
  await befriend(ctx.db, a, b);
  await noQuietHours(ctx.db, a, b);
  const circle = await makeCircle(ctx.db, a, [b]);
  await api('POST', '/api/presence/check', { user: a, body: LIBRARY });
  await api('POST', '/api/reports', { user: b, body: { userId: a.id, reason: 'spam' } });

  const ids = { userId: a.id, circleId: circle, universityId: (await ctx.db.one('select id from universities limit 1')).id };
  const forbiddenKeys = ['on_campus', 'onCampus', 'circle_ids', 'circleIds', 'presence', 'here', 'checked_at', 'transitions', 'lat', 'lng'];
  const gets = ctx.app.routeList.filter((r) => r.method === 'GET' && r.url.startsWith('/api/admin'));
  assert.ok(gets.length >= 12);
  for (const r of gets) {
    const url = r.url.replace(/:([a-zA-Z]+)/g, (_, n) => ids[n]);
    const res = await api('GET', url, { user: boss });
    assert.equal(res.status, 200, url);
    const found = [];
    JSON.stringify(res.body, (k, v) => {
      if (forbiddenKeys.includes(k) && !(r.url.startsWith('/api/admin/universities') && ['lat', 'lng'].includes(k))) found.push(k);
      return v;
    });
    assert.deepEqual(found, [], `${url} returned ${found.join(', ')}`);
  }
});

test('settings take effect, limits can be tuned, and both are audited', async () => {
  const boss = await admin();
  const user = await createUser(ctx.db);
  assert.equal((await api('PUT', '/api/admin/settings/banner', { user: boss, body: { text: 'Exams week: be kind', tone: 'info' } })).status, 200);
  assert.equal((await api('GET', '/api/config')).body.banner.text, 'Exams week: be kind');
  assert.equal((await api('PUT', '/api/admin/settings/minAppVersion', { user: boss, body: { value: '1.2' } })).status, 400);
  assert.equal((await api('PUT', '/api/admin/settings/minAppVersion', { user: boss, body: { value: '1.2.0' } })).status, 200);
  assert.equal((await api('PUT', '/api/admin/settings/signups', { user: boss, body: { open: false } })).status, 400, 'all fields needed');

  await api('PUT', '/api/admin/limits', { user: boss, body: { search: 2 } });
  const limits = await api('GET', '/api/admin/limits', { user: boss });
  assert.equal(limits.body.limits.find((l) => l.name === 'search').max, 2);
  const codes = [];
  for (let i = 0; i < 3; i++) codes.push((await api('GET', '/api/users/search?q=ab', { user })).status);
  assert.deepEqual(codes, [200, 200, 429]);
  await api('PUT', '/api/admin/limits', { user: boss, body: { search: null } });
  assert.equal((await api('GET', '/api/admin/limits', { user: boss })).body.limits.find((l) => l.name === 'search').max, 30);

  const actions = (await api('GET', '/api/admin/audit', { user: boss })).body.entries.map((e) => e.action);
  assert.ok(actions.filter((a) => a === 'setting_changed').length >= 2);
  assert.ok(actions.includes('limits_changed'));
});

test('invites: random codes that work at sign-up', async () => {
  const boss = await admin();
  const res = await api('POST', '/api/admin/invites', { user: boss, body: { maxUses: 2, note: 'Beta 1' } });
  assert.match(res.body.code, /^BK-[A-HJ-NP-Z2-9]{6}$/);
  await api('PUT', '/api/admin/settings/signups', { user: boss, body: { open: true, invitesRequired: true } });
  await ctx.db.exec(`insert into auth.users (email, raw_user_meta_data) values ('new@northsouth.edu', $1)`, [{ invite_code: res.body.code }]);
  const list = await api('GET', '/api/admin/invites', { user: boss });
  assert.equal(list.body.invites[0].uses, 1);
  const signups = await api('GET', `/api/admin/signups?invite=${res.body.code}`, { user: boss });
  assert.equal(signups.body.signups.length, 1);
});

test('universities and campus boundaries', async () => {
  const boss = await admin();
  const created = await api('POST', '/api/admin/universities', { user: boss, body: { name: 'East West University', shortName: 'EWU', emailDomains: ['ewubd.edu'] } });
  assert.equal(created.status, 201);
  assert.equal((await api('POST', '/api/admin/universities', { user: boss, body: { name: 'Bad', shortName: 'B', emailDomains: ['not a domain'] } })).status, 400);
  assert.equal((await api('PUT', `/api/admin/universities/${created.body.id}/boundary`, { user: boss, body: { boundary: NSU_ZONE } })).status, 200);
  await ctx.db.exec(`insert into auth.users (email) values ('first@ewubd.edu')`);
  const list = await api('GET', '/api/admin/universities', { user: boss });
  const ewu = list.body.universities.find((u) => u.shortName === 'EWU');
  assert.equal(ewu.students, 1);
  assert.equal(ewu.boundary.length, 4);
});

test('reports queue and user timeline', async () => {
  const boss = await admin('moderator');
  const a = await createUser(ctx.db);
  const b = await createUser(ctx.db);
  await api('POST', '/api/reports', { user: a, body: { userId: b.id, reason: 'stalking', details: 'Keeps asking to watch me' } });
  const q = await api('GET', '/api/admin/reports?status=new', { user: boss });
  assert.equal(q.body.reports[0].targetUser.id, b.id);
  await api('PATCH', `/api/admin/reports/${q.body.reports[0].id}`, { user: boss, body: { status: 'closed', adminNote: 'Warned' } });
  assert.equal((await api('GET', '/api/admin/reports?status=new', { user: boss })).body.reports.length, 0);
  const detail = await api('GET', `/api/admin/users/${b.id}`, { user: boss });
  assert.equal(detail.body.reports.length, 1);
  assert.ok(detail.body.timeline.some((e) => e.kind === 'signed_up'));
});

test('daily alerts: urgent reports and slow queues, and the endpoint needs the secret', async () => {
  const a = await createUser(ctx.db);
  const b = await createUser(ctx.db);
  assert.deepEqual(await collectAlerts(ctx.db), []);
  await ctx.db.exec(`insert into reports (reporter_id, target_user_id, reason, created_at) values ($1, $2, 'stalking', now() - interval '2 days')`, [a.id, b.id]);
  const alerts = await collectAlerts(ctx.db);
  assert.equal(alerts.length, 2);
  assert.match(alerts[0], /stalking or harassment/);
  assert.equal((await api('POST', '/api/internal/alerts')).status, 403);
  assert.equal((await api('POST', '/api/internal/alerts', { headers: { 'x-alerts-secret': 'x'.repeat(40) } })).status, 403, 'no secret configured: always refused');
});
