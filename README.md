# AgentBridge Monorepo

Universal AI-native browser runtime with:
- Fastify + Playwright runtime (REST + WebSocket)
- Typed SDK for Node (ESM/CJS)
- MCP server (stdio or HTTP)
- CLI adapter
- Shared types + plugin hooks
- Docker + CI + Changesets

---

## Packages (workspaces)
- `@agentbridge/runtime` — service that runs Chromium, sessions, snapshots, deterministic actions, auth, plugins.  
  Path: `packages/runtime`
- `@agentbridge/sdk` — publishable typed client with retries + WS subscribe.  
  Path: `packages/sdk`
- `@agentbridge/mcp` — Model Context Protocol server wrapping the runtime via the SDK.  
  Path: `packages/mcp`
- `@agentbridge/cli` — thin CLI on top of the SDK.  
  Path: `packages/cli`
- `@agentbridge/shared` — types/interfaces + plugin contracts.  
  Path: `packages/shared`

---

## Install & build
```bash
npm install          # workspace install
npm run build        # builds all packages
```

---

## Run the runtime (dev)
```bash
cd packages/runtime
npm run dev          # uses tsx, hot reload friendly
# or production build + start
npm run build && npm start
```

Health: `curl http://localhost:3030/health`

### Key environment variables
- `PORT` (default 3030)
- `PLAYWRIGHT_HEADLESS` (true/false)
- `USER_DATA_DIR` (default `data/sessions`)
- `AGENTBRIDGE_API_KEY` (optional auth)
- `AGENTBRIDGE_JWT_SECRET` (optional JWT validation)
- `CORS_ORIGIN` (default `*`)
- `WS_SNAPSHOT_INTERVAL_MS` (default 1500)

### REST endpoints
- `POST /session` → `{ sessionId, record }`
- `GET /session` → list sessions
- `DELETE /session/:sessionId`
- `POST /navigate` `{ sessionId, url }`
- `GET /snapshot/:sessionId` → `{ snapshot, delta? }`
- `POST /action` `{ sessionId, action: click|type|navigate|extract|screenshot, elementId?, value? }`
- `GET /health`

### WebSocket
- `GET /ws/:sessionId` streams `{ snapshot, delta }` and `{ console }` events.

---

## SDK (@agentbridge/sdk)
Install (after publish): `npm install @agentbridge/sdk`

Usage:
```ts
import { AgentBridge } from '@agentbridge/sdk';

const agent = new AgentBridge({
  endpoint: 'http://localhost:3030',
  timeout: 10_000,
  apiKey: process.env.AGENTBRIDGE_API_KEY, // optional
});

const { sessionId } = await agent.createSession({ headless: true });
await agent.navigate(sessionId, 'https://example.com');
const snap = await agent.snapshot(sessionId);
await agent.click(sessionId, snap.snapshot.elements[0].id);
await agent.type(sessionId, snap.snapshot.elements[0].id, 'hello');

// streaming
const unsubscribe = agent.subscribe(sessionId, ({ snapshot, delta, console }) => {
  // handle updates
});
```

Features:
- ESM + CJS builds, d.ts included
- Retries with exponential backoff
- Errors: `AgentBridgeError`, `SessionNotFoundError`, `ActionFailedError`

---

## MCP server (@agentbridge/mcp)
Run (stdio, default):
```bash
AGENTBRIDGE_ENDPOINT=http://localhost:3030 agentbridge-mcp
```
HTTP mode:
```bash
MCP_MODE=http MCP_PORT=3035 AGENTBRIDGE_ENDPOINT=http://localhost:3030 agentbridge-mcp
```

Tools registered: `navigate`, `snapshot`, `click`, `type`, `extract`, `screenshot`, `createSession`, `destroySession`.  
Input is Zod-validated; schemas are exposed at `/schema` in HTTP mode.

---

## CLI (@agentbridge/cli)
```bash
node packages/cli/dist/index.js create-session
node packages/cli/dist/index.js navigate <sessionId> https://example.com
node packages/cli/dist/index.js snapshot <sessionId>
```
Options: `--endpoint`, `--api-key`, `--jwt`.

---

## Docker
```bash
cd docker
docker compose -f compose.yml up --build
```
Mounts `../data` for persistent session storage. Uses Playwright base image with Chromium.

---

## Security hardening
- API key or JWT auth (set `AGENTBRIDGE_API_KEY` / `AGENTBRIDGE_JWT_SECRET`)
- Rate limiting (`@fastify/rate-limit`)
- CORS config (`CORS_ORIGIN`)
- Input sanitization layer (strips scripts/control chars)
- Actions are whitelisted; no arbitrary JS execution

---

## Plugin interface
`AgentBridgePlugin` (from `@agentbridge/shared`):
```ts
interface AgentBridgePlugin {
  name: string;
  onSessionCreate?(ctx: { session: SessionRecord }): void | Promise<void>;
  onSnapshot?(payload: { sessionId: string; snapshot: SnapshotTree; delta?: SnapshotDelta }): void | Promise<void>;
  onAction?(payload: { sessionId: string; action: ActionPayload }): void | Promise<void>;
}
```
Register at runtime via `registerPlugin(plugin)` (see `packages/runtime/src/plugins.ts`).

---

## Versioning & release
- Changesets configured in `.changeset/config.json`
- CI workflow at `.github/workflows/release.yml` (build + test + npm publish dry-run)
- Publish manually: `npm publish --workspaces --access public`

---

## Integrations (MCP/tooling)
Examples in `docs/integrations/`:
- `cursor.md`
- `claude-code.md`
- `codex-cli.md`
- `openclaw.md`

Each shows how to register the MCP server (stdio or HTTP) and point it at the local runtime.

---

## Troubleshooting
- Workspace install errors: ensure npm ≥ 7 (you’re on npm 10) and rerun `npm install`.
- Playwright deps on Linux: use the provided Dockerfile or install system libs (`libnss3`, `libx11-xcb1`, `libgbm1`, fonts, etc.).
- Port already in use: change `PORT` or stop the existing process.
