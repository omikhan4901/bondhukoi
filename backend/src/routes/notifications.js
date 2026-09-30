import { limit } from '../lib/limits.js';
import { card, CARD_COLUMNS } from '../lib/people.js';
import { blockedBetween } from '../lib/visibility.js';

const PAGE = 30;

/**
 * One list for the bell: things waiting for you (friend requests, circle invitations,
 * watch requests) and, below them, alerts from friends you watch. Alerts follow each
 * watch's scope: campus always; circles only for "all" watches and only circles you're in.
 */
export default async function notificationRoutes(app) {
  const { db, settings, storage } = app.ctx;
  app.addHook('onRequest', app.ctx.auth.requireUser);

  app.get(
    '/',
    {
      config: limit('read', settings),
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: { before: { type: 'string', format: 'date-time' } },
        },
      },
    },
    async (req) => {
      const me = req.user.id;
      const before = req.query.before || null;

      let waiting = [];
      if (!before) {
        const [friendRequests, invites, watchRequests] = await Promise.all([
          db.many(
            `select r.id as item_id, r.created_at as at, ${CARD_COLUMNS}
               from friend_requests r join profiles p on p.id = r.from_user_id join universities u on u.id = p.university_id
              where r.to_user_id = $1 and p.status = 'active'`,
            [me],
          ),
          db.many(
            `select c.id as item_id, c.name as circle_name, m.created_at as at, ${CARD_COLUMNS}
               from circle_members m join circles c on c.id = m.circle_id
               left join profiles p on p.id = m.invited_by left join universities u on u.id = p.university_id
              where m.user_id = $1 and m.status = 'pending'`,
            [me],
          ),
          db.many(
            `select w.id as item_id, w.scope, w.created_at as at, ${CARD_COLUMNS}
               from watches w join profiles p on p.id = w.watcher_id join universities u on u.id = p.university_id
              where w.watched_id = $1 and w.status = 'pending' and p.status = 'active'`,
            [me],
          ),
        ]);
        waiting = [
          ...friendRequests.map((r) => ({ type: 'friend_request', id: r.item_id, at: r.at, user: card(r, storage) })),
          ...invites.map((r) => ({
            type: 'circle_invite',
            id: r.item_id,
            at: r.at,
            circle: { id: r.item_id, name: r.circle_name },
            user: r.id ? card(r, storage) : null,
          })),
          ...watchRequests.map((r) => ({ type: 'watch_request', id: r.item_id, at: r.at, scope: r.scope, user: card(r, storage) })),
        ].sort((a, b) => new Date(b.at) - new Date(a.at));
      }

      const alerts = await db.many(
        `select t.id, t.zone, t.kind, t.at, t.circle_id, c.name as circle_name, ${CARD_COLUMNS}
           from watches w
           join transitions t on t.user_id = w.watched_id and t.at >= w.accepted_at
           join profiles p on p.id = w.watched_id
           join universities u on u.id = p.university_id
           left join circles c on c.id = t.circle_id
          where w.watcher_id = $1 and w.status = 'active'
            and p.status = 'active'
            and not ${blockedBetween('$1', 'p.id')}
            and (t.zone = 'campus'
                 or (w.scope = 'all' and exists (select 1 from circle_members m where m.circle_id = t.circle_id and m.user_id = $1 and m.status = 'active')))
            and ($2::timestamptz is null or t.at < $2)
          order by t.at desc
          limit ${PAGE + 1}`,
        [me, before],
      );
      const hasMore = alerts.length > PAGE;
      const page = alerts.slice(0, PAGE);

      return {
        waiting,
        alerts: page.map((a) => ({
          type: 'watch_alert',
          id: a.id,
          at: a.at,
          kind: a.kind,
          place: a.zone === 'campus' ? { kind: 'campus' } : { kind: 'circle', id: a.circle_id, name: a.circle_name },
          user: card(a, storage),
        })),
        nextBefore: hasMore ? page.at(-1).at.toISOString() : null,
      };
    },
  );
}
