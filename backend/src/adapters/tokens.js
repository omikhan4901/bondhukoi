import { createRemoteJWKSet, jwtVerify } from 'jose';

/**
 * Verifies Supabase Auth access tokens. Uses the legacy HS256 secret when one is set,
 * otherwise the project's published signing keys (JWKS). The algorithm list is pinned so a
 * token can't pick its own.
 */
export function createTokenVerifier({ supabaseUrl, jwtSecret }) {
  const issuer = `${supabaseUrl.replace(/\/$/, '')}/auth/v1`;
  const key = jwtSecret
    ? new TextEncoder().encode(jwtSecret)
    : createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
  const algorithms = jwtSecret ? ['HS256'] : ['ES256', 'RS256'];

  return async function verify(token) {
    const { payload } = await jwtVerify(token, key, {
      algorithms,
      audience: 'authenticated',
      issuer,
      clockTolerance: 30,
    });
    if (typeof payload.sub !== 'string') throw new Error('Token has no subject');
    return {
      userId: payload.sub,
      email: payload.email || null,
      // "aal2" means the session passed two-factor; required for admins.
      aal: payload.aal || 'aal1',
      sessionId: payload.session_id || null,
      issuedAt: typeof payload.iat === 'number' ? payload.iat : 0,
    };
  };
}
