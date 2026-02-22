# Claude Code (MCP) Integration

1. Install the MCP server globally or via npx:
   ```bash
   npm install -g @agentbridge/mcp
   ```
2. Configure Claude Code MCP tools (settings → MCP):
   ```json
   {
     "command": "agentbridge-mcp",
     "env": {
       "AGENTBRIDGE_ENDPOINT": "http://localhost:3030",
       "MCP_MODE": "stdio"
     }
   }
   ```
3. Use Claude to call tools by name (navigate, snapshot, click, type, extract, screenshot, createSession, destroySession).
