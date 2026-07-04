import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpModule, RequestContext } from '../../types.js';
import { jsonResult, errorResult } from '../../result.js';
import { requireScope } from '../../auth/scope.js';

interface AlertRecord {
  alertName?: string;
  labels?: Record<string, string>;
}

/** Extracts a readable error message from an unknown thrown value. */
function msg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * The `security.*` capability group: deterministic fraud/abuse findings. The MCP
 * surfaces risk scores, threat classes, evidence, and recommendations produced by
 * the platform's rule + statistical engine. It performs no enforcement and runs
 * no model.
 */
export function securityModule(): McpModule {
  return {
    register(server: McpServer, ctx: RequestContext): void {
      if (ctx.identity.mcpScopes?.includes('security:read')) {
        server.registerTool(
          'security_get_risk_report',
          {
            title: 'Get model risk report',
            description:
              'Return the deterministic fraud/abuse risk report for any model on the platform: current risk score, threat class, recent findings (rules + evidence), recommendations, the traffic baseline, and the model reviews/ratings summary. Requires admin scope.',
            inputSchema: {
              modelId: z
                .string()
                .describe(
                  'Real model UUID obtained from admin_list_models or integration_list_platform_models — never a placeholder string.',
                ),
            },
          },
          async ({ modelId }) => {
            const scopeError = requireScope(ctx, 'security:read');
            if (scopeError) return errorResult(scopeError);

            try {
              const report = await ctx.backend.get(
                `fraud/admin/models/${encodeURIComponent(modelId)}/risk-report`,
              );
              return jsonResult(report);
            } catch (err) {
              return errorResult(`Failed to get risk report: ${msg(err)}`);
            }
          },
        );

        server.registerTool(
          'security_list_alerts',
          {
            title: 'List security alerts',
            description:
              'List recent security/risk alerts raised by the fraud engine. Requires admin scope.',
            inputSchema: {},
          },
          async () => {
            const scopeError = requireScope(ctx, 'security:read');
            if (scopeError) return errorResult(scopeError);

            try {
              const alerts = await ctx.backend.get<AlertRecord[]>(
                'analytics/admin/alerts',
              );
              const security = alerts.filter(
                (a) =>
                  (a.alertName ?? '').toLowerCase().includes('risk') ||
                  Boolean(a.labels?.threat_class),
              );
              return jsonResult({ count: security.length, alerts: security });
            } catch (err) {
              return errorResult(
                `Failed to list security alerts (admin scope required): ${msg(err)}`,
              );
            }
          },
        );
      }
    },
  };
}
