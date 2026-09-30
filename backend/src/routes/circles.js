import crypto from 'node:crypto';
import sharp from 'sharp';
import { limit } from '../lib/limits.js';
import { body, idParams, uuid, text, nullableText } from '../lib/schemas.js';
import { badRequest, conflict, forbidden, notFound } from '../lib/errors.js';
import { card, CARD_COLUMNS, logEvent } from '../lib/people.js';
import { PRESENCE_COLUMNS, blockedBetween, describePresence } from '../lib/visibility.js';
import { polygonSchema, polygonToWkt, geojsonToPoints } from '../lib/geo.js';
import { leaveCircle, membership } from '../lib/circles.js';
import { notify } from '../lib/notify.js';

const MAX_CIRCLES_PER_USER = 30;
const MAX_MEMBERS = 100;
const CHAT_HOSTS = new Set(['m.me', 'messenger.com', 'www.messenger.com', 'facebook.com', 'www.facebook.com', 'chat.whatsapp.com', 't.me', 'discord.gg', 'discord.com']);

function chatLink(value) {
  if (value == null || value.trim() === '') return null;
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    throw badRequest('That link doesn’t look right.', 'invalid_link');
  }
  if (url.protocol !== 'https:' || !CHAT_HOSTS.has(url.hostname)) {
    throw badRequest('Use a Messenger, WhatsApp, Telegram or Discord group link.', 'invalid_link');
  }
  return url.toString();
}

