import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RequestContext } from './types.js';
import { registerAll } from './registry.js';

/**
 * Builds a per-request MCP server with all capability modules registered and
 * the caller's scoped context baked into every handler.
 *
 * The server is stateless and disposable: one instance per HTTP request.
 *
 * @param ctx - The scoped request context (identity + context-engine clients).
 * @returns A ready-to-connect {@link McpServer}.
 */
export function createServer(ctx: RequestContext): McpServer {
  const server = new McpServer({
    name: 'ai-platform-mcp-server',
    version: '0.1.0',
  });
  registerAll(server, ctx);
  return server;
}
