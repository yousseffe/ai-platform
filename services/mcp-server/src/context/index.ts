import type { Config } from '../config.js';
import type { ApiIdentity, RequestContext } from '../types.js';
import { BackendClient } from './backend-client.js';
import { PrometheusClient } from './prometheus-client.js';
import { LokiClient } from './loki-client.js';

/**
 * Builds the per-request context engine: a bundle of scoped clients plus the
 * resolved identity, handed to every tool/resource handler.
 *
 * @param identity - The resolved caller identity.
 * @param bearer - The caller's raw bearer token, forwarded to the backend.
 * @param cfg - Server configuration.
 * @returns A {@link RequestContext}.
 */
export function buildContext(
  identity: ApiIdentity,
  bearer: string,
  cfg: Config,
): RequestContext {
  return {
    identity,
    backend: new BackendClient(cfg.backendUrl, cfg.apiPrefix, bearer),
    prometheus: new PrometheusClient(cfg.prometheusUrl),
    loki: new LokiClient(cfg.lokiUrl),
    config: cfg,
  };
}

export { BackendClient } from './backend-client.js';
export { PrometheusClient } from './prometheus-client.js';
export { LokiClient } from './loki-client.js';
