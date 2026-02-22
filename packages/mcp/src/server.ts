import Fastify from 'fastify';
import pino from 'pino';
import { z } from 'zod';
import AgentBridge from '@agentbridge/sdk';
import { SnapshotResult } from '@agentbridge/shared';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const endpoint = process.env.AGENTBRIDGE_ENDPOINT || 'http://localhost:3030';
const apiKey = process.env.AGENTBRIDGE_API_KEY;
const jwt = process.env.AGENTBRIDGE_JWT;
const mode = process.env.MCP_MODE || 'stdio';

const client = new AgentBridge({ endpoint, apiKey, jwt });

const schemas = {
  navigate: z.object({ sessionId: z.string(), url: z.string().url() }),
  snapshot: z.object({ sessionId: z.string() }),
  click: z.object({ sessionId: z.string(), elementId: z.string() }),
  type: z.object({ sessionId: z.string(), elementId: z.string(), value: z.string() }),
  extract: z.object({ sessionId: z.string() }),
  screenshot: z.object({ sessionId: z.string() }),
  createSession: z.object({ headless: z.boolean().optional(), proxy: z.string().optional() }),
  destroySession: z.object({ sessionId: z.string() })
};

type ToolName = keyof typeof schemas;

const toolHandlers: Record<ToolName, (input: any) => Promise<any>> = {
  async navigate(input) { return client.navigate(input.sessionId, input.url); },
  async snapshot(input) { return client.snapshot(input.sessionId); },
  async click(input) { return client.click(input.sessionId, input.elementId); },
  async type(input) { return client.type(input.sessionId, input.elementId, input.value); },
  async extract(input) { return client.extract(input.sessionId); },
  async screenshot(input) { return client.screenshot(input.sessionId); },
  async createSession(input) { return client.createSession(input); },
  async destroySession(input) { return client.destroySession(input.sessionId); }
};

const toolSchemaDocs = (name: ToolName) => ({
  name,
  description: toolDescriptions[name],
  input_schema: toolInputSchemas[name]
});

const toolInputSchemas: Record<ToolName, any> = {
  navigate: {
    type: 'object',
    properties: { sessionId: { type: 'string' }, url: { type: 'string' } },
    required: ['sessionId', 'url']
  },
  snapshot: {
    type: 'object',
    properties: { sessionId: { type: 'string' } },
    required: ['sessionId']
  },
  click: {
    type: 'object',
    properties: { sessionId: { type: 'string' }, elementId: { type: 'string' } },
    required: ['sessionId', 'elementId']
  },
  type: {
    type: 'object',
    properties: { sessionId: { type: 'string' }, elementId: { type: 'string' }, value: { type: 'string' } },
    required: ['sessionId', 'elementId', 'value']
  },
  extract: {
    type: 'object',
    properties: { sessionId: { type: 'string' } },
    required: ['sessionId']
  },
  screenshot: {
    type: 'object',
    properties: { sessionId: { type: 'string' } },
    required: ['sessionId']
  },
  createSession: {
    type: 'object',
    properties: { headless: { type: 'boolean' }, proxy: { type: 'string' } }
  },
  destroySession: {
    type: 'object',
    properties: { sessionId: { type: 'string' } },
    required: ['sessionId']
  }
};

const toolDescriptions: Record<ToolName, string> = {
  navigate: 'Navigate browser session to a URL',
  snapshot: 'Get DOM snapshot and delta for a session',
  click: 'Click an element by stable id',
  type: 'Type into an element by stable id',
  extract: 'Return current snapshot without changes',
  screenshot: 'Capture a full-page screenshot',
  createSession: 'Create a new browser session',
  destroySession: 'Destroy an existing browser session'
};

async function invoke(tool: ToolName, payload: any) {
  const schema = schemas[tool];
  const parsed = schema.parse(payload);
  return toolHandlers[tool](parsed);
}

async function runHttp() {
  const app = Fastify({ logger });

  app.get('/schema', async () => ({
    tools: (Object.keys(schemas) as ToolName[]).map(toolSchemaDocs)
  }));

  app.post('/invoke', async (request, reply) => {
    const body = request.body as { tool: ToolName; input: any };
    if (!body?.tool || !(body.tool in schemas)) {
      reply.code(400).send({ error: 'unknown tool' });
      return;
    }
    try {
      const result = await invoke(body.tool, body.input);
      return { result };
    } catch (err: any) {
      logger.error(err);
      reply.code(400).send({ error: err.message });
    }
  });

  const port = Number(process.env.MCP_PORT || 3035);
  await app.listen({ port, host: '0.0.0.0' });
  logger.info({ port }, 'MCP HTTP server listening');
}

async function runStdio() {
  logger.info('MCP stdio mode started');
  const stdin = process.stdin.setEncoding('utf8');
  stdin.on('data', async (chunk) => {
    const lines = chunk.toString().trim().split('\n');
    for (const line of lines) {
      try {
        const req = JSON.parse(line);
        const { tool, input } = req as { tool: ToolName; input: any };
        if (!tool || !(tool in schemas)) {
          process.stdout.write(JSON.stringify({ error: 'unknown tool' }) + '\n');
          continue;
        }
        const result = await invoke(tool, input);
        process.stdout.write(JSON.stringify({ result }) + '\n');
      } catch (err: any) {
        process.stdout.write(JSON.stringify({ error: err.message }) + '\n');
      }
    }
  });
}

if (mode === 'http') {
  runHttp().catch(err => { logger.error(err); process.exit(1); });
} else {
  runStdio().catch(err => { logger.error(err); process.exit(1); });
}
