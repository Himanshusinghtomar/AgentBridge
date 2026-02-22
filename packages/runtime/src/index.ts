import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import rateLimit from '@fastify/rate-limit';
import cors from '@fastify/cors';
import { config } from './config.js';
import { routes } from './routes/index.js';
import { logger } from './utils/logger.js';
import { sessionManager } from './services/sessionManager.js';
import { authenticateRequest, sanitizeInput } from './utils/security.js';

async function buildServer() {
  const app = Fastify({ logger });

  await app.register(rateLimit, config.rateLimit);
  await app.register(websocket);
  await app.register(cors, { origin: config.cors.origin, methods: config.cors.methods });

  app.addHook('preHandler', async (request, reply) => {
    authenticateRequest(request);
    if (request.body) {
      request.body = sanitizeInput(request.body);
    }
    if (request.query) {
      request.query = sanitizeInput(request.query);
    }
  });

  await app.register(routes);

  app.setErrorHandler((error, request, reply) => {
    const status = (error as any).status || 500;
    reply.status(status).send({ error: error.message || 'internal error' });
  });

  const close = async () => {
    logger.info('shutting down');
    await sessionManager.disposeAll();
    await app.close();
    process.exit(0);
  };
  process.on('SIGINT', close);
  process.on('SIGTERM', close);

  return app;
}

buildServer()
  .then(app => app.listen({ port: config.port, host: '0.0.0.0' }))
  .then(addr => logger.info(`AgentBridge listening on ${addr}`))
  .catch(err => {
    logger.error(err, 'failed to start server');
    process.exit(1);
  });
