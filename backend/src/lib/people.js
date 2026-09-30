/** What anyone who can see a person gets: never their email or social links. */
export function card(row, storage) {
  return {
    id: row.id,
    name: row.name,
    avatarUrl: storage.publicUrl('avatars', row.avatar_path),
    university: row.university_short || row.university_name || null,
  };
}

/** The same card with the social links, for friends only. */
export function friendCard(row, storage) {
  return { ...card(row, storage), facebook: row.facebook || null, instagram: row.instagram || null };
}

export const CARD_COLUMNS = `p.id, p.name, p.avatar_path, p.facebook, p.instagram,
  u.short_name as university_short, u.name as university_name`;

export const pair = (a, b) => (a < b ? [a, b] : [b, a]);

export async function areFriends(db, a, b) {
  const [x, y] = pair(a, b);
  return Boolean(await db.one('select 1 as ok from friendships where user_a = $1 and user_b = $2', [x, y]));
}

export async function isBlockedEitherWay(db, a, b) {
  return Boolean(
    await db.one(
      `select 1 as ok from blocks where (blocker_id = $1 and blocked_id = $2) or (blocker_id = $2 and blocked_id = $1)`,
      [a, b],
    ),
  );
}

/** How `me` relates to `other`: friend, incoming, outgoing or none. */
export async function relationship(db, me, other) {
  if (await areFriends(db, me, other)) return 'friend';
  const req = await db.one(
    `select from_user_id from friend_requests
      where (from_user_id = $1 and to_user_id = $2) or (from_user_id = $2 and to_user_id = $1)`,
    [me, other],
  );
  if (!req) return 'none';
  return req.from_user_id === me ? 'outgoing' : 'incoming';
}

/** Records something an account did, for the admin timeline. Never location data. */
export async function logEvent(db, userId, kind, meta = {}) {
  await db.exec('insert into account_events (user_id, kind, meta) values ($1, $2, $3)', [userId, kind, meta]);
}
