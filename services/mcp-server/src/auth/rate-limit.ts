/**
 * Minimal in-memory, per-key sliding-window rate limiter for the MCP boundary.
 * Mirrors the platform's nginx-level per-IP limiting but keyed on the credential
 * so a single key cannot flood the context engine.
 */
const windows = new Map<string, number[]>();
const WINDOW_MS = 60_000;

/**
 * Records a hit for `key` and reports whether it is within the allowed rate.
 *
 * @param key - A stable per-credential identifier (e.g. a token hash).
 * @param limitPerMinute - Maximum allowed requests in the trailing minute.
 * @returns `true` if the request is permitted, `false` if the limit is exceeded.
 */
export function allowRequest(key: string, limitPerMinute: number): boolean {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const hits = (windows.get(key) ?? []).filter((t) => t > cutoff);
  if (hits.length >= limitPerMinute) {
    windows.set(key, hits);
    return false;
  }
  hits.push(now);
  windows.set(key, hits);
  return true;
}
