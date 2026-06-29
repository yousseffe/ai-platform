import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpModule, RequestContext } from '../../types.js';
import { jsonResult, errorResult } from '../../result.js';

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
      server.registerTool(
        'security_get_risk_report',
        {
          title: 'Get model risk report',
          description:
            'Return the deterministic fraud/abuse risk report for a model the caller owns: current risk score, threat class, recent findings (rules + evidence), recommendations, and the traffic baseline.',
          inputSchema: { modelId: z.string().describe('Model UUID') },
        },
        async ({ modelId }) => {
          try {
            const report = await ctx.backend.get(
              `fraud/models/${encodeURIComponent(modelId)}/risk-report`,
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
    },
  };
}
