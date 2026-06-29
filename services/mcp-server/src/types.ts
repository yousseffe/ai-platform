import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Config } from './config.js';
import type { BackendClient } from './context/backend-client.js';
import type { PrometheusClient } from './context/prometheus-client.js';
import type { LokiClient } from './context/loki-client.js';

/**
 * Classification of the credential that authenticated an MCP request.
 * Mirrors the backend `ApiKeyKind`.
 */
export type ApiKeyKind = 'org' | 'personal' | 'trial' | 'jwt' | 'mcp';

/**
 * Resolved caller identity returned by the backend `whoami` endpoint.
 * Contains no secret material. Used to scope every tool call.
 */
export interface ApiIdentity {
  scope: 'user' | 'org';
  keyType: ApiKeyKind;
  userId: string | null;
  email: string;
  orgId: string | null;
  projectId: string | null;
  modelId: string | null;
  /** MCP token scopes, present only when keyType is 'mcp'. */
  mcpScopes?: string[];
}

/**
 * Per-request context handed to every tool/resource handler. Bundles the
 * resolved identity with scoped context-engine clients so handlers never deal
 * with raw credentials or transport details.
 */
export interface RequestContext {
  /** The resolved, scoped caller identity. */
  identity: ApiIdentity;
  /** Backend client that forwards the caller's bearer token to `api/v1`. */
  backend: BackendClient;
  /** Prometheus query client. */
  prometheus: PrometheusClient;
  /** Loki query client. */
  loki: LokiClient;
  /** Server configuration. */
  config: Config;
}

/**
 * A registrable unit of MCP capability. Each tool/resource module exports one
 * of these; the registry composes them so new capabilities are drop-in.
 */
export interface McpModule {
  /**
   * Registers this module's tools/resources on a per-request server instance.
   *
   * @param server - The MCP server for the current request.
   * @param ctx - The scoped request context.
   */
  register(server: McpServer, ctx: RequestContext): void;
}
