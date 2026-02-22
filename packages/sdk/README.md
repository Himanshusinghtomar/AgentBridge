# @agentbridge/sdk ![version](https://img.shields.io/badge/version-x.y.z-blue)

Typed, retriable Node client for AgentBridge runtime. ESM + CJS, tree-shakable.

## Install
```bash
npm install @agentbridge/sdk
```

## Usage
```ts
import { AgentBridge } from '@agentbridge/sdk';
const agent = new AgentBridge({ endpoint: 'http://localhost:3030', timeout: 10_000 });
const { sessionId } = await agent.createSession({ headless: true });
await agent.navigate(sessionId, 'https://example.com');
const snap = await agent.snapshot(sessionId);
await agent.click(sessionId, snap.snapshot.elements[0].id);
```

## Streaming
```ts
const unsubscribe = agent.subscribe(sessionId, ({ snapshot, delta, console }) => {
  // handle updates
});
```

## Errors
- `AgentBridgeError` (base)
- `SessionNotFoundError`
- `ActionFailedError`

## Publish
1. Update version via Changesets.
2. `npm run build`
3. `npm publish --access public`
