import { FastifyInstance } from 'fastify';
import { sessionManager } from '../services/sessionManager.js';
import { actionService } from '../services/actionService.js';
import { snapshotService } from '../services/snapshotService.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { config } from '../config.js';
import { ActionKind } from '@agentbridge/shared';

export async function routes(app: FastifyInstance) {
  app.get('/health', async () => ({ status: 'ok' }));

  app.post('/session', async (request, reply) => {
    const body = request.body as { headless?: boolean; proxy?: string };
    const session = await sessionManager.createSession(body);
    return { sessionId: session.id, record: session.record };
  });

  app.get('/session', async () => ({ sessions: sessionManager.listSessions() }));

  app.delete('/session/:sessionId', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    await sessionManager.destroySession(sessionId);
    reply.code(204).send();
  });

  app.post('/navigate', async (request, reply) => {
    const body = request.body as { sessionId: string; url: string };
    const session = sessionManager.getSession(body.sessionId);
    if (!session) throw new NotFoundError('session not found');
    const result = await actionService.navigate(session, body);
    return result;
  });

  app.get('/snapshot/:sessionId', async (request) => {
    const { sessionId } = request.params as { sessionId: string };
    const session = sessionManager.getSession(sessionId);
    if (!session) throw new NotFoundError('session not found');
    return snapshotService.snapshot(session.page, session.id);
  });

  app.post('/action', async (request) => {
    const body = request.body as { sessionId: string; action: string; elementId?: string; value?: string };
    const session = sessionManager.getSession(body.sessionId);
    if (!session) throw new NotFoundError('session not found');
    const allowed: ActionKind[] = ['click', 'type', 'navigate', 'extract', 'screenshot'];
    if (!allowed.includes(body.action as ActionKind)) throw new BadRequestError('action not allowed');
    return actionService.perform(session, body as any);
  });

  app.get('/ws/:sessionId', { websocket: true }, (connection, req) => {
    const { sessionId } = req.params as { sessionId: string };
    const session = sessionManager.getSession(sessionId);
    if (!session) {
      connection.socket.send(JSON.stringify({ error: 'session not found' }));
      connection.socket.close();
      return;
    }

    const sendSnapshot = async () => {
      try {
        const { delta, snapshot } = await snapshotService.snapshot(session.page, session.id);
        connection.socket.send(JSON.stringify({ snapshot, delta }));
      } catch (err: any) {
        logger.error(err, 'ws snapshot error');
      }
    };

    const interval = setInterval(sendSnapshot, config.websocket.snapshotIntervalMs);
    sendSnapshot();

    const consoleListener = (msg: any) => connection.socket.send(JSON.stringify({ console: msg.text() }));
    session.page.on('console', consoleListener);

    connection.socket.on('close', () => {
      clearInterval(interval);
      session.page.off('console', consoleListener);
    });
  });
}
