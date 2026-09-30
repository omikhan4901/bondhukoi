import { limit } from '../lib/limits.js';
import { body, idParams, uuid, text } from '../lib/schemas.js';
import { badRequest, notFound } from '../lib/errors.js';
import { card, CARD_COLUMNS, logEvent } from '../lib/people.js';

/** Blocking, reporting and feedback. */
export default async function safetyRoutes(app) {
  const { db, settings, storage } = app.ctx;
  app.addHook('onRequest', app.ctx.auth.requireUser);

  app.get('/blocks', { config: limit('read', settings) }, async (req) => {
    const rows = await db.many(
      `select ${CARD_COLUMNS}, b.created_at as blocked_at
         from blocks b join profiles p on p.id = b.blocked_id join universities u on u.id = p.university_id
        where b.blocker_id = $1 order by b.created_at desc`,
      [req.user.id],
    );
    return { blocked: rows.map((r) => ({ ...card(r, storage), blockedAt: r.blocked_at })) };
  });

  /**
   * Blocking ends the friendship, cancels requests and watches both ways, and from then on
   * neither person can find, request, watch or see the other, including in shared circles.
   */
  app.post('/blocks', { config: limit('write', settings), schema: { body: body({ userId: uuid }, ['userId']) } }, async (req) => {
    const me = req.user.id;
    const other = req.body.userId;
    if (other === me) throw badRequest('You can’t block yourself.', 'self');
    const exists = await db.one('select 1 as ok from profiles where id = $1', [other]);
    if (!exists) throw notFound();
    await db.tx(async (tx) => {
      await tx.exec('insert into blocks (blocker_id, blocked_id) values ($1, $2) on conflict do nothing', [me, other]);
      const [a, b] = me < other ? [me, other] : [other, me];
      await tx.exec('delete from friendships where user_a = $1 and user_b = $2', [a, b]);
      await tx.exec(
        'delete from friend_requests where (from_user_id = $1 and to_user_id = $2) or (from_user_id = $2 and to_user_id = $1)',
        [me, other],
      );
      await tx.exec('delete from watches where (watcher_id = $1 and watched_id = $2) or (watcher_id = $2 and watched_id = $1)', [me, other]);
    });
    await logEvent(db, me, 'blocked_someone');
    return { ok: true };
  });

  app.delete('/blocks/:userId', { config: limit('write', settings), schema: { params: idParams('userId') } }, async (req) => {
    const n = await db.exec('delete from blocks where blocker_id = $1 and blocked_id = $2', [req.user.id, req.params.userId]);
    if (!n) throw notFound();
    return { ok: true };
  });

  app.post(
    '/reports',
    {
      config: limit('report', settings),
      schema: {
        body: {
          ...body({
            userId: uuid,
            circleId: uuid,
            reason: { enum: ['harassment', 'stalking', 'fake_account', 'spam', 'inappropriate', 'other'] },
            details: text(1000),
          }, ['reason']),
          anyOf: [{ required: ['userId'] }, { required: ['circleId'] }],
        },
      },
    },
    async (req, reply) => {
      const { userId = null, circleId = null, reason, details = '' } = req.body;
      if (userId === req.user.id) throw badRequest('You can’t report yourself.', 'self');
      // You can only report a circle you are (or were invited to be) in.
      if (circleId) {
        const member = await db.one('select 1 as ok from circle_members where circle_id = $1 and user_id = $2', [circleId, req.user.id]);
        if (!member) throw notFound();
      }
      if (userId && !(await db.one('select 1 as ok from profiles where id = $1', [userId]))) throw notFound();
      const report = await db.one(
        `insert into reports (reporter_id, target_user_id, target_circle_id, reason, details)
         values ($1, $2, $3, $4, $5) returning id`,
        [req.user.id, userId, circleId, reason, details.trim()],
      );
      await logEvent(db, req.user.id, 'report_sent', { reason });
      return reply.status(201).send({ id: report.id });
    },
  );

  app.post(
    '/feedback',
    {
      config: limit('feedback', settings),
      schema: {
        body: body({ message: text(2000, 1), appVersion: text(20), platform: text(20), screen: text(80) }, ['message']),
      },
    },
    async (req, reply) => {
      const message = req.body.message.trim();
      if (!message) throw badRequest('Write a few words first.', 'empty');
      await db.exec('insert into feedback (user_id, message, app_version, platform, screen) values ($1, $2, $3, $4, $5)', [
        req.user.id,
        message,
        req.body.appVersion || null,
        req.body.platform || null,
        req.body.screen || null,
      ]);
      return reply.status(201).send({ ok: true });
    },
  );
}
