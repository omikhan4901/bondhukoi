import { limit } from '../lib/limits.js';
import { body, idParams, uuid, friendCode } from '../lib/schemas.js';
import { badRequest, conflict, notFound } from '../lib/errors.js';
import { card, friendCard, CARD_COLUMNS, pair, areFriends, isBlockedEitherWay, logEvent } from '../lib/people.js';
import { PRESENCE_COLUMNS, describePresence, sharedDetectableCircles } from '../lib/visibility.js';
import { notify } from '../lib/notify.js';

const MAX_PENDING_OUT = 50;

export default async function friendRoutes(app) {
  const { db, settings, storage } = app.ctx;
  const ctx = app.ctx;
  const { requireUser } = ctx.auth;
  app.addHook('onRequest', requireUser);

  /** Your friends, each with what you're allowed to know about where they are. */
  app.get('/', { config: limit('read', settings) }, async (req) => {
    const me = req.user.id;
    const rows = await db.many(
      `select ${CARD_COLUMNS}, ${PRESENCE_COLUMNS}, f.created_at as friends_since,
              w.id as watch_id, w.status as watch_status, w.scope as watch_scope
         from friendships f
         join profiles p on p.id = case when f.user_a = $1 then f.user_b else f.user_a end
         join universities u on u.id = p.university_id
         left join presence pr on pr.user_id = p.id
         left join watches w on w.watcher_id = $1 and w.watched_id = p.id
        where (f.user_a = $1 or f.user_b = $1)
        order by p.name`,
      [me],
    );
    const circles = await sharedDetectableCircles(db, me, rows.map((r) => r.id));
    const now = new Date();
    return {
      friends: rows.map((r) => ({
        ...friendCard(r, storage),
        presence: describePresence(r, circles.get(r.id), now),
        watch: r.watch_id ? { id: r.watch_id, status: r.watch_status, scope: r.watch_scope } : null,
        friendsSince: r.friends_since,
      })),
    };
  });

  app.delete('/:userId', { config: limit('write', settings), schema: { params: idParams('userId') } }, async (req) => {
    const [a, b] = pair(req.user.id, req.params.userId);
    const removed = await db.tx(async (tx) => {
      const n = await tx.exec('delete from friendships where user_a = $1 and user_b = $2', [a, b]);
      // Watches only make sense between friends.
      await tx.exec(
        'delete from watches where (watcher_id = $1 and watched_id = $2) or (watcher_id = $2 and watched_id = $1)',
        [a, b],
      );
      return n;
    });
    if (!removed) throw notFound('You aren’t friends with this person.');
    await logEvent(db, req.user.id, 'unfriended');
    return { ok: true };
  });

  app.get('/requests', { config: limit('read', settings) }, async (req) => {
    const me = req.user.id;
    const [incoming, outgoing] = await Promise.all([
      db.many(
        `select r.id as request_id, r.created_at, ${CARD_COLUMNS}
           from friend_requests r join profiles p on p.id = r.from_user_id join universities u on u.id = p.university_id
          where r.to_user_id = $1 and p.status = 'active' order by r.created_at desc`,
        [me],
      ),
      db.many(
        `select r.id as request_id, r.created_at, ${CARD_COLUMNS}
           from friend_requests r join profiles p on p.id = r.to_user_id join universities u on u.id = p.university_id
          where r.from_user_id = $1 order by r.created_at desc`,
        [me],
      ),
    ]);
    const shape = (r) => ({ id: r.request_id, createdAt: r.created_at, user: card(r, storage) });
    return { incoming: incoming.map(shape), outgoing: outgoing.map(shape) };
  });

  /**
   * Sends a request by user id or friend code. If they already asked you, this accepts
   * theirs instead. Blocked pairs get the same "not found" as a wrong code.
   */
  app.post(
    '/requests',
    {
      config: limit('friendRequest', settings),
      schema: { body: { ...body({ userId: uuid, friendCode }), oneOf: [{ required: ['userId'] }, { required: ['friendCode'] }] } },
    },
    async (req, reply) => {
      const me = req.user.id;
      const target = req.body.userId
        ? await db.one(`select id, name from profiles where id = $1 and status = 'active'`, [req.body.userId])
        : await db.one(`select id, name from profiles where friend_code = $1 and status = 'active'`, [req.body.friendCode.toUpperCase()]);
      if (!target || (await isBlockedEitherWay(db, me, target.id))) throw notFound('No one found with that code.');
      if (target.id === me) throw badRequest('That’s your own code.', 'self');
      if (await areFriends(db, me, target.id)) throw conflict('You’re already friends.', 'already_friends');

      const reverse = await db.one('select id from friend_requests where from_user_id = $1 and to_user_id = $2', [target.id, me]);
      if (reverse) {
        await acceptRequest(reverse.id, me);
        return reply.status(200).send({ status: 'friends' });
      }

      const pending = await db.one('select count(*) as n from friend_requests where from_user_id = $1', [me]);
      if (pending.n >= MAX_PENDING_OUT) throw conflict('You have too many requests waiting. Cancel some first.', 'too_many_pending');

      const created = await db.one(
        `insert into friend_requests (from_user_id, to_user_id) values ($1, $2)
         on conflict (from_user_id, to_user_id) do nothing returning id`,
        [me, target.id],
      );
      if (created) {
        await logEvent(db, me, 'friend_request_sent');
        await notify(ctx, [target.id], {
          kind: 'friend_request',
          title: 'New friend request',
          body: `${req.user.name} wants to be friends.`,
          data: { requestId: created.id },
        });
      }
      return reply.status(201).send({ status: 'requested' });
    },
  );

  async function acceptRequest(requestId, me) {
    const request = await db.tx(async (tx) => {
      const r = await tx.one('delete from friend_requests where id = $1 and to_user_id = $2 returning from_user_id', [requestId, me]);
      if (!r) return null;
      if (await isBlockedEitherWay(tx, me, r.from_user_id)) return null;
      const [a, b] = pair(me, r.from_user_id);
      await tx.exec('insert into friendships (user_a, user_b) values ($1, $2) on conflict do nothing', [a, b]);
      await tx.exec('delete from friend_requests where from_user_id = $1 and to_user_id = $2', [me, r.from_user_id]);
      return r;
    });
    if (!request) throw notFound('That request is no longer waiting.');
    await logEvent(db, me, 'friend_added');
    const accepter = await db.one('select name from profiles where id = $1', [me]);
    await notify(ctx, [request.from_user_id], {
      kind: 'friend_accepted',
      title: 'Friend request accepted',
      body: `You and ${accepter.name} are now friends.`,
      data: { userId: me },
    });
  }

  // Only the person the request was sent to can accept it.
  app.post('/requests/:requestId/accept', { config: limit('write', settings), schema: { params: idParams('requestId') } }, async (req) => {
    await acceptRequest(req.params.requestId, req.user.id);
    return { status: 'friends' };
  });

  // The receiver declines, or the sender cancels.
  app.delete('/requests/:requestId', { config: limit('write', settings), schema: { params: idParams('requestId') } }, async (req) => {
    const n = await db.exec('delete from friend_requests where id = $1 and (from_user_id = $2 or to_user_id = $2)', [
      req.params.requestId,
      req.user.id,
    ]);
    if (!n) throw notFound('That request is no longer waiting.');
    return { ok: true };
  });
}
