import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyCors from '@fastify/cors';
import fastifyWebsocket from '@fastify/websocket';
import fastifyRateLimit from '@fastify/rate-limit';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import circleRoutes from './routes/circles.js';
import friendRoutes from './routes/friends.js';
import locationRoutes from './routes/locations.js';
import { pruneSmallCircles } from './db/database.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fastify = Fastify({
  logger: process.env.NODE_ENV === 'production' ? true : {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        levelFirst: true,
        singleLine: true,
      },
    },
  },
});

// Register plugins
fastify.register(fastifyJwt, {
  secret: process.env.JWT_SECRET || 'your_secret_key',
});

fastify.register(fastifyCors, {
  origin: process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? false : '*'),
});

fastify.register(fastifyWebsocket);

fastify.register(fastifyRateLimit, {
  global: false, // only apply to routes that opt-in via config.rateLimit
  max: 100,
  timeWindow: '1 minute',
});

// Register JSON parser explicitly for Fastify v5
fastify.register(async (instance) => {
  instance.addContentTypeParser('application/json', async (request, payload) => {
    let body = '';
    for await (const chunk of payload) {
      body += chunk;
    }
    try {
      return JSON.parse(body);
    } catch (err) {
      throw new Error('Invalid JSON in request body');
    }
  });
});

// Health check
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});


// Request logging middleware
fastify.addHook('preHandler', async (request, reply) => {
  fastify.log.info(`${request.method} ${request.url}`, {
    contentType: request.headers['content-type'],
    body: request.body,
  });
});

// API version
fastify.get('/api', async (request, reply) => {
  return {
    name: 'BondhuKoi API',
    version: '1.0.0',
    status: 'running',
  };
});

// Register routes
fastify.register(authRoutes, { prefix: '/api/auth' });
fastify.register(userRoutes, { prefix: '/api/users' });
fastify.register(circleRoutes, { prefix: '/api/circles' });
fastify.register(friendRoutes, { prefix: '/api/friends' });
fastify.register(locationRoutes, { prefix: '/api/locations' });

// Error handler
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);
  reply.status(error.statusCode || 500).send({
    error: error.message || 'Internal server error',
    statusCode: error.statusCode || 500,
  });
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' });
    console.log(`\n🚀 BondhuKoi Backend running on http://localhost:${process.env.PORT || 3000}\n`);

    // Periodical pruning of small circles (every hour)
    setInterval(async () => {
      try {
        const deleted = await pruneSmallCircles();
        if (deleted && deleted.length > 0) {
          console.log(`[Lifecycle] Pruned ${deleted.length} small circles:`, deleted.map(d => d.deleted_id));
        }
      } catch (err) {
        console.error('[Lifecycle] Pruning failed:', err.message);
      }
    }, 60 * 60 * 1000);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}; 

start();
