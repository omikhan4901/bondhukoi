import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setup, teardown, reset, createUser, call, tokenFor, SUPABASE_URL } from './helpers.js';

let ctx;
before(async () => (ctx = await setup()));
after(teardown);
beforeEach(() => reset(ctx.db));

const me = (token) => call(ctx.app, 'GET', '/api/me', { user: { token } });

test('no token, junk token and tokens that fail checks are all 401', async () => {
  const u = await createUser(ctx.db);
  assert.equal((await call(ctx.app, 'GET', '/api/me')).status, 401);
  assert.equal((await me('not-a-jwt')).status, 401);
  assert.equal((await me(await tokenFor(u.id, { secret: 'another-secret-that-is-long-enough-to-sign' }))).status, 401);
  assert.equal((await me(await tokenFor(u.id, { issuer: 'https://evil.example/auth/v1' }))).status, 401);
  assert.equal((await me(await tokenFor(u.id, { expiresIn: '-1m' }))).status, 401);
  assert.equal((await me(u.token)).status, 200);
});

test('an unsigned token (alg none) is refused', async () => {
  const u = await createUser(ctx.db);
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const token = `${enc({ alg: 'none', typ: 'JWT' })}.${enc({ sub: u.id, aud: 'authenticated', iss: `${SUPABASE_URL}/auth/v1`, iat: now, exp: now + 600 })}.`;
  assert.equal((await me(token)).status, 401);
});

test('a token for an account that no longer exists is 401', async () => {
  const u = await createUser(ctx.db);
  await ctx.db.exec('delete from auth.users where id = $1', [u.id]);
  assert.equal((await me(u.token)).status, 401);
});

test('suspended and banned accounts are refused', async () => {
  const u = await createUser(ctx.db);
  await ctx.db.exec(`update profiles set status = 'suspended' where id = $1`, [u.id]);
  const res = await me(u.token);
  assert.equal(res.status, 403);
  assert.equal(res.body.code, 'account_suspended');
  await ctx.db.exec(`update profiles set status = 'banned' where id = $1`, [u.id]);
  assert.equal((await me(u.token)).status, 403);
});

test('sign out everywhere ends existing sessions and push tokens', async () => {
  const u = await createUser(ctx.db);
  const old = await tokenFor(u.id, { issuedAt: Math.floor(Date.now() / 1000) - 60 });
  await ctx.db.exec('insert into auth.sessions (user_id) values ($1)', [u.id]);
  await ctx.db.exec(`insert into push_tokens (token, user_id, platform) values ('ExponentPushToken[aaaaaaaaaaaa]', $1, 'android')`, [u.id]);
  assert.equal((await call(ctx.app, 'POST', '/api/me/sign-out-everywhere', { user: { token: old } })).status, 200);
  assert.equal((await me(old)).status, 401);
  assert.equal((await ctx.db.one('select count(*) as n from auth.sessions where user_id = $1', [u.id])).n, 0);
  assert.equal((await ctx.db.one('select count(*) as n from push_tokens where user_id = $1', [u.id])).n, 0);
  // A session started afterwards works.
  const fresh = await tokenFor(u.id, { issuedAt: Math.floor(Date.now() / 1000) + 2 });
  assert.equal((await me(fresh)).status, 200);
});

test('signed-out routes: config and universities', async () => {
  const cfg = await call(ctx.app, 'GET', '/api/config');
  assert.equal(cfg.status, 200);
  assert.equal(cfg.body.maintenance.enabled, false);
  assert.equal(cfg.body.minAppVersion, '1.0.0');
  const unis = await call(ctx.app, 'GET', '/api/universities');
  assert.deepEqual(unis.body.universities.map((u) => u.shortName), ['BRACU', 'NSU']);
  assert.ok(!('boundary' in unis.body.universities[0]));
});

test('responses carry a request id and security headers, and errors never leak internals', async () => {
  const res = await ctx.app.inject({ method: 'GET', url: '/api/config' });
  assert.match(res.headers['x-request-id'], /^[0-9a-f-]{36}$/);
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
  assert.ok(res.headers['strict-transport-security']);
  const missing = await call(ctx.app, 'GET', '/api/nope');
  assert.equal(missing.status, 404);
  assert.deepEqual(Object.keys(missing.body).sort(), ['code', 'error', 'statusCode']);
});
