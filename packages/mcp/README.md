# @agentbridge/mcp

Model Context Protocol server exposing AgentBridge tools.

## Modes
- stdio (default): `AGENTBRIDGE_ENDPOINT=http://localhost:3030 agentbridge-mcp`
- http: `MCP_MODE=http MCP_PORT=3035 agentbridge-mcp`

## Tools
- navigate, snapshot, click, type, extract, screenshot, createSession, destroySession

## Schema example
```json
{
  "name": "navigate",
  "description": "Navigate browser session to a URL",
  "input_schema": {
    "type": "object",
    "properties": {
      "sessionId": {"type": "string"},
      "url": {"type": "string"}
    },
    "required": ["sessionId", "url"]
  }
}
```

## Env
- `AGENTBRIDGE_ENDPOINT` (runtime URL)
- `AGENTBRIDGE_API_KEY` / `AGENTBRIDGE_JWT` (optional auth pass-through)
- `MCP_MODE` (`stdio`|`http`)
- `MCP_PORT` (http mode)
