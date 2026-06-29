import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpModule, RequestContext } from '../../types.js';
import { jsonResult } from '../../result.js';

/**
 * System/diagnostic tools. `system_ping` doubles as an auth + wiring check:
 * a successful call proves the caller's key resolved and the context engine is
 * live. It returns only the caller's scope — never any secret material.
 */
export function systemModule(): McpModule {
  return {
    register(server: McpServer, ctx: RequestContext): void {
      server.registerTool(
        'system_ping',
        {
          title: 'Ping',
          description:
            'Health and auth check. Returns the resolved caller scope (no secrets).',
          inputSchema: {},
        },
        async () =>
          jsonResult({
            ok: true,
            server: 'ai-platform-mcp-server',
            scope: ctx.identity.scope,
            keyType: ctx.identity.keyType,
            orgId: ctx.identity.orgId,
            projectId: ctx.identity.projectId,
            modelId: ctx.identity.modelId,
          }),
      );
    },
  };
}
