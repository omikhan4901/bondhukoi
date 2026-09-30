import { limit } from '../lib/limits.js';

/** Signed-out app configuration: maintenance, banner, minimum version and switches. */
export default async function configRoutes(app) {
  const { settings, db } = app.ctx;

  app.get('/config', { config: limit('public', settings) }, async () => {
    const s = await settings.all();
    return {
      maintenance: { enabled: Boolean(s.maintenance?.enabled), message: s.maintenance?.message || '' },
      banner: s.banner?.text ? s.banner : null,
      minAppVersion: s.minAppVersion,
      features: s.features,
      signupsOpen: s.signups?.open !== false,
      invitesRequired: Boolean(s.signups?.invitesRequired),
    };
  });

  // Universities students can sign up with (names and domains only, for the sign-up screen).
  app.get('/universities', { config: limit('public', settings) }, async () => {
    const rows = await db.many(
      'select id, name, short_name, email_domains from universities where is_active order by name',
    );
    return {
      universities: rows.map((u) => ({ id: u.id, name: u.name, shortName: u.short_name, emailDomains: u.email_domains })),
    };
  });
}
