/**
 * Rate limits for every route, keyed by the signed-in user (or the IP address before
 * sign-in). A whole campus shares a handful of IP addresses, so per-user keys matter.
 * Admins can override `max` per limit in Admin › Rate limits (settings key `limits`).
 */
export const LIMITS = {
  read: { max: 240, timeWindow: 60_000, label: 'Reading (per minute)' },
  write: { max: 60, timeWindow: 60_000, label: 'Changes (per minute)' },
  search: { max: 30, timeWindow: 60_000, label: 'Searches (per minute)' },
  presence: { max: 90, timeWindow: 3_600_000, label: 'Location checks (per hour)' },
  friendRequest: { max: 40, timeWindow: 86_400_000, label: 'Friend requests (per day)' },
  circleCreate: { max: 10, timeWindow: 86_400_000, label: 'New circles (per day)' },
  boundary: { max: 20, timeWindow: 86_400_000, label: 'Zone saves (per day)' },
  upload: { max: 10, timeWindow: 3_600_000, label: 'Photo uploads (per hour)' },
  report: { max: 10, timeWindow: 86_400_000, label: 'Reports (per day)' },
  feedback: { max: 10, timeWindow: 86_400_000, label: 'Feedback (per day)' },
  public: { max: 60, timeWindow: 60_000, label: 'Signed-out requests (per minute)' },
  admin: { max: 300, timeWindow: 60_000, label: 'Admin console (per minute)' },
};

/** Route config for a named limit; reads admin overrides from the settings cache. */
export function limit(name, settings) {
  const preset = LIMITS[name];
  if (!preset) throw new Error(`Unknown rate limit: ${name}`);
  return {
    rateLimit: {
      max: () => {
        const override = settings.peek().limits?.[name]?.max;
        return Number.isInteger(override) && override > 0 ? override : preset.max;
      },
      timeWindow: preset.timeWindow,
      keyGenerator: (req) => (req.user ? `u:${req.user.id}:${name}` : `ip:${req.ip}:${name}`),
    },
  };
}
