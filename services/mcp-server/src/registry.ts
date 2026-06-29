import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpModule, RequestContext } from './types.js';
import { systemModule } from './tools/system/ping.js';
import { integrationModule } from './tools/integration/index.js';
import { observabilityModule } from './tools/observability/index.js';
import { securityModule } from './tools/security/index.js';

/**
 * The full set of capability modules the MCP server exposes. New tool/resource
 * groups (integration.*, observability.*, security.*) are added here as drop-in
 * modules — the registry composes them onto each per-request server.
 *
 * @returns The ordered list of {@link McpModule}s.
 */
export function modules(): McpModule[] {
  return [
    systemModule(),
    integrationModule(),
    observabilityModule(),
    securityModule(),
  ];
}

/**
 * Registers every capability module onto a per-request server instance.
 *
 * @param server - The MCP server for the current request.
 * @param ctx - The scoped request context.
 */
export function registerAll(server: McpServer, ctx: RequestContext): void {
  for (const module of modules()) {
    module.register(server, ctx);
  }
}
