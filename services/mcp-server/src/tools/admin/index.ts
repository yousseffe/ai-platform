import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpModule, RequestContext } from '../../types.js';
import { jsonResult, errorResult } from '../../result.js';
import { requireScope } from '../../auth/scope.js';

/** Extracts a readable error message from an unknown thrown value. */
function msg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * The `admin.*` capability group: platform-wide, read-only visibility into
 * users, billing/ledger, models, organizations, deployments, model
 * governance, and access/security audit data. Every tool requires the
 * `admin:read` scope, which the backend only ever issues to administrators
 * (`ADMIN_ONLY_SCOPES`) — so every caller here is guaranteed admin. All
 * endpoints are dedicated read-only MCP-facing routes (`admin-mcp/*`),
 * separate from the mutating `/admin/*` dashboard endpoints, so an MCP token
 * never gains write access to the platform.
 */
export function adminModule(): McpModule {
  return {
    register(server: McpServer, ctx: RequestContext): void {
      if (!ctx.identity.mcpScopes?.includes('admin:read')) return;

      server.registerTool(
        'admin_get_platform_stats',
        {
          title: 'Get platform stats',
          description:
            'Platform-wide KPI snapshot: total users, models, organizations, and the platform revenue wallet balance.',
          inputSchema: {},
        },
        async () => {
          const scopeError = requireScope(ctx, 'admin:read');
          if (scopeError) return errorResult(scopeError);
          try {
            return jsonResult(await ctx.backend.get('admin-mcp/stats'));
          } catch (err) {
            return errorResult(`Failed to get platform stats: ${msg(err)}`);
          }
        },
      );

      server.registerTool(
        'admin_list_transactions',
        {
          title: 'List platform transactions',
          description:
            'Paginated, filterable platform transaction ledger (credit top-ups, debits, platform revenue cuts).',
          inputSchema: {
            page: z.number().int().optional().describe('Page number (default 1)'),
            limit: z.number().int().optional().describe('Page size (default 20, max 100)'),
            scope: z
              .enum(['ALL', 'SYSTEM_REVENUE'])
              .optional()
              .describe("'SYSTEM_REVENUE' restricts to the platform's own wallets"),
            type: z.string().optional().describe('CREDIT or DEBIT'),
            startDate: z.string().optional().describe('ISO date range start'),
            endDate: z.string().optional().describe('ISO date range end'),
            search: z.string().optional().describe('Reference search term'),
          },
        },
        async ({ page, limit, scope, type, startDate, endDate, search }) => {
          const scopeError = requireScope(ctx, 'admin:read');
          if (scopeError) return errorResult(scopeError);
          try {
            const data = await ctx.backend.get('admin-mcp/transactions', {
              page,
              limit,
              scope,
              type,
              startDate,
              endDate,
              search,
            });
            return jsonResult(data);
          } catch (err) {
            return errorResult(`Failed to list transactions: ${msg(err)}`);
          }
        },
      );

      server.registerTool(
        'admin_list_users',
        {
          title: 'List platform users',
          description:
            'Lists every registered platform user with role flags and wallet balances.',
          inputSchema: {},
        },
        async () => {
          const scopeError = requireScope(ctx, 'admin:read');
          if (scopeError) return errorResult(scopeError);
          try {
            return jsonResult(await ctx.backend.get('admin-mcp/users'));
          } catch (err) {
            return errorResult(`Failed to list users: ${msg(err)}`);
          }
        },
      );

      server.registerTool(
        'admin_get_user',
        {
          title: 'Get platform user',
          description: "Retrieves a single user's profile and wallet balances.",
          inputSchema: {
            userId: z
              .string()
              .describe('Real user UUID obtained from admin_list_users — never a placeholder string.'),
          },
        },
        async ({ userId }) => {
          const scopeError = requireScope(ctx, 'admin:read');
          if (scopeError) return errorResult(scopeError);
          try {
            const data = await ctx.backend.get(
              `admin-mcp/users/${encodeURIComponent(userId)}`,
            );
            return jsonResult(data);
          } catch (err) {
            return errorResult(`Failed to get user: ${msg(err)}`);
          }
        },
      );

      server.registerTool(
        'admin_list_models',
        {
          title: 'List platform models',
          description:
            'Platform-wide model catalog: pricing, visibility, ownership, and rating summary for every model.',
          inputSchema: {},
        },
        async () => {
          const scopeError = requireScope(ctx, 'admin:read');
          if (scopeError) return errorResult(scopeError);
          try {
            return jsonResult(await ctx.backend.get('admin-mcp/models'));
          } catch (err) {
            return errorResult(`Failed to list models: ${msg(err)}`);
          }
        },
      );

      server.registerTool(
        'admin_get_platform_config',
        {
          title: 'Get platform config',
          description:
            "The platform's global pricing defaults, commission tiers, and organization creation fee.",
          inputSchema: {},
        },
        async () => {
          const scopeError = requireScope(ctx, 'admin:read');
          if (scopeError) return errorResult(scopeError);
          try {
            return jsonResult(await ctx.backend.get('admin-mcp/config'));
          } catch (err) {
            return errorResult(`Failed to get platform config: ${msg(err)}`);
          }
        },
      );

      server.registerTool(
        'admin_list_organizations',
        {
          title: 'List organizations',
          description:
            'Lists every organization on the platform with member and project counts.',
          inputSchema: {},
        },
        async () => {
          const scopeError = requireScope(ctx, 'admin:read');
          if (scopeError) return errorResult(scopeError);
          try {
            return jsonResult(await ctx.backend.get('admin-mcp/organizations'));
          } catch (err) {
            return errorResult(`Failed to list organizations: ${msg(err)}`);
          }
        },
      );

      server.registerTool(
        'admin_get_organization',
        {
          title: 'Get organization',
          description:
            "A single organization's members, projects, API keys, and wallet balances.",
          inputSchema: {
            organizationId: z
              .string()
              .describe(
                'Real organization UUID obtained from admin_list_organizations — never a placeholder string.',
              ),
          },
        },
        async ({ organizationId }) => {
          const scopeError = requireScope(ctx, 'admin:read');
          if (scopeError) return errorResult(scopeError);
          try {
            const data = await ctx.backend.get(
              `admin-mcp/organizations/${encodeURIComponent(organizationId)}`,
            );
            return jsonResult(data);
          } catch (err) {
            return errorResult(`Failed to get organization: ${msg(err)}`);
          }
        },
      );

      server.registerTool(
        'admin_list_deployments',
        {
          title: 'List all deployments',
          description:
            'Platform-wide deployment inventory across every model, regardless of owner.',
          inputSchema: {
            running: z.boolean().optional().describe('Restrict to RUNNING deployments'),
          },
        },
        async ({ running }) => {
          const scopeError = requireScope(ctx, 'admin:read');
          if (scopeError) return errorResult(scopeError);
          try {
            const data = await ctx.backend.get('admin-mcp/deployments', {
              running: running ? 'true' : undefined,
            });
            return jsonResult(data);
          } catch (err) {
            return errorResult(`Failed to list deployments: ${msg(err)}`);
          }
        },
      );

      server.registerTool(
        'admin_get_deployment',
        {
          title: 'Get deployment',
          description: "A single deployment's detail, regardless of owner.",
          inputSchema: {
            deploymentId: z
              .string()
              .describe(
                'Real deployment UUID obtained from admin_list_deployments — never a placeholder string.',
              ),
          },
        },
        async ({ deploymentId }) => {
          const scopeError = requireScope(ctx, 'admin:read');
          if (scopeError) return errorResult(scopeError);
          try {
            const data = await ctx.backend.get(
              `admin-mcp/deployments/${encodeURIComponent(deploymentId)}`,
            );
            return jsonResult(data);
          } catch (err) {
            return errorResult(`Failed to get deployment: ${msg(err)}`);
          }
        },
      );

      server.registerTool(
        'admin_get_model_versions',
        {
          title: 'Get model version history',
          description:
            "A model's version history and governance review-event timeline (submissions, approvals, declines, builds).",
          inputSchema: {
            modelId: z
              .string()
              .describe(
                'Real model UUID obtained from admin_list_models or integration_list_platform_models — never a placeholder string.',
              ),
          },
        },
        async ({ modelId }) => {
          const scopeError = requireScope(ctx, 'admin:read');
          if (scopeError) return errorResult(scopeError);
          try {
            const data = await ctx.backend.get(
              `admin-mcp/models/${encodeURIComponent(modelId)}/versions`,
            );
            return jsonResult(data);
          } catch (err) {
            return errorResult(`Failed to get model versions: ${msg(err)}`);
          }
        },
      );

      server.registerTool(
        'admin_get_model_reviews',
        {
          title: 'Get model reviews',
          description:
            "A model's individual consumer review records (rating, comment, reviewer), not just the aggregate score.",
          inputSchema: {
            modelId: z
              .string()
              .describe(
                'Real model UUID obtained from admin_list_models or integration_list_platform_models — never a placeholder string.',
              ),
          },
        },
        async ({ modelId }) => {
          const scopeError = requireScope(ctx, 'admin:read');
          if (scopeError) return errorResult(scopeError);
          try {
            const data = await ctx.backend.get(
              `admin-mcp/models/${encodeURIComponent(modelId)}/reviews`,
            );
            return jsonResult(data);
          } catch (err) {
            return errorResult(`Failed to get model reviews: ${msg(err)}`);
          }
        },
      );

      server.registerTool(
        'admin_list_api_keys',
        {
          title: 'List API keys',
          description:
            'Platform-wide personal and organization API key inventory (masked prefixes only, never the raw secret).',
          inputSchema: {},
        },
        async () => {
          const scopeError = requireScope(ctx, 'admin:read');
          if (scopeError) return errorResult(scopeError);
          try {
            return jsonResult(await ctx.backend.get('admin-mcp/api-keys'));
          } catch (err) {
            return errorResult(`Failed to list API keys: ${msg(err)}`);
          }
        },
      );

      server.registerTool(
        'admin_list_mcp_tokens',
        {
          title: 'List MCP tokens',
          description:
            'Every MCP access token issued platform-wide, across all users, with scopes and last-used timestamps.',
          inputSchema: {},
        },
        async () => {
          const scopeError = requireScope(ctx, 'admin:read');
          if (scopeError) return errorResult(scopeError);
          try {
            return jsonResult(await ctx.backend.get('admin-mcp/mcp-tokens'));
          } catch (err) {
            return errorResult(`Failed to list MCP tokens: ${msg(err)}`);
          }
        },
      );

      server.registerTool(
        'admin_get_audit_log',
        {
          title: 'Get platform audit log',
          description:
            'Filterable platform audit log (logins, workspace switches, and other tracked actions). Not visible anywhere else on the dashboard.',
          inputSchema: {
            userId: z.string().optional().describe('Restrict to a single actor'),
            action: z.string().optional().describe('Restrict to a single action category'),
            limit: z.number().int().optional().describe('Max records (default 100, max 500)'),
          },
        },
        async ({ userId, action, limit }) => {
          const scopeError = requireScope(ctx, 'admin:read');
          if (scopeError) return errorResult(scopeError);
          try {
            const data = await ctx.backend.get('admin-mcp/audit-log', {
              userId,
              action,
              limit,
            });
            return jsonResult(data);
          } catch (err) {
            return errorResult(`Failed to get audit log: ${msg(err)}`);
          }
        },
      );
    },
  };
}
