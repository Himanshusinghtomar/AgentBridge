# Cursor Integration (MCP)

1. Run the MCP server:
   ```bash
   AGENTBRIDGE_ENDPOINT=http://localhost:3030 MCP_MODE=http agentbridge-mcp
   ```
2. In Cursor settings → MCP / Tools, add:
   ```json
   {
     "name": "agentbridge",
     "command": "agentbridge-mcp",
     "env": {
       "AGENTBRIDGE_ENDPOINT": "http://localhost:3030",
       "MCP_MODE": "stdio"
     }
   }
   ```
3. Tools exposed: navigate, snapshot, click, type, extract, screenshot, createSession, destroySession.
