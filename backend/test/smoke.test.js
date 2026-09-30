import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setup, teardown, reset, createUser, call } from './helpers.js';

let ctx;
before(async () => (ctx = await setup()));
after(teardown);
beforeEach(() => reset(ctx.db));

test('health and me', async () => {
  const h = await call(ctx.app, 'GET', '/health');
  assert.equal(h.status, 200);
  const u = await createUser(ctx.db, { name: 'Nusrat' });
  const me = await call(ctx.app, 'GET', '/api/me', { user: u });
  assert.equal(me.status, 200, JSON.stringify(me.body));
  assert.equal(me.body.user.name, 'Nusrat');
});
