import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpModule, RequestContext } from '../../types.js';
import { jsonResult, errorResult } from '../../result.js';
import { analyzeRepository } from '../../analyzers/repo-analyzer.js';
import { getProviderMetadata } from '../../knowledge/providers.js';
import { requireScope } from '../../auth/scope.js';

interface PlatformModel {
  id: string;
  name: string;
  type?: string;
  framework?: string;
  taskType?: string;
  isPublic?: boolean;
  description?: string | null;
  costPerRequest?: string | number;
  tier?: string;
  marketplaceVerified?: boolean;
  createdAt?: string;
}

/**
 * Maps a platform Model record to the compact shape the agent needs to choose
 * and wire a model.
 */
function compactModel(m: PlatformModel): Record<string, unknown> {
  return {
    id: m.id,
    name: m.name,
    type: m.type,
    framework: m.framework,
    taskType: m.taskType,
    isPublic: m.isPublic,
    description: m.description ?? null,
    costPerRequest: m.costPerRequest !== undefined ? Number(m.costPerRequest) : 0,
    tier: m.tier ?? 'SMALL',
    marketplaceVerified: m.marketplaceVerified ?? false,
    createdAt: m.createdAt ?? null,
  };
}

/**
 * The `integration.*` capability group: repository intelligence and model /
 * provider integration metadata. Every tool is read-only and returns structured
 * context for the external agent to act on — the MCP server writes no code.
 */
export function integrationModule(): McpModule {
  return {
    register(server: McpServer, ctx: RequestContext): void {
      if (ctx.identity.mcpScopes?.includes('integration:read')) {
        server.registerTool(
          'integration_analyze_repository',
          {
            title: 'Analyze repository',
            description:
              'Deterministically detect framework, architecture, package manager, conventions, and integration points from supplied project files (include manifest contents like package.json/requirements.txt). No code is generated or modified.',
            inputSchema: {
              files: z
                .array(
                  z.object({
                    path: z.string().describe('Repo-relative file path'),
                    content: z
                      .string()
                      .optional()
                      .describe('File contents — required for manifests'),
                  }),
                )
                .describe('The project file tree; manifests should include content'),
            },
          },
          async ({ files }) => {
            const scopeError = requireScope(ctx, 'integration:read');
            if (scopeError) return errorResult(scopeError);
            return jsonResult(analyzeRepository(files));
          },
        );

        server.registerTool(
          'integration_get_provider_metadata',
          {
            title: 'Get AI provider metadata',
            description:
              'Return curated SDK/auth/endpoint metadata for an external AI provider (e.g. openai, claude, gemini), optionally tailored to a framework. Curated, not live — verify current model IDs from the provider docs.',
            inputSchema: {
              provider: z
                .string()
                .describe('Provider name or alias, e.g. "openai", "claude", "gemini"'),
              framework: z
                .string()
                .optional()
                .describe('Detected framework, e.g. "NestJS", to pick the SDK language'),
            },
          },
          async ({ provider, framework }) => {
            const scopeError = requireScope(ctx, 'integration:read');
            if (scopeError) return errorResult(scopeError);
            return jsonResult(getProviderMetadata(provider, framework));
          },
        );
      }

      if (ctx.identity.mcpScopes?.includes('models:read')) {
        server.registerTool(
          'integration_list_platform_models',
          {
            title: 'List platform models',
            description:
              'List models registered on the platform that the caller can integrate. Defaults to the caller’s own models for a user session, or the public marketplace otherwise.',
            inputSchema: {
              scope: z
                .enum(['mine', 'public'])
                .optional()
                .describe('Which catalog to list'),
            },
          },
          async ({ scope }) => {
            const scopeError = requireScope(ctx, 'models:read');
            if (scopeError) return errorResult(scopeError);

            const effective =
              scope ?? (ctx.identity.keyType === 'jwt' ? 'mine' : 'public');
            try {
              const path = effective === 'mine' ? 'models' : 'models/marketplace';
              const models = await ctx.backend.get<PlatformModel[]>(path);
              return jsonResult({
                scope: effective,
                count: models.length,
                models: models.map(compactModel),
              });
            } catch (err) {
              return errorResult(
                `Failed to list models (scope=${effective}): ${
                  err instanceof Error ? err.message : String(err)
                }. For your own models, authenticate with a user session (JWT).`,
              );
            }
          },
        );

        server.registerTool(
          'integration_get_model_spec',
          {
            title: 'Get model integration spec',
            description:
              'Return how to call a platform model’s prediction API: endpoint URL, auth-header format (never a live key), request/response samples, and pricing.',
            inputSchema: {
              modelId: z.string().describe('Target model UUID'),
            },
          },
          async ({ modelId }) => {
            const scopeError = requireScope(ctx, 'models:read');
            if (scopeError) return errorResult(scopeError);

            try {
              const spec = await ctx.backend.get(
                `models/${encodeURIComponent(modelId)}/integration-spec`,
              );
              return jsonResult(spec);
            } catch (err) {
              return errorResult(
                `Failed to fetch integration spec for ${modelId}: ${
                  err instanceof Error ? err.message : String(err)
                }`,
              );
            }
          },
        );
      }
    },
  };
}
