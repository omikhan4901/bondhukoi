import { HttpError, forbidden } from './errors.js';

const ACTIVE_TOUCH_MS = 10 * 60 * 1000;

/**
 * Hooks that sign the request in. `requireUser` runs on every route except the public
 * ones; `requireAdmin(role)` additionally needs an admin row and a two-factor session.
 */
export function createAuthHooks(ctx) {
  async function requireUser(req) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) throw new HttpError(401, 'signed_out', 'Please sign in.');

    let claims;
    try {
      claims = await ctx.verifyToken(token);
    } catch {
      throw new HttpError(401, 'signed_out', 'Your session has ended. Please sign in again.');
    }

    const profile = await ctx.db.one(
      `select id, name, university_id, status, sessions_revoked_at, last_active_at from profiles where id = $1`,
      [claims.userId],
    );
    if (!profile) throw new HttpError(401, 'signed_out', 'Please sign in.');
    if (profile.sessions_revoked_at && claims.issuedAt * 1000 < new Date(profile.sessions_revoked_at).getTime()) {
      throw new HttpError(401, 'signed_out', 'Your session has ended. Please sign in again.');
    }
    if (profile.status !== 'active') {
      throw forbidden('This account is suspended. Contact support if you think this is a mistake.', 'account_suspended');
    }

    req.user = {
      id: profile.id,
      name: profile.name,
      universityId: profile.university_id,
      aal: claims.aal,
    };

    if (!profile.last_active_at || Date.now() - new Date(profile.last_active_at).getTime() > ACTIVE_TOUCH_MS) {
      ctx.db.exec('update profiles set last_active_at = now() where id = $1', [profile.id]).catch(() => {});
    }
  }

  function requireAdmin(role = 'moderator') {
    return async function (req) {
      await requireUser(req);
      const admin = await ctx.db.one('select role from admins where user_id = $1', [req.user.id]);
      // Not an admin (or not a super-admin when one is needed): the generic answer.
      if (!admin || (role === 'super' && admin.role !== 'super')) throw forbidden();
      if (req.user.aal !== 'aal2') {
        throw forbidden('Turn on two-factor sign-in to use the admin console.', 'two_factor_required');
      }
      req.admin = { id: req.user.id, role: admin.role };
    };
  }

  return { requireUser, requireAdmin };
}
