# OpenClaw Integration

1. Run MCP server in HTTP mode if OpenClaw prefers HTTP callbacks:
   ```bash
   AGENTBRIDGE_ENDPOINT=http://localhost:3030 MCP_MODE=http MCP_PORT=3035 agentbridge-mcp
   ```
2. Configure OpenClaw tool provider to call the MCP HTTP endpoint:
   - Schema endpoint: `http://localhost:3035/schema`
   - Invoke endpoint: `http://localhost:3035/invoke`
3. Map tools as provided by `/schema`.
