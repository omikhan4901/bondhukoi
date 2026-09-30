import crypto from 'node:crypto';
import sharp from 'sharp';
import { limit, LIMITS } from '../lib/limits.js';
import { body, idParams, uuid, text } from '../lib/schemas.js';
import { badRequest, conflict, forbidden, notFound } from '../lib/errors.js';
import { polygonSchema, polygonToWkt, geojsonToPoints } from '../lib/geo.js';
import { DEFAULT_SETTINGS } from '../lib/settings.js';
import { leaveCircle } from '../lib/circles.js';

/**
 * The admin console's API. The line it never crosses: no route here returns where
 * anyone is or was (no presence, no enter/exit events, no zone membership right now).
 * Every change is written to the audit log.
 */
export default async function adminRoutes(app) {
  const { db, settings, storage, authAdmin } = app.ctx;
  const { requireAdmin } = app.ctx.auth;
  const moderator = requireAdmin('moderator');
  const superAdmin = requireAdmin('super');
  const rl = limit('admin', settings);
  const page = {
    type: 'object',
    additionalProperties: false,
    properties: {
      q: { type: 'string', maxLength: 100 },
      status: { type: 'string', maxLength: 20 },
      universityId: uuid,
      invite: { type: 'string', maxLength: 32 },
      days: { type: 'integer', minimum: 1, maximum: 365 },
      offset: { type: 'integer', minimum: 0, maximum: 100000 },
    },
  };

  // jsonb parameters: pg sends plain strings as-is, so encode everything explicitly.
  const json = (v) => (v == null ? null : JSON.stringify(v));

  async function audit(req, action, targetType, targetId, before = null, after = null) {
    await db.exec(
      'insert into admin_audit (admin_id, action, target_type, target_id, before, after) values ($1, $2, $3, $4, $5, $6)',
      [req.admin.id, action, targetType, targetId == null ? null : String(targetId), json(before), json(after)],
    );
  }

  const escapeLike = (s) => `%${s.toLowerCase().replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

  // ─── Overview ────────────────────────────────────────────────────────────

  app.get('/overview', { onRequest: moderator, config: rl }, async () => {
    const [totals, perDay, size, s] = await Promise.all([
      db.one(`
        select
          (select count(*) from profiles) as users,
          (select count(*) from profiles where created_at > now() - interval '1 day') as signups_today,
          (select count(*) from profiles where last_active_at > now() - interval '1 day') as active_today,
          (select count(*) from profiles where last_active_at > now() - interval '7 days') as active_week,
          (select count(*) from profiles where last_active_at > now() - interval '30 days') as active_month,
          (select count(*) from profiles where sharing_enabled) as sharing_on,
          (select count(*) from friendships) as friendships,
          (select count(*) from circles) as circles,
          (select count(*) from watches where status = 'active') as watches,
          (select count(*) from reports where status <> 'closed') as open_reports,
          (select count(*) from feedback where status = 'new') as new_feedback,
          (select count(*) from push_tokens) as devices`),
      db.many(`
        select to_char(d, 'YYYY-MM-DD') as day, count(p.id) as signups
          from generate_series(current_date - 13, current_date, interval '1 day') d
          left join profiles p on p.created_at::date = d::date
         group by d order by d`),
      db.one('select pg_database_size(current_database()) as bytes'),
      settings.all(),
    ]);
    const FREE_DB_BYTES = 500 * 1024 * 1024;
    return {
      totals,
      signupsPerDay: perDay,
      freeTier: {
        databaseBytes: size.bytes,
        databaseLimitBytes: FREE_DB_BYTES,
        monthlyActiveUsers: totals.active_month,
        monthlyActiveLimit: 50000,
      },
      switches: { maintenance: s.maintenance?.enabled, signupsOpen: s.signups?.open, invitesRequired: s.signups?.invitesRequired },
    };
  });

  // ─── People ──────────────────────────────────────────────────────────────

  app.get('/signups', { onRequest: moderator, config: rl, schema: { querystring: page } }, async (req) => {
    const { days = 30, universityId = null, invite = null, offset = 0 } = req.query;
    const rows = await db.many(
      `select p.id, p.name, p.status, p.created_at, p.last_active_at, a.email, a.email_confirmed_at,
              u.short_name as university,
              (select meta->>'invite' from account_events e where e.user_id = p.id and e.kind = 'signed_up' limit 1) as invite,
              exists (select 1 from friendships f where f.user_a = p.id or f.user_b = p.id) as has_friend,
              exists (select 1 from circle_members m where m.user_id = p.id and m.status = 'active') as in_circle,
              exists (select 1 from push_tokens t where t.user_id = p.id) as has_device,
              exists (select 1 from presence pr where pr.user_id = p.id) as has_checked_in
         from profiles p join auth.users a on a.id = p.id join universities u on u.id = p.university_id
        where p.created_at > now() - make_interval(days => $1)
          and ($2::uuid is null or p.university_id = $2)
          and ($3::text is null or exists (select 1 from account_events e where e.user_id = p.id and e.kind = 'signed_up' and e.meta->>'invite' = upper($3)))
        order by p.created_at desc limit 100 offset $4`,
      [days, universityId, invite, offset],
    );
    return {
      signups: rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        university: r.university,
        status: r.status,
        verified: Boolean(r.email_confirmed_at),
        invite: r.invite,
        createdAt: r.created_at,
        lastActiveAt: r.last_active_at,
        steps: { friend: r.has_friend, circle: r.in_circle, notifications: r.has_device, location: r.has_checked_in },
      })),
    };
  });

  app.get('/users', { onRequest: moderator, config: rl, schema: { querystring: page } }, async (req) => {
    const { q = '', status = null, offset = 0 } = req.query;
    const rows = await db.many(
      `select p.id, p.name, p.status, p.created_at, p.last_active_at, a.email, u.short_name as university,
              (select role from admins ad where ad.user_id = p.id) as admin_role
         from profiles p join auth.users a on a.id = p.id join universities u on u.id = p.university_id
        where ($1 = '' or lower(p.name) like $2 or lower(a.email) like $2 or p.friend_code = upper($1))
          and ($3::text is null or p.status = $3)
        order by p.created_at desc limit 50 offset $4`,
      [q.trim(), escapeLike(q.trim()), status, offset],
    );
    return {
      users: rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        university: r.university,
        status: r.status,
        adminRole: r.admin_role,
        createdAt: r.created_at,
        lastActiveAt: r.last_active_at,
      })),
    };
  });

  app.get('/users/:userId', { onRequest: moderator, config: rl, schema: { params: idParams('userId') } }, async (req) => {
    const id = req.params.userId;
    const p = await db.one(
      `select p.id, p.name, p.status, p.friend_code, p.avatar_path, p.created_at, p.last_active_at, p.sharing_enabled,
              a.email, a.email_confirmed_at, u.name as university,
              (select role from admins ad where ad.user_id = p.id) as admin_role
         from profiles p join auth.users a on a.id = p.id join universities u on u.id = p.university_id where p.id = $1`,
      [id],
    );
    if (!p) throw notFound();
    const [counts, events, reports, actions] = await Promise.all([
      db.one(
        `select
           (select count(*) from friendships where user_a = $1 or user_b = $1) as friends,
           (select count(*) from circle_members where user_id = $1 and status = 'active') as circles,
           (select count(*) from watches where watcher_id = $1 and status = 'active') as watching,
           (select count(*) from watches where watched_id = $1 and status = 'active') as watched_by,
           (select count(*) from blocks where blocked_id = $1) as blocked_by,
           (select count(*) from push_tokens where user_id = $1) as devices`,
        [id],
      ),
      db.many('select kind, meta, at from account_events where user_id = $1 order by at desc limit 200', [id]),
      db.many(
        `select r.id, r.reason, r.status, r.created_at, (r.reporter_id = $1) as made_by_user
           from reports r where r.reporter_id = $1 or r.target_user_id = $1 order by r.created_at desc limit 50`,
        [id],
      ),
      db.many(
        `select au.action, au.at, pa.name as admin_name from admin_audit au left join profiles pa on pa.id = au.admin_id
          where au.target_type = 'user' and au.target_id = $1 order by au.at desc limit 50`,
        [id],
      ),
    ]);
    return {
      user: {
        id: p.id,
        name: p.name,
        email: p.email,
        verified: Boolean(p.email_confirmed_at),
        university: p.university,
        status: p.status,
        friendCode: p.friend_code,
        avatarUrl: storage.publicUrl('avatars', p.avatar_path),
        sharingEnabled: p.sharing_enabled,
        adminRole: p.admin_role,
        createdAt: p.created_at,
        lastActiveAt: p.last_active_at,
      },
      counts,
      timeline: events,
      reports: reports.map((r) => ({ id: r.id, reason: r.reason, status: r.status, createdAt: r.created_at, madeByUser: r.made_by_user })),
      adminActions: actions,
    };
  });

  async function setStatus(req, status, hours) {
    const id = req.params.userId;
    if (id === req.admin.id) throw badRequest('You can’t change your own account here.', 'self');
    const target = await db.one('select p.status, (select role from admins a where a.user_id = p.id) as role from profiles p where p.id = $1', [id]);
    if (!target) throw notFound();
    if (target.role && req.admin.role !== 'super') throw forbidden('Only a super admin can act on another admin.');
    await db.tx(async (tx) => {
      await tx.exec('update profiles set status = $2, sessions_revoked_at = case when $2 = \'active\' then sessions_revoked_at else now() end where id = $1', [id, status]);
      if (status !== 'active') {
        await tx.exec('delete from push_tokens where user_id = $1', [id]);
        await tx.exec(`update presence set on_campus = false, circle_ids = '{}' where user_id = $1`, [id]);
      }
    });
    await authAdmin.setBan(id, hours).catch((err) => req.log.warn({ err: err.message }, 'auth ban failed'));
    await audit(req, `user_${status === 'active' ? 'restored' : status}`, 'user', id, { status: target.status }, { status, reason: req.body?.reason || '' });
    return { status };
  }

  const reasonBody = { body: body({ reason: text(500) }) };
  app.post('/users/:userId/suspend', { onRequest: moderator, config: rl, schema: { params: idParams('userId'), ...reasonBody } }, (req) =>
    setStatus(req, 'suspended', 24 * 365),
  );
  app.post('/users/:userId/ban', { onRequest: superAdmin, config: rl, schema: { params: idParams('userId'), ...reasonBody } }, (req) =>
    setStatus(req, 'banned', 24 * 365 * 100),
  );
  app.post('/users/:userId/restore', { onRequest: moderator, config: rl, schema: { params: idParams('userId'), ...reasonBody } }, (req) =>
    setStatus(req, 'active', 0),
  );

  app.post('/users/:userId/sign-out', { onRequest: moderator, config: rl, schema: { params: idParams('userId') } }, async (req) => {
    const id = req.params.userId;
    const n = await db.exec('update profiles set sessions_revoked_at = now() where id = $1', [id]);
    if (!n) throw notFound();
    await db.exec('delete from auth.sessions where user_id = $1', [id]);
    await audit(req, 'user_signed_out', 'user', id);
    return { ok: true };
  });

  app.post('/users/:userId/remove-photo', { onRequest: moderator, config: rl, schema: { params: idParams('userId') } }, async (req) => {
    const id = req.params.userId;
    const p = await db.one('select avatar_path from profiles where id = $1', [id]);
    if (!p) throw notFound();
    await db.exec('update profiles set avatar_path = null where id = $1', [id]);
    if (p.avatar_path) await storage.remove('avatars', [p.avatar_path]).catch(() => {});
    await audit(req, 'user_photo_removed', 'user', id);
    return { ok: true };
  });

  app.delete('/users/:userId', { onRequest: superAdmin, config: rl, schema: { params: idParams('userId'), body: body({ confirm: { const: 'DELETE' } }, ['confirm']) } }, async (req) => {
    const id = req.params.userId;
    if (id === req.admin.id) throw badRequest('Delete your own account from the app.', 'self');
    const p = await db.one('select name, avatar_path from profiles where id = $1', [id]);
    if (!p) throw notFound();
    const snapshots = await db.tx(async (tx) => {
      const circles = await tx.many('select circle_id from circle_members where user_id = $1', [id]);
      const out = [];
      for (const c of circles) out.push(...(await leaveCircle(tx, c.circle_id, id)));
      return out;
    });
    await authAdmin.deleteUser(id);
    await storage.remove('snapshots', snapshots).catch(() => {});
    if (p.avatar_path) await storage.remove('avatars', [p.avatar_path]).catch(() => {});
    await audit(req, 'user_deleted', 'user', id, { name: p.name });
    return { ok: true };
  });

  // ─── Admins ──────────────────────────────────────────────────────────────

  app.get('/admins', { onRequest: moderator, config: rl }, async () => ({
    admins: await db.many(
      `select ad.user_id as id, ad.role, ad.created_at, p.name, a.email
         from admins ad join profiles p on p.id = ad.user_id join auth.users a on a.id = ad.user_id order by ad.created_at`,
    ),
  }));

  app.post('/admins', { onRequest: superAdmin, config: rl, schema: { body: body({ email: text(200, 3), role: { enum: ['super', 'moderator'] } }, ['email', 'role']) } }, async (req, reply) => {
    const user = await db.one('select id from auth.users where lower(email) = lower($1)', [req.body.email.trim()]);
    if (!user || !(await db.one('select 1 as ok from profiles where id = $1', [user.id]))) throw notFound('No account with that email. They need to sign up in the app first.');
    await db.exec(
      `insert into admins (user_id, role, created_by) values ($1, $2, $3) on conflict (user_id) do update set role = excluded.role`,
      [user.id, req.body.role, req.admin.id],
    );
    await audit(req, 'admin_added', 'user', user.id, null, { role: req.body.role });
    return reply.status(201).send({ ok: true });
  });

  app.delete('/admins/:userId', { onRequest: superAdmin, config: rl, schema: { params: idParams('userId') } }, async (req) => {
    if (req.params.userId === req.admin.id) throw badRequest('Ask another super admin to remove you.', 'self');
    const n = await db.exec('delete from admins where user_id = $1', [req.params.userId]);
    if (!n) throw notFound();
    await audit(req, 'admin_removed', 'user', req.params.userId);
    return { ok: true };
  });

  // ─── Universities ────────────────────────────────────────────────────────

  const domainList = { type: 'array', minItems: 1, maxItems: 10, uniqueItems: true, items: { type: 'string', pattern: '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$', maxLength: 100 } };

  app.get('/universities', { onRequest: moderator, config: rl }, async () => {
    const rows = await db.many(
      `select u.id, u.name, u.short_name, u.email_domains, u.is_active, u.boundary_updated_at, u.snapshot_path,
              ST_AsGeoJSON(u.boundary) as geojson,
              (select count(*) from profiles p where p.university_id = u.id) as students
         from universities u order by u.name`,
    );
    const out = [];
    for (const u of rows) {
      out.push({
        id: u.id,
        name: u.name,
        shortName: u.short_name,
        emailDomains: u.email_domains,
        isActive: u.is_active,
        students: u.students,
        boundary: geojsonToPoints(u.geojson),
        boundaryUpdatedAt: u.boundary_updated_at,
        snapshotUrl: await storage.signedUrl('snapshots', u.snapshot_path, 3600),
      });
    }
    return { universities: out };
  });

  app.post('/universities', { onRequest: superAdmin, config: rl, schema: { body: body({ name: text(120, 2), shortName: text(20, 1), emailDomains: domainList }, ['name', 'shortName', 'emailDomains']) } }, async (req, reply) => {
    const u = await db
      .one('insert into universities (name, short_name, email_domains) values ($1, $2, $3) returning id', [req.body.name.trim(), req.body.shortName.trim(), req.body.emailDomains])
      .catch((err) => {
        if (err.code === '23505') throw conflict('A university with that name exists.', 'exists');
        throw err;
      });
    await audit(req, 'university_added', 'university', u.id, null, req.body);
    return reply.status(201).send({ id: u.id });
  });

  app.patch('/universities/:universityId', { onRequest: superAdmin, config: rl, schema: { params: idParams('universityId'), body: body({ name: text(120, 2), shortName: text(20, 1), emailDomains: domainList, isActive: { type: 'boolean' } }) } }, async (req) => {
    const id = req.params.universityId;
    const before = await db.one('select name, short_name, email_domains, is_active from universities where id = $1', [id]);
    if (!before) throw notFound();
    const map = { name: 'name', shortName: 'short_name', emailDomains: 'email_domains', isActive: 'is_active' };
    const keys = Object.keys(req.body);
    if (keys.length) {
      await db.exec(`update universities set ${keys.map((k, i) => `${map[k]} = $${i + 2}`).join(', ')} where id = $1`, [id, ...keys.map((k) => req.body[k])]);
    }
    await audit(req, 'university_changed', 'university', id, before, req.body);
    return { ok: true };
  });

  app.put('/universities/:universityId/boundary', { onRequest: superAdmin, bodyLimit: 3 * 1024 * 1024, config: rl, schema: { params: idParams('universityId'), body: body({ boundary: polygonSchema, snapshotBase64: text(2 * 1024 * 1024, 16) }, ['boundary']) } }, async (req) => {
    const id = req.params.universityId;
    const before = await db.one('select snapshot_path from universities where id = $1', [id]);
    if (!before) throw notFound();
    const wkt = polygonToWkt(req.body.boundary);
    const valid = await db.one('select ST_IsValid(ST_GeomFromText($1, 4326)) as ok', [wkt]);
    if (!valid.ok) throw badRequest('The boundary’s edges cross each other.', 'invalid_zone');
    await db.exec('update universities set boundary = ST_GeomFromText($2, 4326), boundary_updated_at = now() where id = $1', [id, wkt]);
    if (req.body.snapshotBase64) {
      let jpeg;
      try {
        jpeg = await sharp(Buffer.from(req.body.snapshotBase64, 'base64'), { limitInputPixels: 20_000_000 }).resize(1000, 1000, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
      } catch {
        throw badRequest('The map picture couldn’t be read.', 'invalid_image');
      }
      const path = `universities/${id}/${crypto.randomBytes(8).toString('hex')}.jpg`;
      await storage.upload('snapshots', path, jpeg, 'image/jpeg');
      await db.exec('update universities set snapshot_path = $2 where id = $1', [id, path]);
      if (before.snapshot_path) await storage.remove('snapshots', [before.snapshot_path]).catch(() => {});
    }
    await audit(req, 'university_boundary_saved', 'university', id, null, { points: req.body.boundary.length });
    return { ok: true };
  });

  // ─── Circles (names and sizes only, never who is in the zone) ────────────

  app.get('/circles', { onRequest: moderator, config: rl, schema: { querystring: page } }, async (req) => {
    const { q = '', offset = 0 } = req.query;
    const rows = await db.many(
      `select c.id, c.name, c.created_at, cr.name as created_by,
              (select count(*) from circle_members m where m.circle_id = c.id and m.status = 'active') as members,
              (select count(*) from reports r where r.target_circle_id = c.id) as reports
         from circles c left join profiles cr on cr.id = c.created_by
        where ($1 = '' or lower(c.name) like $2)
        order by c.created_at desc limit 50 offset $3`,
      [q.trim(), escapeLike(q.trim()), offset],
    );
    return { circles: rows.map((r) => ({ id: r.id, name: r.name, createdAt: r.created_at, createdBy: r.created_by, members: r.members, reports: r.reports })) };
  });

  app.patch('/circles/:circleId', { onRequest: moderator, config: rl, schema: { params: idParams('circleId'), body: body({ name: text(60, 1), description: text(280) }) } }, async (req) => {
    const id = req.params.circleId;
    const before = await db.one('select name, description from circles where id = $1', [id]);
    if (!before) throw notFound();
    const name = req.body.name?.trim() || before.name;
    const description = req.body.description !== undefined ? req.body.description.trim() : before.description;
    await db.exec('update circles set name = $2, description = $3 where id = $1', [id, name, description]);
    await audit(req, 'circle_changed', 'circle', id, before, { name, description });
    return { ok: true };
  });

  app.delete('/circles/:circleId', { onRequest: moderator, config: rl, schema: { params: idParams('circleId') } }, async (req) => {
    const c = await db.one('delete from circles where id = $1 returning name, snapshot_path', [req.params.circleId]);
    if (!c) throw notFound();
    if (c.snapshot_path) await storage.remove('snapshots', [c.snapshot_path]).catch(() => {});
    await audit(req, 'circle_deleted', 'circle', req.params.circleId, { name: c.name });
    return { ok: true };
  });

  // ─── Reports and feedback ────────────────────────────────────────────────

  app.get('/reports', { onRequest: moderator, config: rl, schema: { querystring: page } }, async (req) => {
    const { status = null, offset = 0 } = req.query;
    const rows = await db.many(
      `select r.*, rp.name as reporter_name, tp.name as target_name, c.name as circle_name
         from reports r
         left join profiles rp on rp.id = r.reporter_id
         left join profiles tp on tp.id = r.target_user_id
         left join circles c on c.id = r.target_circle_id
        where ($1::text is null or r.status = $1)
        order by (r.status = 'new') desc, (r.reason in ('stalking', 'harassment')) desc, r.created_at desc limit 50 offset $2`,
      [status, offset],
    );
    return {
      reports: rows.map((r) => ({
        id: r.id,
        reason: r.reason,
        details: r.details,
        status: r.status,
        adminNote: r.admin_note,
        createdAt: r.created_at,
        reporter: r.reporter_id ? { id: r.reporter_id, name: r.reporter_name } : null,
        targetUser: r.target_user_id ? { id: r.target_user_id, name: r.target_name } : null,
        targetCircle: r.target_circle_id ? { id: r.target_circle_id, name: r.circle_name } : null,
      })),
    };
  });

  app.patch('/reports/:reportId', { onRequest: moderator, config: rl, schema: { params: idParams('reportId'), body: body({ status: { enum: ['new', 'reviewing', 'closed'] }, adminNote: text(2000) }) } }, async (req) => {
    const before = await db.one('select status, admin_note from reports where id = $1', [req.params.reportId]);
    if (!before) throw notFound();
    await db.exec('update reports set status = coalesce($2, status), admin_note = coalesce($3, admin_note) where id = $1', [req.params.reportId, req.body.status ?? null, req.body.adminNote ?? null]);
    await audit(req, 'report_updated', 'report', req.params.reportId, before, req.body);
    return { ok: true };
  });

  app.get('/feedback', { onRequest: moderator, config: rl, schema: { querystring: page } }, async (req) => {
    const { status = null, offset = 0 } = req.query;
    const rows = await db.many(
      `select f.*, p.name as user_name, a.email as user_email
         from feedback f left join profiles p on p.id = f.user_id left join auth.users a on a.id = f.user_id
        where ($1::text is null or f.status = $1) order by f.created_at desc limit 50 offset $2`,
      [status, offset],
    );
    return {
      feedback: rows.map((f) => ({
        id: f.id,
        message: f.message,
        status: f.status,
        appVersion: f.app_version,
        platform: f.platform,
        screen: f.screen,
        createdAt: f.created_at,
        user: f.user_id ? { id: f.user_id, name: f.user_name, email: f.user_email } : null,
      })),
    };
  });

  app.patch('/feedback/:feedbackId', { onRequest: moderator, config: rl, schema: { params: idParams('feedbackId'), body: body({ status: { enum: ['new', 'seen', 'done'] } }, ['status']) } }, async (req) => {
    const n = await db.exec('update feedback set status = $2 where id = $1', [req.params.feedbackId, req.body.status]);
    if (!n) throw notFound();
    await audit(req, 'feedback_updated', 'feedback', req.params.feedbackId, null, req.body);
    return { ok: true };
  });

  // ─── Invites ─────────────────────────────────────────────────────────────

  app.get('/invites', { onRequest: moderator, config: rl }, async () => ({
    invites: (
      await db.many(
        `select i.*, u.short_name as university from invite_codes i left join universities u on u.id = i.university_id order by i.created_at desc`,
      )
    ).map((i) => ({ code: i.code, maxUses: i.max_uses, uses: i.uses, university: i.university, expiresAt: i.expires_at, note: i.note, createdAt: i.created_at })),
  }));

  // Codes are random (BK-7KQ2XM style) so they can't be guessed.
  app.post('/invites', { onRequest: superAdmin, config: rl, schema: { body: body({ maxUses: { type: 'integer', minimum: 1, maximum: 5000 }, universityId: uuid, expiresAt: { type: 'string', format: 'date-time' }, note: text(200) }, ['maxUses']) } }, async (req, reply) => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const code = `BK-${Array.from(crypto.randomBytes(6), (b) => alphabet[b % 32]).join('')}`;
    await db.exec('insert into invite_codes (code, max_uses, university_id, expires_at, note, created_by) values ($1, $2, $3, $4, $5, $6)', [
      code,
      req.body.maxUses,
      req.body.universityId || null,
      req.body.expiresAt || null,
      req.body.note || '',
      req.admin.id,
    ]);
    await audit(req, 'invite_created', 'invite', code, null, req.body);
    return reply.status(201).send({ code });
  });

  app.delete('/invites/:code', { onRequest: superAdmin, config: rl, schema: { params: { type: 'object', additionalProperties: false, required: ['code'], properties: { code: { type: 'string', pattern: '^[A-Z0-9-]{6,32}$' } } } } }, async (req) => {
    const n = await db.exec('delete from invite_codes where code = $1', [req.params.code]);
    if (!n) throw notFound();
    await audit(req, 'invite_deleted', 'invite', req.params.code);
    return { ok: true };
  });

  // ─── Settings and limits ─────────────────────────────────────────────────

  const SETTING_SCHEMAS = {
    signups: body({ open: { type: 'boolean' }, invitesRequired: { type: 'boolean' } }, ['open', 'invitesRequired']),
    maintenance: body({ enabled: { type: 'boolean' }, message: text(200) }, ['enabled', 'message']),
    banner: body({ text: text(200), tone: { enum: ['info', 'warning'] } }, ['text', 'tone']),
    minAppVersion: { type: 'string', pattern: '^\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}$' },
    features: body({ watch: { type: 'boolean' }, feed: { type: 'boolean' }, googleSignIn: { type: 'boolean' } }, ['watch', 'feed', 'googleSignIn']),
  };

  app.get('/settings', { onRequest: moderator, config: rl }, async () => {
    const s = await settings.all();
    return { settings: Object.fromEntries(Object.keys(SETTING_SCHEMAS).map((k) => [k, s[k] ?? DEFAULT_SETTINGS[k]])) };
  });

  for (const [key, schema] of Object.entries(SETTING_SCHEMAS)) {
    app.put(`/settings/${key}`, { onRequest: superAdmin, config: rl, schema: { body: key === 'minAppVersion' ? body({ value: schema }, ['value']) : schema } }, async (req) => {
      const value = key === 'minAppVersion' ? req.body.value : req.body;
      const before = (await settings.all())[key];
      await settings.set(key, value, req.admin.id);
      await audit(req, 'setting_changed', 'setting', key, before, value);
      return { ok: true };
    });
  }

  app.get('/limits', { onRequest: moderator, config: rl }, async () => {
    const overrides = (await settings.all()).limits || {};
    return {
      limits: Object.entries(LIMITS).map(([name, l]) => ({
        name,
        label: l.label,
        defaultMax: l.max,
        max: overrides[name]?.max ?? l.max,
        windowSeconds: l.timeWindow / 1000,
      })),
    };
  });

  app.put(
    '/limits',
    {
      onRequest: superAdmin,
      config: rl,
      schema: { body: { type: 'object', additionalProperties: false, properties: Object.fromEntries(Object.keys(LIMITS).map((k) => [k, { type: ['integer', 'null'], minimum: 1, maximum: 100000 }])) } },
    },
    async (req) => {
      const before = (await settings.all()).limits || {};
      const next = { ...before };
      for (const [name, max] of Object.entries(req.body)) {
        if (max == null) delete next[name];
        else next[name] = { max };
      }
      await settings.set('limits', next, req.admin.id);
      await audit(req, 'limits_changed', 'setting', 'limits', before, next);
      return { ok: true };
    },
  );

  // ─── Audit log ───────────────────────────────────────────────────────────

  app.get('/audit', { onRequest: moderator, config: rl, schema: { querystring: page } }, async (req) => {
    const rows = await db.many(
      `select au.*, p.name as admin_name from admin_audit au left join profiles p on p.id = au.admin_id
        order by au.at desc limit 100 offset $1`,
      [req.query.offset || 0],
    );
    return { entries: rows.map((r) => ({ id: r.id, admin: r.admin_name, action: r.action, targetType: r.target_type, targetId: r.target_id, before: r.before, after: r.after, at: r.at })) };
  });

  // Who am I, for the console's header and to hide super-only controls.
  app.get('/me', { onRequest: moderator, config: rl }, async (req) => ({ id: req.admin.id, role: req.admin.role, name: req.user.name }));

}
