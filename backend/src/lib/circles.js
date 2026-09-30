/**
 * Takes someone out of a circle and keeps the circle usable: if they were its last admin,
 * the longest-standing member becomes admin; if nobody is left, the circle is deleted.
 * Returns storage paths that should be removed.
 */
export async function leaveCircle(db, circleId, userId) {
  const removed = await db.one('delete from circle_members where circle_id = $1 and user_id = $2 returning role, status', [
    circleId,
    userId,
  ]);
  if (!removed) return [];

  const remaining = await db.many(
    `select user_id, role from circle_members where circle_id = $1 and status = 'active'
      order by joined_at nulls last, created_at`,
    [circleId],
  );
  if (!remaining.length) {
    const circle = await db.one('delete from circles where id = $1 returning snapshot_path', [circleId]);
    return circle?.snapshot_path ? [circle.snapshot_path] : [];
  }
  if (!remaining.some((m) => m.role === 'admin')) {
    await db.exec(`update circle_members set role = 'admin' where circle_id = $1 and user_id = $2`, [circleId, remaining[0].user_id]);
  }
  return [];
}

/** The caller's membership, or null. */
export async function membership(db, circleId, userId) {
  return db.one('select role, status, detection_enabled from circle_members where circle_id = $1 and user_id = $2', [
    circleId,
    userId,
  ]);
}
