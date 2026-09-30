import crypto from 'node:crypto';
import sharp from 'sharp';
import { limit } from '../lib/limits.js';
import { body, text, nullableText } from '../lib/schemas.js';
import { badRequest } from '../lib/errors.js';
import { DEFAULT_NOTIFY } from '../lib/notify.js';
import { leaveCircle } from '../lib/circles.js';
import { card, CARD_COLUMNS, logEvent } from '../lib/people.js';
import { describePresence } from '../lib/visibility.js';

const PROFILE_SQL = `
  select p.*, u.name as university_name, u.short_name as university_short,
         (select role from admins a where a.user_id = p.id) as admin_role
    from profiles p join universities u on u.id = p.university_id
   where p.id = $1`;

function socialHandle(value) {
  if (value == null) return null;
  const handle = value.trim().replace(/^@/, '');
  if (!handle) return null;
  if (!/^[A-Za-z0-9._]{1,60}$/.test(handle)) throw badRequest('Use just the username, like nusrat.jahan.', 'invalid_handle');
  return handle;
}

export default async function meRoutes(app) {
  const { db, settings, storage, authAdmin } = app.ctx;
  const { requireUser } = app.ctx.auth;
  app.addHook('onRequest', requireUser);

  async function profileResponse(userId) {
    const p = await db.one(PROFILE_SQL, [userId]);
    const counts = await db.one(
      `select
         (select count(*) from friendships where user_a = $1 or user_b = $1) as friends,
         (select count(*) from circle_members where user_id = $1 and status = 'active') as circles`,
      [userId],
    );
    return {
      user: {
        id: p.id,
        name: p.name,
        email: (await db.one('select email from auth.users where id = $1', [userId]))?.email || null,
        university: { id: p.university_id, name: p.university_name, shortName: p.university_short },
        friendCode: p.friend_code,
        avatarUrl: storage.publicUrl('avatars', p.avatar_path),
        facebook: p.facebook,
        instagram: p.instagram,
        isAdmin: Boolean(p.admin_role),
        createdAt: p.created_at,
      },
      privacy: {
        sharingEnabled: p.sharing_enabled,
        shareCampus: p.share_campus,
        quietHoursEnabled: p.quiet_hours_enabled,
        quietStart: p.quiet_start,
        quietEnd: p.quiet_end,
        shortHistory: p.short_history,
      },
      notifications: { ...DEFAULT_NOTIFY, ...p.notify },
      counts,
    };
  }

  app.get('/', { config: limit('read', settings) }, async (req) => profileResponse(req.user.id));

  app.patch(
    '/',
    {
      config: limit('write', settings),
      schema: { body: body({ name: text(80, 1), facebook: nullableText(100), instagram: nullableText(100) }) },
    },
    async (req) => {
      const b = req.body;
      const updates = {};
      if (b.name !== undefined) {
        const name = b.name.trim().replace(/\s+/g, ' ');
        if (!name) throw badRequest('Your name can’t be empty.', 'invalid_name');
        updates.name = name;
      }
      if (b.facebook !== undefined) updates.facebook = socialHandle(b.facebook);
      if (b.instagram !== undefined) updates.instagram = socialHandle(b.instagram);
      const keys = Object.keys(updates);
      if (keys.length) {
        await db.exec(
          `update profiles set ${keys.map((k, i) => `${k} = $${i + 2}`).join(', ')} where id = $1`,
          [req.user.id, ...keys.map((k) => updates[k])],
        );
      }
      return profileResponse(req.user.id);
    },
  );

  app.patch(
    '/privacy',
    {
      config: limit('write', settings),
      schema: {
        body: body({
          sharingEnabled: { type: 'boolean' },
          shareCampus: { type: 'boolean' },
          quietHoursEnabled: { type: 'boolean' },
          quietStart: { type: 'integer', minimum: 0, maximum: 23 },
          quietEnd: { type: 'integer', minimum: 0, maximum: 23 },
          shortHistory: { type: 'boolean' },
        }),
      },
    },
    async (req) => {
      const map = {
        sharingEnabled: 'sharing_enabled',
        shareCampus: 'share_campus',
        quietHoursEnabled: 'quiet_hours_enabled',
        quietStart: 'quiet_start',
        quietEnd: 'quiet_end',
        shortHistory: 'short_history',
      };
      const keys = Object.keys(req.body);
      if (keys.length) {
        await db.tx(async (tx) => {
          await tx.exec(
            `update profiles set ${keys.map((k, i) => `${map[k]} = $${i + 2}`).join(', ')} where id = $1`,
            [req.user.id, ...keys.map((k) => req.body[k])],
          );
          // Pausing or hiding campus takes effect now, not at the next location check.
          if (req.body.sharingEnabled === false) {
            await tx.exec(`update presence set on_campus = false, circle_ids = '{}' where user_id = $1`, [req.user.id]);
          }
          if (req.body.shareCampus === false) {
            await tx.exec('update presence set on_campus = false where user_id = $1', [req.user.id]);
          }
          // Choosing 24-hour history deletes anything older straight away.
          if (req.body.shortHistory === true) {
            await tx.exec(`delete from transitions where user_id = $1 and at < now() - interval '24 hours'`, [req.user.id]);
          }
        });
        if (req.body.sharingEnabled !== undefined) {
          await logEvent(db, req.user.id, req.body.sharingEnabled ? 'sharing_resumed' : 'sharing_paused');
        }
      }
      return profileResponse(req.user.id);
    },
  );

  app.patch(
    '/notifications',
    {
      config: limit('write', settings),
      schema: {
        body: body(Object.fromEntries(Object.keys(DEFAULT_NOTIFY).map((k) => [k, { type: 'boolean' }]))),
      },
    },
    async (req) => {
      await db.exec('update profiles set notify = notify || $2::jsonb where id = $1', [req.user.id, JSON.stringify(req.body)]);
      return profileResponse(req.user.id);
    },
  );

  // Photos are decoded and re-encoded on the server: fixed size, JPEG, all metadata
  // (including GPS tags) stripped. A new random name each time, so old links stop working.
  app.post(
    '/avatar',
    {
      bodyLimit: 4 * 1024 * 1024,
      config: limit('upload', settings),
      schema: { body: body({ imageBase64: text(4 * 1024 * 1024, 16) }, ['imageBase64']) },
    },
    async (req) => {
      const input = Buffer.from(req.body.imageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      if (input.length > 3 * 1024 * 1024) throw badRequest('That photo is too large (3 MB at most).', 'image_too_large');
      let output;
      try {
        output = await sharp(input, { limitInputPixels: 40_000_000 })
          .rotate()
          .resize(256, 256, { fit: 'cover' })
          .jpeg({ quality: 82, mozjpeg: true })
          .toBuffer();
      } catch {
        throw badRequest('That file isn’t a photo we can read.', 'invalid_image');
      }
      const path = `${req.user.id}/${crypto.randomBytes(12).toString('hex')}.jpg`;
      const old = await db.one('select avatar_path from profiles where id = $1', [req.user.id]);
      await storage.upload('avatars', path, output, 'image/jpeg');
      await db.exec('update profiles set avatar_path = $2 where id = $1', [req.user.id, path]);
      if (old?.avatar_path) await storage.remove('avatars', [old.avatar_path]).catch(() => {});
      return profileResponse(req.user.id);
    },
  );

  app.delete('/avatar', { config: limit('write', settings) }, async (req) => {
    const old = await db.one('select avatar_path from profiles where id = $1', [req.user.id]);
    await db.exec('update profiles set avatar_path = null where id = $1', [req.user.id]);
    if (old?.avatar_path) await storage.remove('avatars', [old.avatar_path]).catch(() => {});
    return profileResponse(req.user.id);
  });

  app.put(
    '/push-token',
    {
      config: limit('write', settings),
      schema: {
        body: body(
          { token: { type: 'string', pattern: '^(Expo|Exponent)PushToken\\[[A-Za-z0-9_-]{10,100}\\]$' }, platform: { enum: ['android', 'ios'] } },
          ['token', 'platform'],
        ),
      },
    },
    async (req) => {
      // A token belongs to one device; if someone else signed in on it before, it moves.
      await db.exec(
        `insert into push_tokens (token, user_id, platform, updated_at) values ($1, $2, $3, now())
         on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform, updated_at = now()`,
        [req.body.token, req.user.id, req.body.platform],
      );
      return { ok: true };
    },
  );

  app.delete(
    '/push-token',
    { config: limit('write', settings), schema: { body: body({ token: text(200, 1) }, ['token']) } },
    async (req) => {
      await db.exec('delete from push_tokens where token = $1 and user_id = $2', [req.body.token, req.user.id]);
      return { ok: true };
    },
  );

  // Your own status, exactly as your friends would see it.
  app.get('/presence', { config: limit('read', settings) }, async (req) => {
    const row = await db.one(
      `select p.status, p.sharing_enabled, p.share_campus, p.quiet_hours_enabled, p.quiet_start, p.quiet_end,
              pr.on_campus, pr.circle_ids, pr.checked_at
         from profiles p left join presence pr on pr.user_id = p.id where p.id = $1`,
      [req.user.id],
    );
    const circles = await db.many('select id, name from circles where id = any($1)', [row.circle_ids || []]);
    return { presence: describePresence(row, new Map(circles.map((c) => [c.id, c.name]))) };
  });

  // "Who can see me": everyone who can see anything about you, and what exactly.
  app.get('/visibility', { config: limit('read', settings) }, async (req) => {
    const me = req.user.id;
    const [friends, circles, watchers, blocked] = await Promise.all([
      db.many(
        `select ${CARD_COLUMNS}
           from friendships f
           join profiles p on p.id = case when f.user_a = $1 then f.user_b else f.user_a end
           join universities u on u.id = p.university_id
          where f.user_a = $1 or f.user_b = $1
          order by p.name`,
        [me],
      ),
      db.many(
        `select c.id, c.name, m.detection_enabled,
                (select count(*) from circle_members x where x.circle_id = c.id and x.status = 'active') - 1 as others
           from circle_members m join circles c on c.id = m.circle_id
          where m.user_id = $1 and m.status = 'active'
          order by c.name`,
        [me],
      ),
      db.many(
        `select w.id, w.scope, w.status, w.created_at, ${CARD_COLUMNS}
           from watches w join profiles p on p.id = w.watcher_id join universities u on u.id = p.university_id
          where w.watched_id = $1 order by w.created_at desc`,
        [me],
      ),
      db.many(
        `select ${CARD_COLUMNS}, b.created_at as blocked_at
           from blocks b join profiles p on p.id = b.blocked_id join universities u on u.id = p.university_id
          where b.blocker_id = $1 order by b.created_at desc`,
        [me],
      ),
    ]);
    const privacy = await db.one('select sharing_enabled, share_campus from profiles where id = $1', [me]);
    return {
      sharingEnabled: privacy.sharing_enabled,
      friends: friends.map((f) => ({ ...card(f, storage), seesCampus: privacy.share_campus })),
      circles: circles.map((c) => ({ id: c.id, name: c.name, detectionEnabled: c.detection_enabled, otherMembers: c.others })),
      watchers: watchers.map((w) => ({ watchId: w.id, scope: w.scope, status: w.status, since: w.created_at, user: card(w, storage) })),
      blocked: blocked.map((b) => ({ ...card(b, storage), blockedAt: b.blocked_at })),
    };
  });

  // Signs out every device, including this one.
  app.post('/sign-out-everywhere', { config: limit('write', settings) }, async (req) => {
    await db.tx(async (tx) => {
      await tx.exec('update profiles set sessions_revoked_at = now() where id = $1', [req.user.id]);
      await tx.exec('delete from auth.sessions where user_id = $1', [req.user.id]);
      await tx.exec('delete from push_tokens where user_id = $1', [req.user.id]);
    });
    await logEvent(db, req.user.id, 'signed_out_everywhere');
    return { ok: true };
  });

  // Deletes the account and everything it owns. Circles it ran are handed to another
  // member, or deleted if nobody else is in them.
  app.delete(
    '/',
    { config: limit('write', settings), schema: { body: body({ confirm: { const: 'DELETE' } }, ['confirm']) } },
    async (req) => {
      const me = req.user.id;
      const paths = await db.tx(async (tx) => {
        const circles = await tx.many('select circle_id from circle_members where user_id = $1', [me]);
        const snapshots = [];
        for (const c of circles) snapshots.push(...(await leaveCircle(tx, c.circle_id, me)));
        const profile = await tx.one('select avatar_path from profiles where id = $1', [me]);
        return { snapshots, avatar: profile?.avatar_path };
      });
      await authAdmin.deleteUser(me);
      await storage.remove('snapshots', paths.snapshots).catch(() => {});
      if (paths.avatar) await storage.remove('avatars', [paths.avatar]).catch(() => {});
      return { ok: true };
    },
  );
}
