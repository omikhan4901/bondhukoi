import crypto from 'node:crypto';
import { forbidden } from '../lib/errors.js';
import { limit } from '../lib/limits.js';

const FREE_DB_BYTES = 500 * 1024 * 1024;

/** Things an admin should hear about today. Pure data, so it can be tested. */
export async function collectAlerts(db) {
  const alerts = [];
  const urgent = await db.one(
    `select count(*) as n from reports where status <> 'closed' and reason in ('stalking', 'harassment') and created_at < now() - interval '1 day'`,
  );
  if (urgent.n) alerts.push(`${urgent.n} stalking or harassment report(s) waiting more than a day.`);
  const waiting = await db.one(`select count(*) as n from reports where status = 'new' and created_at < now() - interval '1 day'`);
  if (waiting.n) alerts.push(`${waiting.n} report(s) not looked at for more than a day.`);
  const burst = await db.one(`select count(*) as n from profiles where created_at > now() - interval '1 hour'`);
  if (burst.n >= 50) alerts.push(`${burst.n} sign-ups in the last hour. Check Admin → Sign-ups for anything odd.`);
  const size = await db.one('select pg_database_size(current_database()) as bytes');
  if (size.bytes > FREE_DB_BYTES * 0.7) alerts.push(`The database is at ${Math.round((size.bytes / FREE_DB_BYTES) * 100)}% of the free 500 MB.`);
  const mau = await db.one(`select count(*) as n from profiles where last_active_at > now() - interval '30 days'`);
  if (mau.n > 35_000) alerts.push(`${mau.n} monthly active students: 70% of Supabase's free 50,000.`);
  const feedback = await db.one(`select count(*) as n from feedback where status = 'new'`);
  if (feedback.n >= 10) alerts.push(`${feedback.n} feedback messages waiting.`);
  return alerts;
}

/**
 * Called once a day by the keep-alive workflow with a shared secret. Emails the admins
 * (through Resend's free tier) only when something needs attention.
 */
export default async function internalRoutes(app) {
  const { db, config, settings } = app.ctx;

  app.post('/alerts', { logLevel: 'warn', config: limit('public', settings) }, async (req) => {
    const given = String(req.headers['x-alerts-secret'] || '');
    const expected = config.alertsSecret || '';
    const ok = expected.length >= 32 && given.length === expected.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
    if (!ok) throw forbidden();

    const alerts = await collectAlerts(db);
    if (!alerts.length || !config.resendApiKey || !config.alertEmail) return { alerts, emailed: false };
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${config.resendApiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: config.alertFrom || 'BondhuKoi <alerts@resend.dev>',
        to: config.alertEmail.split(',').map((e) => e.trim()),
        subject: `BondhuKoi: ${alerts.length} thing(s) to check`,
        text: `${alerts.map((a) => `• ${a}`).join('\n')}\n\nOpen the admin console to look into them.`,
      }),
      signal: AbortSignal.timeout(8000),
    });
    return { alerts, emailed: res.ok };
  });
}
