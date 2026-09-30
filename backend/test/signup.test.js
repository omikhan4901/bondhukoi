import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setup, teardown, reset } from './helpers.js';

// These run the database trigger that Supabase Auth fires when an account is created.
let ctx;
before(async () => (ctx = await setup()));
after(teardown);
beforeEach(() => reset(ctx.db));

const signUp = (email, meta = {}) =>
  ctx.db.one('insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id', [email, meta]);

const settings = (value) => ctx.db.exec(`update app_settings set value = $1 where key = 'signups'`, [value]);

test('only university email addresses can sign up', async () => {
  await assert.rejects(signUp('someone@gmail.com'), /BK_EMAIL_DOMAIN/);
  await assert.rejects(signUp('someone@northsouth.edu.evil.com'), /BK_EMAIL_DOMAIN/);
  await assert.rejects(signUp('someone@fakenorthsouth.edu'), /BK_EMAIL_DOMAIN/);
  const a = await signUp('Nusrat.Jahan@NorthSouth.edu', { name: '  Nusrat Jahan ' });
  const b = await signUp('rafi@g.bracu.ac.bd');
  const pa = await ctx.db.one('select p.name, u.short_name from profiles p join universities u on u.id = p.university_id where p.id = $1', [a.id]);
  assert.deepEqual(pa, { name: 'Nusrat Jahan', short_name: 'NSU' });
  const pb = await ctx.db.one('select u.short_name from profiles p join universities u on u.id = p.university_id where p.id = $1', [b.id]);
  assert.equal(pb.short_name, 'BRACU');
});

test('an inactive university is closed to sign-ups', async () => {
  await ctx.db.exec(`update universities set is_active = false where short_name = 'NSU'`);
  await assert.rejects(signUp('x@northsouth.edu'), /BK_EMAIL_DOMAIN/);
});

test('friend codes are 8 unambiguous characters and unique', async () => {
  const codes = new Set();
  for (let i = 0; i < 40; i++) {
    const u = await signUp(`s${i}@northsouth.edu`);
    const { friend_code } = await ctx.db.one('select friend_code from profiles where id = $1', [u.id]);
    assert.match(friend_code, /^[A-HJ-NP-Z2-9]{8}$/);
    codes.add(friend_code);
  }
  assert.equal(codes.size, 40);
});

test('closed sign-ups', async () => {
  await settings({ open: false, invitesRequired: false });
  await assert.rejects(signUp('x@northsouth.edu'), /BK_SIGNUPS_CLOSED/);
});

test('invite codes: required, counted, limited, expiring and tied to a university', async () => {
  await settings({ open: true, invitesRequired: true });
  const nsu = await ctx.db.one(`select id from universities where short_name = 'NSU'`);
  await ctx.db.exec(
    `insert into invite_codes (code, max_uses, university_id, expires_at) values
       ('BK-TWOUSE', 2, null, null),
       ('BK-NSUONLY', 5, $1, null),
       ('BK-EXPIRED', 5, null, now() - interval '1 minute')`,
    [nsu.id],
  );
  await assert.rejects(signUp('a@northsouth.edu'), /BK_INVITE_INVALID/);
  await assert.rejects(signUp('a@northsouth.edu', { invite_code: 'BK-NOPE' }), /BK_INVITE_INVALID/);
  await signUp('a@northsouth.edu', { invite_code: 'bk-twouse' });
  await signUp('b@northsouth.edu', { invite_code: 'BK-TWOUSE' });
  await assert.rejects(signUp('c@northsouth.edu', { invite_code: 'BK-TWOUSE' }), /BK_INVITE_INVALID/);
  assert.equal((await ctx.db.one(`select uses from invite_codes where code = 'BK-TWOUSE'`)).uses, 2);
  await assert.rejects(signUp('d@northsouth.edu', { invite_code: 'BK-EXPIRED' }), /BK_INVITE_INVALID/);
  await assert.rejects(signUp('e@bracu.ac.bd', { invite_code: 'BK-NSUONLY' }), /BK_INVITE_INVALID/);
  await signUp('f@northsouth.edu', { invite_code: 'BK-NSUONLY' });
  const event = await ctx.db.one(`select meta from account_events e join profiles p on p.id = e.user_id where e.kind = 'signed_up' order by e.at desc limit 1`);
  assert.equal(event.meta.invite, 'BK-NSUONLY');
});

test('an account cannot move its email to another university or a personal address', async () => {
  const u = await signUp('a@northsouth.edu');
  await assert.rejects(ctx.db.exec(`update auth.users set email = 'a@gmail.com' where id = $1`, [u.id]), /BK_EMAIL_DOMAIN/);
  await assert.rejects(ctx.db.exec(`update auth.users set email = 'a@bracu.ac.bd' where id = $1`, [u.id]), /BK_EMAIL_DOMAIN/);
  await ctx.db.exec(`update auth.users set email = 'a.new@northsouth.edu' where id = $1`, [u.id]);
});

test('the app’s public key can read nothing', async () => {
  await signUp('a@northsouth.edu');
  for (const role of ['anon', 'authenticated']) {
    await assert.rejects(
      ctx.db.tx(async (tx) => {
        await tx.exec(`set local role ${role}`);
        await tx.many('select * from profiles');
      }),
      /permission denied/,
    );
    await assert.rejects(
      ctx.db.tx(async (tx) => {
        await tx.exec(`set local role ${role}`);
        await tx.many('select new_friend_code()');
      }),
      /permission denied/,
    );
  }
  const rls = await ctx.db.many(
    `select tablename from pg_tables where schemaname = 'public' and tablename <> 'spatial_ref_sys' and not rowsecurity`,
  );
  assert.deepEqual(rls, [], 'every table has row-level security on');
});
