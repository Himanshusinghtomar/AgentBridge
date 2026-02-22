# Codex CLI Integration

1. Ensure runtime is running (Docker or `npm start` in packages/runtime after build).
2. Add MCP server to Codex CLI config:
   ```yaml
   mcp_servers:
     agentbridge:
       command: agentbridge-mcp
       env:
         AGENTBRIDGE_ENDPOINT: http://localhost:3030
         MCP_MODE: stdio
   ```
3. Reload Codex CLI. Tools will appear under the `agentbridge` namespace.
