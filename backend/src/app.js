import crypto from 'node:crypto';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { createAuthHooks } from './lib/auth.js';
import { createSettings } from './lib/settings.js';
import { HttpError } from './lib/errors.js';
import configRoutes from './routes/config.js';
import meRoutes from './routes/me.js';
import userRoutes from './routes/users.js';
import friendRoutes from './routes/friends.js';
import watchRoutes from './routes/watches.js';
import safetyRoutes from './routes/safety.js';
import circleRoutes from './routes/circles.js';
import presenceRoutes from './routes/presence.js';
import notificationRoutes from './routes/notifications.js';
import adminRoutes from './routes/admin.js';
import internalRoutes from './routes/internal.js';

/**
 * Builds the API. Everything it talks to (database, token check, storage, push, Supabase
 * Auth admin) is passed in, so tests run the real routes against a test database and fakes.
 */
export async function buildApp({ config, db, verifyToken, storage, push, authAdmin, sentry = null, logger = true }) {
  const app = Fastify({
    logger:
      logger === true
        ? {
            level: config.logLevel,
            redact: ['req.headers.authorization', 'req.headers.cookie'],
          }
        : logger,
    trustProxy: config.trustProxy,
    bodyLimit: 256 * 1024,
    genReqId: () => crypto.randomUUID(),
    ajv: { customOptions: { removeAdditional: false, coerceTypes: 'array', allErrors: false } },
  });

  const settings = createSettings(db);
  const ctx = { config, db, verifyToken, storage, push, authAdmin, settings, log: app.log };
  const auth = createAuthHooks(ctx);
  ctx.auth = auth;
  app.decorate('ctx', ctx);
  app.decorate('routeList', []);
  app.addHook('onRoute', (route) => {
    const methods = [].concat(route.method).filter((m) => m !== 'HEAD');
    for (const method of methods) app.routeList.push({ method, url: route.url });
  });
  app.decorateRequest('user', null);
  app.decorateRequest('admin', null);

  await app.register(helmet, { global: true });
  await app.register(cors, {
    origin: config.corsOrigins.length ? config.corsOrigins : false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });
  await app.register(rateLimit, {
    global: false,
    hook: 'preHandler', // after sign-in, so limits are per user
    errorResponseBuilder: (req, context) => ({
      statusCode: 429,
      code: 'rate_limited',
      error: `Too many requests. Try again in ${Math.ceil(context.ttl / 1000)} seconds.`,
    }),
  });

  app.addHook('onRequest', async (req, reply) => {
    reply.header('x-request-id', req.id);
  });

  // Maintenance mode: the app can read but not change anything (admins still can).
  app.addHook('preHandler', async (req) => {
    if (req.method === 'GET' || req.url.startsWith('/api/admin') || req.url === '/health') return;
    const { maintenance } = await settings.all();
    if (maintenance?.enabled) {
      throw new HttpError(503, 'maintenance', maintenance.message || 'BondhuKoi is being updated. Try again in a few minutes.');
    }
  });

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof HttpError) {
      return reply.status(err.statusCode).send({ statusCode: err.statusCode, code: err.code, error: err.message });
    }
    if (err.validation) {
      return reply.status(400).send({ statusCode: 400, code: 'invalid_request', error: 'Some of the details sent are not valid.' });
    }
    if (err.statusCode === 429) return reply.status(429).send(err);
    if (err.statusCode && err.statusCode < 500) {
      return reply.status(err.statusCode).send({ statusCode: err.statusCode, code: 'bad_request', error: 'That request could not be read.' });
    }
    req.log.error({ err }, 'request failed');
    sentry?.captureException(err, { tags: { route: req.routeOptions?.url, method: req.method } });
    return reply.status(500).send({ statusCode: 500, code: 'server_error', error: 'Something went wrong. Please try again.', requestId: req.id });
  });

  app.setNotFoundHandler((req, reply) => {
    reply.status(404).send({ statusCode: 404, code: 'not_found', error: 'Not found.' });
  });

  app.get('/health', async () => {
    await db.one('select 1');
    return { status: 'ok' };
  });

  await app.register(configRoutes, { prefix: '/api' });
  await app.register(meRoutes, { prefix: '/api/me' });
  await app.register(userRoutes, { prefix: '/api/users' });
  await app.register(friendRoutes, { prefix: '/api/friends' });
  await app.register(watchRoutes, { prefix: '/api/watches' });
  await app.register(safetyRoutes, { prefix: '/api' });
  await app.register(circleRoutes, { prefix: '/api/circles' });
  await app.register(presenceRoutes, { prefix: '/api/presence' });
  await app.register(notificationRoutes, { prefix: '/api/notifications' });
  await app.register(adminRoutes, { prefix: '/api/admin' });
  await app.register(internalRoutes, { prefix: '/api/internal' });

  return app;
}
