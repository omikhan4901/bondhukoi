/** Push notification kinds and the preference that controls each one. */
export const NOTIFY_KINDS = {
  friend_request: 'friendRequests',
  friend_accepted: 'friendRequests',
  circle_invite: 'circleInvites',
  watch_request: 'watchRequests',
  watch_started: 'watchRequests',
  watch_alert: 'watchAlerts',
};

export const DEFAULT_NOTIFY = { friendRequests: true, circleInvites: true, watchRequests: true, watchAlerts: true };

/**
 * Sends one notification to each user who wants this kind. Never throws: a failed push
 * must not fail the request that caused it.
 */
export async function notify(ctx, userIds, { kind, title, body, data = {} }) {
  const ids = [...new Set(userIds)].filter(Boolean);
  if (!ids.length) return;
  try {
    const pref = NOTIFY_KINDS[kind];
    const rows = await ctx.db.many(
      `select t.token, p.notify
         from push_tokens t join profiles p on p.id = t.user_id
        where t.user_id = any($1) and p.status = 'active'`,
      [ids],
    );
    const messages = rows
      .filter((r) => ({ ...DEFAULT_NOTIFY, ...r.notify })[pref] !== false)
      .map((r) => ({ to: r.token, title, body, sound: 'default', data: { kind, ...data } }));
    await ctx.push.send(messages);
  } catch (err) {
    ctx.log.warn({ err: err.message, kind }, 'notify failed');
  }
}