export default async function circleRoutes(app) {
  const { db, settings, storage } = app.ctx;
  const ctx = app.ctx;
  app.addHook('onRequest', ctx.auth.requireUser);

  const snapshotUrl = (path) => storage.signedUrl('snapshots', path, 3600);

  async function requireMember(circleId, userId, { admin = false, allowPending = false } = {}) {
    const m = await membership(db, circleId, userId);
    if (!m || (m.status !== 'active' && !allowPending)) throw notFound('Circle not found.');
    if (admin && m.role !== 'admin') throw forbidden('Only circle admins can do that.');
    return m;
  }

  async function saveSnapshot(circleId, base64) {
    let jpeg;
    try {
      jpeg = await sharp(Buffer.from(base64, 'base64'), { limitInputPixels: 20_000_000 })
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 78, mozjpeg: true })
        .toBuffer();
    } catch {
      throw badRequest('The map picture couldn’t be read.', 'invalid_image');
    }
    const path = `${circleId}/${crypto.randomBytes(10).toString('hex')}.jpg`;
    const old = await db.one('select snapshot_path from circles where id = $1', [circleId]);
    await storage.upload('snapshots', path, jpeg, 'image/jpeg');
    await db.exec('update circles set snapshot_path = $2, snapshot_updated_at = now() where id = $1', [circleId, path]);
    if (old?.snapshot_path) await storage.remove('snapshots', [old.snapshot_path]).catch(() => {});
  }

  async function saveZone(tx, circleId, boundary) {
    const wkt = polygonToWkt(boundary);
    const valid = await tx.one('select ST_IsValid(ST_GeomFromText($1, 4326)) as ok', [wkt]);
    if (!valid.ok) throw badRequest('The zone’s edges cross each other. Redraw it as a simple shape.', 'invalid_zone');
    await tx.exec(
      `insert into circle_boundaries (circle_id, boundary, updated_at) values ($1, ST_GeomFromText($2, 4326), now())
       on conflict (circle_id) do update set boundary = excluded.boundary, updated_at = now()`,
      [circleId, wkt],
    );
  }

  /** Invites people who are friends of the inviter and not blocked with them. */
  async function invite(tx, circleId, inviterId, userIds) {
    const eligible = await tx.many(
      `select p.id from profiles p
        where p.id = any($2) and p.id <> $1 and p.status = 'active'
          and exists (select 1 from friendships f where (f.user_a = $1 and f.user_b = p.id) or (f.user_b = $1 and f.user_a = p.id))
          and not ${blockedBetween('$1', 'p.id')}
          and not exists (select 1 from circle_members m where m.circle_id = $3 and m.user_id = p.id)`,
      [inviterId, userIds, circleId],
    );
    const count = await tx.one('select count(*) as n from circle_members where circle_id = $1', [circleId]);
    if (count.n + eligible.length > MAX_MEMBERS) throw conflict(`A circle can have up to ${MAX_MEMBERS} people.`, 'circle_full');
    for (const { id } of eligible) {
      await tx.exec(`insert into circle_members (circle_id, user_id, role, status, invited_by) values ($1, $2, 'member', 'pending', $3)`, [
        circleId,
        id,
        inviterId,
      ]);
    }
    return eligible.map((e) => e.id);
  }

  async function circleSummaries(userId, status) {
    const rows = await db.many(
      `select c.*, m.role, m.detection_enabled, m.invited_by,
              (select count(*) from circle_members x where x.circle_id = c.id and x.status = 'active') as member_count,
              exists (select 1 from circle_boundaries b where b.circle_id = c.id) as has_zone,
              inv.name as invited_by_name
         from circle_members m join circles c on c.id = m.circle_id
         left join profiles inv on inv.id = m.invited_by
        where m.user_id = $1 and m.status = $2
        order by c.name`,
      [userId, status],
    );
    if (!rows.length) return [];
    const ids = rows.map((r) => r.id);
    const members = await db.many(
      `select m.circle_id, m.detection_enabled, ${CARD_COLUMNS}, ${PRESENCE_COLUMNS},
              row_number() over (partition by m.circle_id order by m.joined_at nulls last) as n
         from circle_members m
         join profiles p on p.id = m.user_id
         join universities u on u.id = p.university_id
         left join presence pr on pr.user_id = p.id
        where m.circle_id = any($1) and m.status = 'active' and not ${blockedBetween('$2', 'p.id')}`,
      [ids, userId],
    );
    const now = new Date();
    const out = [];
    for (const r of rows) {
      const inCircle = members.filter((m) => m.circle_id === r.id);
      const here = status === 'active'
        ? inCircle.filter((m) => m.id !== userId && m.detection_enabled && describePresence({ ...m, share_campus: false }, new Map([[r.id, r.name]]), now).circles.length).length
        : 0;
      out.push({
        id: r.id,
        name: r.name,
        description: r.description,
        role: r.role,
        detectionEnabled: r.detection_enabled,
        memberCount: r.member_count,
        hereCount: here,
        members: inCircle.filter((m) => m.n <= 5).map((m) => card(m, storage)),
        hasZone: r.has_zone,
        locationLabel: r.location_label,
        messengerLink: status === 'active' ? r.messenger_link : null,
        snapshotUrl: status === 'active' ? await snapshotUrl(r.snapshot_path) : null,
        invitedBy: status === 'pending' && r.invited_by ? { id: r.invited_by, name: r.invited_by_name } : undefined,
        createdAt: r.created_at,
      });
    }
    return out;
  }

  app.get('/', { config: limit('read', settings) }, async (req) => ({ circles: await circleSummaries(req.user.id, 'active') }));

  app.get('/invitations', { config: limit('read', settings) }, async (req) => ({ invitations: await circleSummaries(req.user.id, 'pending') }));

  app.post(
    '/',
    {
      bodyLimit: 3 * 1024 * 1024,
      config: limit('circleCreate', settings),
      schema: {
        body: body(
          {
            name: text(60, 1),
            description: text(280),
            locationLabel: nullableText(80),
            inviteeIds: { type: 'array', minItems: 1, maxItems: 50, uniqueItems: true, items: uuid },
            boundary: polygonSchema,
            snapshotBase64: text(2 * 1024 * 1024, 16),
          },
          ['name', 'inviteeIds'],
        ),
      },
    },
    async (req, reply) => {
      const me = req.user.id;
      const name = req.body.name.trim();
      if (!name) throw badRequest('Give the circle a name.', 'invalid_name');
      const count = await db.one(`select count(*) as n from circle_members where user_id = $1`, [me]);
      if (count.n >= MAX_CIRCLES_PER_USER) throw conflict(`You can be in up to ${MAX_CIRCLES_PER_USER} circles.`, 'too_many_circles');

      const circle = await db.tx(async (tx) => {
        const c = await tx.one(
          `insert into circles (name, description, location_label, university_id, created_by)
           values ($1, $2, $3, $4, $5) returning id`,
          [name, (req.body.description || '').trim(), req.body.locationLabel?.trim() || null, req.user.universityId, me],
        );
        await tx.exec(`insert into circle_members (circle_id, user_id, role, status, joined_at) values ($1, $2, 'admin', 'active', now())`, [c.id, me]);
        const invited = await invite(tx, c.id, me, req.body.inviteeIds);
        if (!invited.length) throw badRequest('Invite at least one friend.', 'no_invitees');
        if (req.body.boundary) await saveZone(tx, c.id, req.body.boundary);
        return { id: c.id, invited };
      });
      if (req.body.snapshotBase64 && req.body.boundary) await saveSnapshot(circle.id, req.body.snapshotBase64);

      await logEvent(db, me, 'circle_created');
      await notify(ctx, circle.invited, {
        kind: 'circle_invite',
        title: 'Circle invitation',
        body: `${req.user.name} invited you to ${name}.`,
        data: { circleId: circle.id },
      });
      return reply.status(201).send({ id: circle.id, invited: circle.invited.length });
    },
  );

  /**
   * A circle with its members. Each member shows only whether they're in this circle's
   * zone right now (and only if they left detection on); campus status is for friends.
   * Someone with a pending invitation sees a preview without anyone's status.
   */
  app.get('/:circleId', { config: limit('read', settings), schema: { params: idParams('circleId') } }, async (req) => {
    const me = req.user.id;
    const { circleId } = req.params;
    const mine = await requireMember(circleId, me, { allowPending: true });
    const c = await db.one('select * from circles where id = $1', [circleId]);
    const zone = await db.one('select 1 as ok from circle_boundaries where circle_id = $1', [circleId]);
    const rows = await db.many(
      `select m.role, m.status as member_status, m.detection_enabled, m.joined_at, ${CARD_COLUMNS}, ${PRESENCE_COLUMNS}
         from circle_members m
         join profiles p on p.id = m.user_id
         join universities u on u.id = p.university_id
         left join presence pr on pr.user_id = p.id
        where m.circle_id = $1 and (m.status = 'active' or $3) and not ${blockedBetween('$2', 'p.id')}
        order by (m.role = 'admin') desc, p.name`,
      [circleId, me, mine.status === 'active'],
    );

    const active = mine.status === 'active';
    const now = new Date();
    const zoneMap = new Map([[circleId, c.name]]);
    return {
      circle: {
        id: c.id,
        name: c.name,
        description: c.description,
        locationLabel: c.location_label,
        membersCanInvite: c.members_can_invite,
        messengerLink: active ? c.messenger_link : null,
        hasZone: Boolean(zone),
        snapshotUrl: active ? await snapshotUrl(c.snapshot_path) : null,
        createdAt: c.created_at,
      },
      me: { role: mine.role, status: mine.status, detectionEnabled: mine.detection_enabled },
      members: rows.map((m) => {
        const presence =
          active && m.id !== me && m.member_status === 'active' && m.detection_enabled
            ? describePresence({ ...m, share_campus: false }, zoneMap, now)
            : null;
        return {
          ...card(m, storage),
          role: m.role,
          status: m.member_status,
          here: presence ? presence.circles.length > 0 : null,
          presenceState: presence ? presence.state : null,
          joinedAt: m.joined_at,
        };
      }),
    };
  });

  app.patch(
    '/:circleId',
    {
      config: limit('write', settings),
      schema: {
        params: idParams('circleId'),
        body: body({
          name: text(60, 1),
          description: text(280),
          membersCanInvite: { type: 'boolean' },
          messengerLink: nullableText(300),
          locationLabel: nullableText(80),
        }),
      },
    },
    async (req) => {
      const { circleId } = req.params;
      await requireMember(circleId, req.user.id, { admin: true });
      const b = req.body;
      const updates = {};
      if (b.name !== undefined) {
        if (!b.name.trim()) throw badRequest('Give the circle a name.', 'invalid_name');
        updates.name = b.name.trim();
      }
      if (b.description !== undefined) updates.description = b.description.trim();
      if (b.membersCanInvite !== undefined) updates.members_can_invite = b.membersCanInvite;
      if (b.messengerLink !== undefined) updates.messenger_link = chatLink(b.messengerLink);
      if (b.locationLabel !== undefined) updates.location_label = b.locationLabel?.trim() || null;
      const keys = Object.keys(updates);
      if (keys.length) {
        await db.exec(`update circles set ${keys.map((k, i) => `${k} = $${i + 2}`).join(', ')} where id = $1`, [
          circleId,
          ...keys.map((k) => updates[k]),
        ]);
      }
      return { ok: true };
    },
  );

  app.delete('/:circleId', { config: limit('write', settings), schema: { params: idParams('circleId') } }, async (req) => {
    await requireMember(req.params.circleId, req.user.id, { admin: true });
    const c = await db.one('delete from circles where id = $1 returning snapshot_path', [req.params.circleId]);
    if (c?.snapshot_path) await storage.remove('snapshots', [c.snapshot_path]).catch(() => {});
    return { ok: true };
  });

  app.post(
    '/:circleId/members',
    {
      config: limit('write', settings),
      schema: {
        params: idParams('circleId'),
        body: body({ userIds: { type: 'array', minItems: 1, maxItems: 50, uniqueItems: true, items: uuid } }, ['userIds']),
      },
    },
    async (req, reply) => {
      const me = req.user.id;
      const { circleId } = req.params;
      const m = await requireMember(circleId, me);
      const c = await db.one('select name, members_can_invite from circles where id = $1', [circleId]);
      if (m.role !== 'admin' && !c.members_can_invite) throw forbidden('Only circle admins can invite people here.');
      const invited = await db.tx((tx) => invite(tx, circleId, me, req.body.userIds));
      if (invited.length) {
        await notify(ctx, invited, {
          kind: 'circle_invite',
          title: 'Circle invitation',
          body: `${req.user.name} invited you to ${c.name}.`,
          data: { circleId },
        });
      }
      return reply.status(201).send({ invited: invited.length });
    },
  );

  // Leave (yourself), or remove someone (admins, and not other admins).
  app.delete(
    '/:circleId/members/:userId',
    { config: limit('write', settings), schema: { params: idParams('circleId', 'userId') } },
    async (req) => {
      const me = req.user.id;
      const { circleId, userId } = req.params;
      if (userId !== me) {
        await requireMember(circleId, me, { admin: true });
        const target = await membership(db, circleId, userId);
        if (!target) throw notFound('They aren’t in this circle.');
        if (target.role === 'admin') throw forbidden('Admins can’t remove other admins.');
      } else {
        await requireMember(circleId, me, { allowPending: true });
      }
      const paths = await db.tx((tx) => leaveCircle(tx, circleId, userId));
      await storage.remove('snapshots', paths).catch(() => {});
      await logEvent(db, me, userId === me ? 'circle_left' : 'circle_member_removed');
      return { ok: true };
    },
  );

  app.patch(
    '/:circleId/members/:userId',
    {
      config: limit('write', settings),
      schema: { params: idParams('circleId', 'userId'), body: body({ role: { enum: ['admin', 'member'] } }, ['role']) },
    },
    async (req) => {
      const { circleId, userId } = req.params;
      await requireMember(circleId, req.user.id, { admin: true });
      const target = await membership(db, circleId, userId);
      if (!target || target.status !== 'active') throw notFound('They aren’t in this circle.');
      if (req.body.role === 'member') {
        const admins = await db.one(`select count(*) as n from circle_members where circle_id = $1 and role = 'admin' and status = 'active'`, [circleId]);
        if (target.role === 'admin' && admins.n <= 1) throw conflict('A circle needs at least one admin.', 'last_admin');
      }
      await db.exec('update circle_members set role = $3 where circle_id = $1 and user_id = $2', [circleId, userId, req.body.role]);
      return { ok: true };
    },
  );

  app.post('/:circleId/accept', { config: limit('write', settings), schema: { params: idParams('circleId') } }, async (req) => {
    const n = await db.exec(
      `update circle_members set status = 'active', joined_at = now()
        where circle_id = $1 and user_id = $2 and status = 'pending'`,
      [req.params.circleId, req.user.id],
    );
    if (!n) throw notFound('That invitation is no longer waiting.');
    await logEvent(db, req.user.id, 'circle_joined');
    return { ok: true };
  });

  app.post('/:circleId/decline', { config: limit('write', settings), schema: { params: idParams('circleId') } }, async (req) => {
    const n = await db.exec(`delete from circle_members where circle_id = $1 and user_id = $2 and status = 'pending'`, [
      req.params.circleId,
      req.user.id,
    ]);
    if (!n) throw notFound('That invitation is no longer waiting.');
    return { ok: true };
  });

  // Your own setting: whether this circle can see when you're in its zone.
  app.patch(
    '/:circleId/me',
    {
      config: limit('write', settings),
      schema: { params: idParams('circleId'), body: body({ detectionEnabled: { type: 'boolean' } }, ['detectionEnabled']) },
    },
    async (req) => {
      const { circleId } = req.params;
      await requireMember(circleId, req.user.id);
      await db.tx(async (tx) => {
        await tx.exec('update circle_members set detection_enabled = $3 where circle_id = $1 and user_id = $2', [
          circleId,
          req.user.id,
          req.body.detectionEnabled,
        ]);
        if (!req.body.detectionEnabled) {
          await tx.exec('update presence set circle_ids = array_remove(circle_ids, $2) where user_id = $1', [req.user.id, circleId]);
        }
      });
      return { detectionEnabled: req.body.detectionEnabled };
    },
  );

  app.get('/:circleId/zone', { config: limit('read', settings), schema: { params: idParams('circleId') } }, async (req) => {
    await requireMember(req.params.circleId, req.user.id);
    const zone = await db.one('select ST_AsGeoJSON(boundary) as geojson, updated_at from circle_boundaries where circle_id = $1', [
      req.params.circleId,
    ]);
    const c = await db.one('select snapshot_path from circles where id = $1', [req.params.circleId]);
    return { boundary: geojsonToPoints(zone?.geojson), updatedAt: zone?.updated_at || null, snapshotUrl: await snapshotUrl(c.snapshot_path) };
  });

  app.put(
    '/:circleId/zone',
    {
      bodyLimit: 3 * 1024 * 1024,
      config: limit('boundary', settings),
      schema: { params: idParams('circleId'), body: body({ boundary: polygonSchema, snapshotBase64: text(2 * 1024 * 1024, 16) }, ['boundary']) },
    },
    async (req) => {
      const { circleId } = req.params;
      await requireMember(circleId, req.user.id, { admin: true });
      await db.tx((tx) => saveZone(tx, circleId, req.body.boundary));
      if (req.body.snapshotBase64) await saveSnapshot(circleId, req.body.snapshotBase64);
      await logEvent(db, req.user.id, 'circle_zone_saved');
      return { ok: true };
    },
  );

  app.delete('/:circleId/zone', { config: limit('write', settings), schema: { params: idParams('circleId') } }, async (req) => {
    const { circleId } = req.params;
    await requireMember(circleId, req.user.id, { admin: true });
    const c = await db.one('select snapshot_path from circles where id = $1', [circleId]);
    await db.tx(async (tx) => {
      await tx.exec('delete from circle_boundaries where circle_id = $1', [circleId]);
      await tx.exec('update circles set snapshot_path = null, snapshot_updated_at = now() where id = $1', [circleId]);
      await tx.exec('update presence set circle_ids = array_remove(circle_ids, $1) where $1 = any(circle_ids)', [circleId]);
    });
    if (c.snapshot_path) await storage.remove('snapshots', [c.snapshot_path]).catch(() => {});
    return { ok: true };
  });

  /**
   * Today in this circle: arrivals and departures of members who still share them with
   * you (active, detection on, not blocked, sharing on). Nothing older than 24 hours.
   */
  app.get('/:circleId/activity', { config: limit('read', settings), schema: { params: idParams('circleId') } }, async (req) => {
    if ((await settings.all()).features?.feed === false) return { events: [] };
    const me = req.user.id;
    const { circleId } = req.params;
    await requireMember(circleId, me);
    const rows = await db.many(
      `select t.id, t.kind, t.at, ${CARD_COLUMNS}
         from transitions t
         join circle_members m on m.circle_id = t.circle_id and m.user_id = t.user_id
         join profiles p on p.id = t.user_id
         join universities u on u.id = p.university_id
        where t.circle_id = $1 and t.at > now() - interval '24 hours'
          and m.status = 'active' and m.detection_enabled
          and p.status = 'active' and p.sharing_enabled and t.user_id <> $2
          and not ${blockedBetween('$2', 'p.id')}
        order by t.at desc limit 50`,
      [circleId, me],
    );
    return { events: rows.map((r) => ({ id: r.id, kind: r.kind, at: r.at, user: card(r, storage) })) };
  });

}
