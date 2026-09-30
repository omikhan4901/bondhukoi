import { loadConfig } from './config.js';
import { createDb } from './db.js';
import { buildApp } from './app.js';
import { createTokenVerifier } from './adapters/tokens.js';
import { createSupabaseAdapters } from './adapters/supabase.js';
import { createExpoPush } from './adapters/push.js';
import { initSentry } from './adapters/sentry.js';

const config = loadConfig();
const sentry = initSentry(config.sentryDsn, config.production ? 'production' : 'development');
const db = createDb({ connectionString: config.databaseUrl, ssl: config.databaseSsl });
const { storage, authAdmin } = createSupabaseAdapters(config);

let push;
const app = await buildApp({
  config,
  db,
  verifyToken: createTokenVerifier(config),
  storage,
  authAdmin,
  push: { send: (messages) => push.send(messages) },
  sentry,
});
push = createExpoPush({ accessToken: config.expoAccessToken, log: app.log });

// Cloud Run sends SIGTERM before stopping an instance: finish requests, then close.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, async () => {
    app.log.info({ signal }, 'shutting down');
    await app.close();
    await db.close();
    process.exit(0);
  });
}

await app.listen({ port: config.port, host: '0.0.0.0' });
