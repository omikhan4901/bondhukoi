import { inQuietHours } from './time.js';

// A presence answer older than this is no longer shown as "on campus".
export const STALE_MS = 3 * 60 * 60 * 1000;

/** Columns every presence decision needs, from `profiles p` joined to `presence pr`. */
export const PRESENCE_COLUMNS = `
  p.status, p.sharing_enabled, p.share_campus, p.quiet_hours_enabled, p.quiet_start, p.quiet_end,
  pr.on_campus, pr.circle_ids, pr.checked_at`;

/** SQL fragment: true when either of $a / $b has blocked the other. */
export const blockedBetween = (a, b) =>
  `exists (select 1 from blocks bl where (bl.blocker_id = ${a} and bl.blocked_id = ${b}) or (bl.blocker_id = ${b} and bl.blocked_id = ${a}))`;

/**
 * What a viewer is allowed to know about someone's whereabouts. This is the single place
 * that decides it, so every screen follows the same rules:
 *
 * - Nothing when the person is suspended, has paused sharing, or is in quiet hours
 *   ("off": deliberately the same answer for all three, so friends can't tell which).
 * - Nothing fresh after 3 hours without an update ("unknown").
 * - "On campus" only if they share campus status.
 * - Circles only from `visibleCircles`: the circles the viewer shares with them where they
 *   left detection on. Callers pass that set; it never includes circles the viewer isn't in.
 *
 * Returns { state, onCampus, circleIds, updatedAt } with state one of
 * 'here' (on campus or in a visible circle), 'away', 'unknown' or 'off'.
 */
export function presenceFor(row, visibleCircles = new Set(), now = new Date()) {
  const off = { state: 'off', onCampus: false, circleIds: [], updatedAt: null };
  if (row.status !== 'active' || !row.sharing_enabled || inQuietHours(row, now)) return off;
  if (!row.checked_at || now - new Date(row.checked_at) > STALE_MS) {
    return { state: 'unknown', onCampus: false, circleIds: [], updatedAt: null };
  }
  const onCampus = Boolean(row.on_campus && row.share_campus);
  const circleIds = (row.circle_ids || []).filter((id) => visibleCircles.has(id));
  return {
    state: onCampus || circleIds.length ? 'here' : 'away',
    onCampus,
    circleIds,
    updatedAt: new Date(row.checked_at).toISOString(),
  };
}

/**
 * For each of `userIds`, the circles they share with `viewerId` where both are active
 * members and the other person has detection on. Map<userId, Map<circleId, name>>.
 */
export async function sharedDetectableCircles(db, viewerId, userIds) {
  const map = new Map();
  if (!userIds.length) return map;
  const rows = await db.many(
    `select them.user_id, c.id, c.name
       from circle_members me
       join circle_members them on them.circle_id = me.circle_id
       join circles c on c.id = me.circle_id
      where me.user_id = $1 and me.status = 'active'
        and them.user_id = any($2) and them.status = 'active' and them.detection_enabled`,
    [viewerId, userIds],
  );
  for (const r of rows) {
    if (!map.has(r.user_id)) map.set(r.user_id, new Map());
    map.get(r.user_id).set(r.id, r.name);
  }
  return map;
}

/** presenceFor plus circle names, for API responses. */
export function describePresence(row, circlesById = new Map(), now = new Date()) {
  const p = presenceFor(row, new Set(circlesById.keys()), now);
  return {
    state: p.state,
    onCampus: p.onCampus,
    circles: p.circleIds.map((id) => ({ id, name: circlesById.get(id) })),
    updatedAt: p.updatedAt,
  };
}
