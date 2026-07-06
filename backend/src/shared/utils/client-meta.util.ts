import { ClientRequestMeta } from '../../modules/inference/interfaces/inference.interface';

export function extractClientMeta(
  req: Record<string, unknown>,
): ClientRequestMeta {
  const headers = (req.headers ?? {}) as Record<string, unknown>;
  const ua = headers['user-agent'];
  const xff = headers['x-forwarded-for'];
  const first = (v: unknown): string | null =>
    typeof v === 'string'
      ? v.slice(0, 255)
      : Array.isArray(v) && typeof v[0] === 'string'
        ? v[0].slice(0, 255)
        : null;
  return {
    ipAddress: typeof req.ip === 'string' ? req.ip : null,
    userAgent: first(ua),
    xForwardedFor: first(xff),
  };
}
