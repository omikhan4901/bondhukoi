import { limit } from '../lib/limits.js';
import { body, text } from '../lib/schemas.js';

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

  /**
   * Checks an email (and invite code) before sign-up, so the app can say exactly what's
   * wrong: Supabase Auth only reports a generic error when the database refuses a sign-up.
   * Doesn't use up the invite, and never says whether an account already exists.
   */
  app.post(
    '/signup-check',
    {
      config: limit('public', settings),
      schema: { body: body({ email: { type: 'string', format: 'email', maxLength: 200 }, inviteCode: text(32) }, ['email']) },
    },
    async (req) => {
      const s = await settings.all();
      const uni = await db.one('select u.id, u.name from universities u where u.id = university_for_email($1)', [req.body.email]);
      if (!uni) return { ok: false, reason: 'domain', message: 'Use your university email address. If your university isn’t on BondhuKoi yet, it isn’t open for sign-ups.' };
      if (s.signups?.open === false) return { ok: false, reason: 'closed', message: 'Sign-ups are closed right now. Try again soon.' };
      if (s.signups?.invitesRequired) {
        const code = (req.body.inviteCode || '').trim().toUpperCase();
        const invite = code
          ? await db.one(
              `select 1 as ok from invite_codes where code = $1 and uses < max_uses
                 and (expires_at is null or expires_at > now()) and (university_id is null or university_id = $2)`,
              [code, uni.id],
            )
          : null;
        if (!invite) return { ok: false, reason: 'invite', message: code ? 'That invite code isn’t valid.' : 'You need an invite code to join right now.' };
      }
      return { ok: true, university: uni.name };
    },
  );
}
