import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpModule, RequestContext } from '../../types.js';
import { jsonResult, errorResult } from '../../result.js';
import { detectErrorSpikes, type MinuteBucket } from '../../analyzers/anomaly.js';
import {
  summarizeIncident,
  rankErrorLines,
  type MetricsSnapshot,
} from '../../analyzers/summary.js';
import { requireScope } from '../../auth/scope.js';

interface RequestStats {
  modelId: string;
  windowMinutes: number;
  requestCount: number;
  errorCount: number;
  errorRate: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
  statusCodes: Record<string, number>;
  perMinute: MinuteBucket[];
}

interface LogsResponse {
  logs: { timestamp: string; line: string }[];
  error?: string;
}

/** Extracts a readable error message from an unknown thrown value. */
function msg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * The `observability.*` capability group. Tools return raw, scoped telemetry plus
 * deterministic correlation/anomaly/summary. They never perform root-cause
 * reasoning — that is the external agent's job, done over this evidence.
 */
export function observabilityModule(): McpModule {
  return {
    register(server: McpServer, ctx: RequestContext): void {
      if (ctx.identity.mcpScopes?.includes('observability:read')) {
        server.registerTool(
          'observability_list_deployments',
          {
            title: 'List deployments',
            description: "List the caller's model deployments and their status.",
            inputSchema: {
              running: z
                .boolean()
                .optional()
                .describe('Restrict to RUNNING deployments'),
            },
          },
          async ({ running }) => {
            const scopeError = requireScope(ctx, 'observability:read');
            if (scopeError) return errorResult(scopeError);

            try {
              const data = await ctx.backend.get('analytics/deployments', {
                running: running ? 'true' : undefined,
              });
              return jsonResult(data);
            } catch (err) {
              return errorResult(`Failed to list deployments: ${msg(err)}`);
            }
          },
        );

        server.registerTool(
          'observability_get_model_metrics',
          {
            title: 'Get model metrics',
            description:
              'Live instant metrics for a model: CPU%, RAM, p50/p95 latency, request rate, error rate.',
            inputSchema: { modelId: z.string().describe('Model UUID') },
          },
          async ({ modelId }) => {
            const scopeError = requireScope(ctx, 'observability:read');
            if (scopeError) return errorResult(scopeError);

            try {
              const data = await ctx.backend.get(
                `analytics/models/${encodeURIComponent(modelId)}/metrics`,
              );
              return jsonResult(data);
            } catch (err) {
              return errorResult(`Failed to get metrics: ${msg(err)}`);
            }
          },
        );

        server.registerTool(
          'observability_get_request_stats',
          {
            title: 'Get request statistics',
            description:
              'Windowed request statistics from request logs: counts, error rate, latency percentiles, status-code distribution, and per-minute buckets.',
            inputSchema: {
              modelId: z.string().describe('Model UUID'),
              minutes: z
                .number()
                .int()
                .optional()
                .describe('Look-back window in minutes (default 15)'),
            },
          },
          async ({ modelId, minutes }) => {
            const scopeError = requireScope(ctx, 'observability:read');
            if (scopeError) return errorResult(scopeError);

            try {
              const data = await ctx.backend.get<RequestStats>(
                `analytics/models/${encodeURIComponent(modelId)}/request-stats`,
                { minutes },
              );
              return jsonResult(data);
            } catch (err) {
              return errorResult(`Failed to get request stats: ${msg(err)}`);
            }
          },
        );

        server.registerTool(
          'observability_search_logs',
          {
            title: 'Search model logs',
            description:
              "Fetch a model container's recent logs from Loki, optionally filtered to error-like lines.",
            inputSchema: {
              modelId: z.string().describe('Model UUID'),
              limit: z.number().int().optional().describe('Max log lines (default 100)'),
              errorsOnly: z
                .boolean()
                .optional()
                .describe('Return only error-like lines'),
            },
          },
          async ({ modelId, limit, errorsOnly }) => {
            const scopeError = requireScope(ctx, 'observability:read');
            if (scopeError) return errorResult(scopeError);

            try {
              const data = await ctx.backend.get<LogsResponse>(
                `analytics/models/${encodeURIComponent(modelId)}/logs`,
                { limit },
              );
              if (errorsOnly) {
                const re = /error|exception|traceback|fail|fatal|\b5\d\d\b/i;
                return jsonResult({
                  logs: data.logs.filter((l) => re.test(l.line)),
                });
              }
              return jsonResult(data);
            } catch (err) {
              return errorResult(`Failed to search logs: ${msg(err)}`);
            }
          },
        );

        server.registerTool(
          'observability_correlate',
          {
            title: 'Correlate model telemetry',
            description:
              'Gather request stats + live metrics + error logs for a model and time window, run deterministic spike detection, and return a descriptive summary plus the raw evidence. Root-cause reasoning is left to the agent.',
            inputSchema: {
              modelId: z.string().describe('Model UUID'),
              minutes: z
                .number()
                .int()
                .optional()
                .describe('Window in minutes (default 15)'),
            },
          },
          async ({ modelId, minutes }) => {
            const scopeError = requireScope(ctx, 'observability:read');
            if (scopeError) return errorResult(scopeError);

            const id = encodeURIComponent(modelId);
            try {
              const [stats, metrics, logsResp] = await Promise.all([
                ctx.backend.get<RequestStats>(
                  `analytics/models/${id}/request-stats`,
                  { minutes },
                ),
                ctx.backend
                  .get<MetricsSnapshot>(`analytics/models/${id}/metrics`)
                  .catch(() => ({}) as MetricsSnapshot),
                ctx.backend
                  .get<LogsResponse>(`analytics/models/${id}/logs`, { limit: 300 })
                  .catch(() => ({ logs: [] }) as LogsResponse),
              ]);

              const anomaly = detectErrorSpikes(stats.perMinute);
              const topErrors = rankErrorLines(logsResp.logs.map((l) => l.line));
              const summary = summarizeIncident({
                windowMinutes: stats.windowMinutes,
                requestCount: stats.requestCount,
                errorCount: stats.errorCount,
                errorRate: stats.errorRate,
                latencyP50Ms: stats.latencyP50Ms,
                latencyP95Ms: stats.latencyP95Ms,
                anomaly,
                topErrors,
                metrics,
              });

              let alerts: unknown[] = [];
              try {
                alerts = await ctx.backend.get<unknown[]>('analytics/admin/alerts');
              } catch {
                alerts = [];
              }

              return jsonResult({
                summary,
                window: { minutes: stats.windowMinutes },
                requestStats: stats,
                metrics,
                anomaly,
                errors: topErrors,
                recentErrorLogs: logsResp.logs.slice(-20),
                alerts,
                traces: [],
                note: 'Evidence only. Perform root-cause reasoning on the agent side.',
              });
            } catch (err) {
              return errorResult(`Failed to correlate telemetry: ${msg(err)}`);
            }
          },
        );

        server.registerTool(
          'observability_list_alerts',
          {
            title: 'List alerts',
            description:
              'List recently ingested platform alerts (Alertmanager). Requires admin scope.',
            inputSchema: {},
          },
          async () => {
            const scopeError = requireScope(ctx, 'observability:read');
            if (scopeError) return errorResult(scopeError);

            try {
              const data = await ctx.backend.get('analytics/admin/alerts');
              return jsonResult(data);
            } catch (err) {
              return errorResult(
                `Failed to list alerts (admin scope required): ${msg(err)}`,
              );
            }
          },
        );
      }
    },
  };
}
