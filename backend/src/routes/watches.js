import { limit } from '../lib/limits.js';
import { body, idParams, uuid } from '../lib/schemas.js';
import { conflict, forbidden, notFound } from '../lib/errors.js';
import { card, CARD_COLUMNS, areFriends, isBlockedEitherWay, logEvent } from '../lib/people.js';
import { notify } from '../lib/notify.js';

/**
 * Watching: a friend asks to be told when you arrive or leave. Nothing happens until the
 * watched person accepts, and either side can end it at any time.
 */
export default async function watchRoutes(app) {
  const { db, settings, storage } = app.ctx;
  const ctx = app.ctx;
  app.addHook('onRequest', ctx.auth.requireUser);

  async function featureOn() {
    if ((await settings.all()).features?.watch === false) throw forbidden('Watching is turned off right now.', 'feature_off');
  }

  app.get('/', { config: limit('read', settings) }, async (req) => {
    const me = req.user.id;
    const rows = await db.many(
      `select w.id, w.scope, w.status, w.created_at, w.accepted_at, w.watcher_id, ${CARD_COLUMNS}
         from watches w
         join profiles p on p.id = case when w.watcher_id = $1 then w.watched_id else w.watcher_id end
         join universities u on u.id = p.university_id
        where w.watcher_id = $1 or w.watched_id = $1
        order by w.created_at desc`,
      [me],
    );
    const shape = (r) => ({ id: r.id, scope: r.scope, status: r.status, createdAt: r.created_at, acceptedAt: r.accepted_at, user: card(r, storage) });
    return {
      watching: rows.filter((r) => r.watcher_id === me).map(shape),
      watchers: rows.filter((r) => r.watcher_id !== me).map(shape),
    };
  });

  app.post(
    '/',
    {
      config: limit('write', settings),
      schema: { body: body({ userId: uuid, scope: { enum: ['campus', 'all'] } }, ['userId', 'scope']) },
    },
    async (req, reply) => {
      await featureOn();
      const me = req.user.id;
      const { userId, scope } = req.body;
      if (userId === me || !(await areFriends(db, me, userId)) || (await isBlockedEitherWay(db, me, userId))) {
        throw notFound('You can only watch your friends.');
      }
      const created = await db.one(
        `insert into watches (watcher_id, watched_id, scope) values ($1, $2, $3)
         on conflict (watcher_id, watched_id) do nothing returning id`,
        [me, userId, scope],
      );
      if (!created) throw conflict('You already asked to watch this friend.', 'already_watching');
      await logEvent(db, me, 'watch_requested', { scope });
      await notify(ctx, [userId], {
        kind: 'watch_request',
        title: 'Watch request',
        body:
          scope === 'campus'
            ? `${req.user.name} wants to know when you arrive at or leave campus.`
            : `${req.user.name} wants to know when you arrive at or leave campus or your shared circles.`,
        data: { watchId: created.id },
      });
      return reply.status(201).send({ id: created.id, status: 'pending' });
    },
  );

  // Only the watched person can accept.
  app.post('/:watchId/accept', { config: limit('write', settings), schema: { params: idParams('watchId') } }, async (req) => {
    await featureOn();
    const me = req.user.id;
    const watch = await db.one(
      `update watches set status = 'active', accepted_at = now()
        where id = $1 and watched_id = $2 and status = 'pending'
          and not exists (select 1 from blocks b where (b.blocker_id = watcher_id and b.blocked_id = watched_id)
                                                or (b.blocker_id = watched_id and b.blocked_id = watcher_id))
        returning watcher_id`,
      [req.params.watchId, me],
    );
    if (!watch) throw notFound('That watch request is no longer waiting.');
    await logEvent(db, me, 'watch_accepted');
    await notify(ctx, [watch.watcher_id], {
      kind: 'watch_started',
      title: 'Watch accepted',
      body: `${req.user.name} said yes. You’ll hear when they arrive or leave.`,
      data: { userId: me },
    });
    return { status: 'active' };
  });

  // Either person can end a watch (or decline or cancel a request).
  app.delete('/:watchId', { config: limit('write', settings), schema: { params: idParams('watchId') } }, async (req) => {
    const n = await db.exec('delete from watches where id = $1 and (watcher_id = $2 or watched_id = $2)', [
      req.params.watchId,
      req.user.id,
    ]);
    if (!n) throw notFound();
    return { ok: true };
  });
}
