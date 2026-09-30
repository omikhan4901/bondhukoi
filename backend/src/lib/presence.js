import { inQuietHours } from './time.js';
import { notify } from './notify.js';

// Readings less accurate than this don't change anyone's status.
export const MAX_ACCURACY_METERS = 300;

/**
 * Answers "is this person on campus, and in which of their circles?" for one reading,
 * stores only that answer, and records enter/exit events. The coordinates are used for
 * the two spatial queries below and then dropped: they are never written anywhere.
 */
export async function checkPresence(ctx, userId, { lat, lng, accuracy }, now = new Date()) {
  const result = await ctx.db.tx(async (db) => {
    await db.exec('insert into presence (user_id) values ($1) on conflict do nothing', [userId]);
    const before = await db.one('select on_campus, circle_ids from presence where user_id = $1 for update', [userId]);
    const profile = await db.one(
      `select name, university_id, sharing_enabled, share_campus, quiet_hours_enabled, quiet_start, quiet_end
         from profiles where id = $1`,
      [userId],
    );

    // Paused or quiet hours: forget the last answer and don't look at this one.
    if (!profile.sharing_enabled || inQuietHours(profile, now)) {
      await db.exec(`update presence set on_campus = false, circle_ids = '{}', checked_at = $2 where user_id = $1`, [userId, now]);
      return { status: profile.sharing_enabled ? 'quiet' : 'paused', onCampus: false, circleIds: [], transitions: [], profile };
    }

    if (accuracy != null && accuracy > MAX_ACCURACY_METERS) {
      return { status: 'inaccurate', onCampus: before.on_campus, circleIds: before.circle_ids, transitions: [], profile };
    }

    const point = 'ST_SetSRID(ST_MakePoint($2, $3), 4326)';
    const campus = profile.share_campus
      ? await db.one(
          `select coalesce(ST_Contains(boundary, ${point}), false) as inside from universities where id = $1`,
          [profile.university_id, lng, lat],
        )
      : null;
    const circles = await db.many(
      `select m.circle_id
         from circle_members m join circle_boundaries b on b.circle_id = m.circle_id
        where m.user_id = $1 and m.status = 'active' and m.detection_enabled
          and ST_Contains(b.boundary, ${point})`,
      [userId, lng, lat],
    );

    const onCampus = Boolean(campus?.inside);
    const circleIds = circles.map((c) => c.circle_id).sort();
    const transitions = [];
    if (onCampus !== before.on_campus) transitions.push({ zone: 'campus', circleId: null, kind: onCampus ? 'enter' : 'exit' });
    const was = new Set(before.circle_ids);
    const is = new Set(circleIds);
    for (const id of is) if (!was.has(id)) transitions.push({ zone: 'circle', circleId: id, kind: 'enter' });
    for (const id of was) if (!is.has(id)) transitions.push({ zone: 'circle', circleId: id, kind: 'exit' });

    await db.exec('update presence set on_campus = $2, circle_ids = $3, checked_at = $4 where user_id = $1', [
      userId,
      onCampus,
      circleIds,
      now,
    ]);
    for (const t of transitions) {
      await db.exec('insert into transitions (user_id, zone, circle_id, kind, at) values ($1, $2, $3, $4, $5)', [
        userId,
        t.zone,
        t.circleId,
        t.kind,
        now,
      ]);
    }
    return { status: 'ok', onCampus, circleIds, transitions, profile };
  });

  if (result.transitions.length) await alertWatchers(ctx, userId, result.profile.name, result.transitions);
  const { profile, transitions, ...response } = result;
  return { ...response, changes: transitions.length };
}

/**
 * Tells each accepted watcher about the changes their watch covers: campus for everyone,
 * circles only for "all" watches and only circles the watcher is in too.
 */
async function alertWatchers(ctx, userId, name, transitions) {
  const watchers = await ctx.db.many(
    `select w.watcher_id, w.scope,
            coalesce(array_agg(m.circle_id) filter (where m.circle_id is not null), '{}') as circle_ids
       from watches w
       left join circle_members m on m.user_id = w.watcher_id and m.status = 'active'
      where w.watched_id = $1 and w.status = 'active'
        and not exists (select 1 from blocks b where (b.blocker_id = w.watcher_id and b.blocked_id = $1)
                                               or (b.blocker_id = $1 and b.blocked_id = w.watcher_id))
      group by w.watcher_id, w.scope`,
    [userId],
  );
  if (!watchers.length) return;

  const circleIds = transitions.filter((t) => t.circleId).map((t) => t.circleId);
  const names = new Map(
    (circleIds.length ? await ctx.db.many('select id, name from circles where id = any($1)', [circleIds]) : []).map((c) => [c.id, c.name]),
  );

  for (const w of watchers) {
    const shared = new Set(w.circle_ids);
    const relevant = transitions.filter((t) => t.zone === 'campus' || (w.scope === 'all' && shared.has(t.circleId)));
    for (const t of relevant) {
      const place = t.zone === 'campus' ? 'campus' : names.get(t.circleId);
      const body =
        t.zone === 'campus'
          ? t.kind === 'enter' ? `${name} is on campus.` : `${name} left campus.`
          : t.kind === 'enter' ? `${name} is at ${place}.` : `${name} left ${place}.`;
      await notify(ctx, [w.watcher_id], {
        kind: 'watch_alert',
        title: t.kind === 'enter' ? `${name} arrived` : `${name} left`,
        body,
        data: { userId },
      });
    }
  }
}
