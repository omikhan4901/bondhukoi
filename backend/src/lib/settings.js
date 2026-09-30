/** Defaults for every admin setting, used when a row is missing. */
export const DEFAULT_SETTINGS = {
  signups: { open: true, invitesRequired: false },
  maintenance: { enabled: false, message: '' },
  banner: { text: '', tone: 'info' },
  minAppVersion: '1.0.0',
  features: { watch: true, feed: true, googleSignIn: false },
  limits: {},
};

const CACHE_MS = 15_000;

/**
 * Admin settings from `app_settings`, cached for 15 seconds so hot paths (maintenance
 * mode, rate limits) don't hit the database on every request.
 */
export function createSettings(db) {
  let cache = null;
  let loadedAt = 0;
  let loading = null;

  async function load() {
    const rows = await db.many('select key, value from app_settings');
    const values = structuredClone(DEFAULT_SETTINGS);
    for (const row of rows) values[row.key] = row.value;
    cache = values;
    loadedAt = Date.now();
    return values;
  }

  return {
    async all() {
      if (cache && Date.now() - loadedAt < CACHE_MS) return cache;
      loading ??= load().finally(() => {
        loading = null;
      });
      return loading;
    },
    /** The last loaded values without waiting (for synchronous callers). */
    peek() {
      return cache || DEFAULT_SETTINGS;
    },
    async set(key, value, adminId) {
      await db.exec(
        `insert into app_settings (key, value, updated_by, updated_at) values ($1, $2, $3, now())
         on conflict (key) do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = now()`,
        [key, JSON.stringify(value), adminId || null],
      );
      cache = null;
    },
    invalidate() {
      cache = null;
    },
  };
}
