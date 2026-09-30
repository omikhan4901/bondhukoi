import { limit } from '../lib/limits.js';
import { idParams, friendCode } from '../lib/schemas.js';
import { notFound } from '../lib/errors.js';
import { card, friendCard, CARD_COLUMNS, relationship } from '../lib/people.js';
import { blockedBetween } from '../lib/visibility.js';

export default async function userRoutes(app) {
  const { db, settings, storage } = app.ctx;
  const { requireUser } = app.ctx.auth;
  app.addHook('onRequest', requireUser);

  /**
   * Finds people at your own university by name, or anyone by exact friend code.
   * Never searches or returns email addresses. Blocked people (either way) never appear.
   */
  app.get(
    '/search',
    {
      config: limit('search', settings),
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          required: ['q'],
          properties: { q: { type: 'string', minLength: 2, maxLength: 60 } },
        },
      },
    },
    async (req) => {
      const me = req.user.id;
      const q = req.query.q.trim();
      const code = /^[A-HJ-NP-Z2-9]{8}$/i.test(q) ? q.toUpperCase() : null;
      // Escape LIKE wildcards so the text is matched literally.
      const pattern = `%${q.toLowerCase().replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
      const rows = await db.many(
        `select ${CARD_COLUMNS}
           from profiles p join universities u on u.id = p.university_id
          where p.id <> $1 and p.status = 'active'
            and not ${blockedBetween('$1', 'p.id')}
            and ((p.university_id = $2 and lower(p.name) like $3) or p.friend_code = $4)
          order by (p.friend_code = $4) desc nulls last, p.name
          limit 20`,
        [me, req.user.universityId, pattern, code],
      );
      const results = [];
      for (const r of rows) results.push({ ...card(r, storage), relationship: await relationship(db, me, r.id) });
      return { results };
    },
  );

  app.get(
    '/by-code/:code',
    { config: limit('search', settings), schema: { params: { type: 'object', additionalProperties: false, required: ['code'], properties: { code: friendCode } } } },
    async (req) => {
      const row = await db.one(
        `select ${CARD_COLUMNS} from profiles p join universities u on u.id = p.university_id
          where p.friend_code = $2 and p.id <> $1 and p.status = 'active' and not ${blockedBetween('$1', 'p.id')}`,
        [req.user.id, req.params.code.toUpperCase()],
      );
      if (!row) throw notFound('No one has that friend code.');
      return { user: { ...card(row, storage), relationship: await relationship(db, req.user.id, row.id) } };
    },
  );

  /** A person's card, only if you already have something to do with them. */
  app.get('/:userId', { config: limit('read', settings), schema: { params: idParams('userId') } }, async (req) => {
    const me = req.user.id;
    const id = req.params.userId;
    const row = await db.one(
      `select ${CARD_COLUMNS} from profiles p join universities u on u.id = p.university_id
        where p.id = $2 and p.status = 'active' and not ${blockedBetween('$1', 'p.id')}
          and (
            p.id = $1
            or exists (select 1 from friendships f where (f.user_a = $1 and f.user_b = p.id) or (f.user_b = $1 and f.user_a = p.id))
            or exists (select 1 from friend_requests r where (r.from_user_id = $1 and r.to_user_id = p.id) or (r.to_user_id = $1 and r.from_user_id = p.id))
            or exists (select 1 from circle_members a join circle_members b on a.circle_id = b.circle_id
                        where a.user_id = $1 and b.user_id = p.id and a.status = 'active')
          )`,
      [me, id],
    );
    if (!row) throw notFound();
    const rel = id === me ? 'self' : await relationship(db, me, id);
    return { user: { ...(rel === 'friend' || rel === 'self' ? friendCard(row, storage) : card(row, storage)), relationship: rel } };
  });
}
