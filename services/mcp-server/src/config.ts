/**
 * Runtime configuration for the MCP server, resolved from environment variables.
 *
 * The MCP server is a stateless, deterministic context provider — it holds no
 * secrets of its own beyond connection URLs and forwards the caller's platform
 * API key to the backend on every request.
 */
export interface Config {
  /** Port the MCP HTTP transport listens on. */
  port: number;
  /** Base URL of the NestJS backend (no trailing prefix), e.g. `http://backend:3000`. */
  backendUrl: string;
  /** Global API prefix exposed by the backend. */
  apiPrefix: string;
  /** Prometheus base URL for metric queries. */
  prometheusUrl: string;
  /** Loki base URL for log queries. */
  lokiUrl: string;
  /** How long a resolved identity is cached, in milliseconds. */
  identityCacheTtlMs: number;
  /** Per-key sliding-window rate limit (requests per minute) at the MCP boundary. */
  rateLimitPerMinute: number;
}

/**
 * Loads and validates MCP server configuration from `process.env`, applying
 * sensible local-development defaults.
 *
 * @returns The resolved {@link Config}.
 */
export function loadConfig(): Config {
  return {
    port: parseInt(process.env.MCP_PORT ?? '3030', 10),
    backendUrl: process.env.BACKEND_URL ?? 'http://localhost:3000',
    apiPrefix: process.env.BACKEND_API_PREFIX ?? '/api/v1',
    prometheusUrl: process.env.PROMETHEUS_URL ?? 'http://localhost:9090',
    lokiUrl: process.env.LOKI_URL ?? 'http://localhost:3100',
    identityCacheTtlMs: parseInt(process.env.MCP_IDENTITY_TTL_MS ?? '30000', 10),
    rateLimitPerMinute: parseInt(process.env.MCP_RATE_LIMIT_PER_MIN ?? '120', 10),
  };
}
