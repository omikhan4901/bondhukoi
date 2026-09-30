import 'dotenv/config';

/**
 * Reads and checks the environment once. The server refuses to start with a missing or
 * weak secret instead of falling back to a guessable default.
 */
export function loadConfig(env = process.env) {
  const production = env.NODE_ENV === 'production';
  const problems = [];

  const required = (name) => {
    const value = env[name];
    if (!value) problems.push(`${name} is required`);
    return value;
  };

  const config = {
    production,
    port: Number(env.PORT || 3000),
    databaseUrl: required('DATABASE_URL'),
    databaseSsl: env.DATABASE_SSL === 'false' ? false : production,
    supabaseUrl: required('SUPABASE_URL'),
    supabaseServiceKey: required('SUPABASE_SERVICE_ROLE_KEY'),
    // Legacy HS256 secret. When empty, tokens are checked against the project's JWKS.
    jwtSecret: env.SUPABASE_JWT_SECRET || '',
    corsOrigins: (env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
    logLevel: env.LOG_LEVEL || (production ? 'info' : 'debug'),
    trustProxy: env.TRUST_PROXY !== 'false',
    expoAccessToken: env.EXPO_ACCESS_TOKEN || '',
    sentryDsn: env.SENTRY_DSN || '',
    // Daily admin alert emails (optional): see routes/internal.js.
    alertsSecret: env.ALERTS_SECRET || '',
    resendApiKey: env.RESEND_API_KEY || '',
    alertEmail: env.ALERT_EMAIL || '',
    alertFrom: env.ALERT_FROM || '',
  };

  if (config.jwtSecret && config.jwtSecret.length < 32) {
    problems.push('SUPABASE_JWT_SECRET must be at least 32 characters');
  }

  if (problems.length) {
    throw new Error(`Invalid configuration:\n  - ${problems.join('\n  - ')}`);
  }
  return config;
}
