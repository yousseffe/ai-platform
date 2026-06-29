import crypto from 'node:crypto';
import type { ApiIdentity } from '../types.js';
import type { Config } from '../config.js';

/** Raised when a credential cannot be resolved to a valid identity. */
export class UnauthorizedError extends Error {}

interface CacheEntry {
  identity: ApiIdentity;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

/**
 * Resolves a platform bearer token to a scoped identity by delegating to the
 * backend `whoami` endpoint, caching the result briefly to avoid a round-trip
 * on every tool call. The MCP server performs no auth of its own.
 *
 * @param bearer - The raw platform API key / JWT (without the `Bearer ` prefix).
 * @param cfg - Server configuration.
 * @returns The resolved {@link ApiIdentity}.
 * @throws {UnauthorizedError} If the backend rejects the credential.
 */
export async function resolveIdentity(
  bearer: string,
  cfg: Config,
): Promise<ApiIdentity> {
  const cacheKey = crypto.createHash('sha256').update(bearer).digest('hex');
  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.identity;
  }

  let res: Response;
  try {
    res = await fetch(`${cfg.backendUrl}${cfg.apiPrefix}/auth/whoami`, {
      headers: { Authorization: `Bearer ${bearer}`, Accept: 'application/json' },
    });
  } catch (err) {
    throw new UnauthorizedError(
      `Unable to reach platform for credential validation: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  if (!res.ok) {
    throw new UnauthorizedError('Invalid or revoked platform credential');
  }

  const identity = (await res.json()) as ApiIdentity;
  cache.set(cacheKey, { identity, expiresAt: now + cfg.identityCacheTtlMs });
  return identity;
}
