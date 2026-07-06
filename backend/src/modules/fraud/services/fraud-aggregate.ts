import { ModelLog } from '../../models/entities/model-log.entity';
import { TrafficFeatures } from '../fraud-rules';

function maxGroupCount(keys: (string | null)[]): number {
  const counts = new Map<string, number>();
  for (const key of keys) {
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let max = 0;
  for (const c of counts.values()) if (c > max) max = c;
  return max;
}

export function aggregateFeatures(
  modelId: string,
  logs: ModelLog[],
  windowMinutes: number,
  averageRating?: number,
  reviewCount?: number,
): TrafficFeatures {
  const requestCount = logs.length;
  let errorCount = 0;
  let injectionCount = 0;
  let trialCount = 0;
  let creditBurn = 0;
  const ips: (string | null)[] = [];
  const payloads: (string | null)[] = [];

  for (const log of logs) {
    if ((log.statusCode ?? 0) >= 400) errorCount += 1;
    if (log.injectionMatch) injectionCount += 1;
    if (
      typeof log.apiKey === 'string' &&
      log.apiKey.startsWith('ml_sk_trial_')
    ) {
      trialCount += 1;
    }
    creditBurn += Number(log.creditsCharged) || 0;
    ips.push(log.ipAddress);
    payloads.push(log.payloadHash);
  }

  const distinctIps = new Set(
    ips.filter((ip): ip is string => typeof ip === 'string'),
  ).size;

  return {
    modelId,
    windowMinutes,
    requestCount,
    errorCount,
    errorRate: requestCount ? errorCount / requestCount : 0,
    requestRatePerMin: requestCount / windowMinutes,
    distinctIps,
    topIpCount: maxGroupCount(ips),
    topPayloadRepeat: maxGroupCount(payloads),
    injectionCount,
    trialCount,
    creditBurn,
    averageRating,
    reviewCount,
  };
}
