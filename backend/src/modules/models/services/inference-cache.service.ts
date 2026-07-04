import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../shared/redis/redis.service';

/** A previously-served prediction result stored for exact-match replay. */
export interface CachedPrediction {
  output: unknown;
  cost: number;
  responseSizeBytes: number | null;
}

/** Cache hit/miss counters for a single model. */
export interface CacheStats {
  hits: number;
  misses: number;
  hitRatePercent: number;
}

/**
 * Exact-match response cache for prediction calls. Entries are keyed by
 * model + deployment + request payload hash, so a redeploy or new version
 * (which changes the deployment ID) automatically invalidates all cached
 * responses for the previous container without any manual cache-busting.
 */
@Injectable()
export class InferenceCacheService {
  constructor(private readonly redisService: RedisService) {}

  private buildKey(
    modelId: string,
    deploymentId: string,
    payloadHash: string,
  ): string {
    return `predict-cache:${modelId}:${deploymentId}:${payloadHash}`;
  }

  private statsKey(modelId: string, kind: 'hits' | 'misses'): string {
    return `predict-cache:stats:${modelId}:${kind}`;
  }

  /**
   * Looks up a cached response for an identical prior request.
   *
   * @returns The cached entry, or `null` on a cache miss.
   */
  async get(
    modelId: string,
    deploymentId: string,
    payloadHash: string,
  ): Promise<CachedPrediction | null> {
    const raw = await this.redisService.get(
      this.buildKey(modelId, deploymentId, payloadHash),
    );
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as CachedPrediction;
    } catch {
      return null;
    }
  }

  /** Stores a successful prediction result for future exact-match replay. */
  async set(
    modelId: string,
    deploymentId: string,
    payloadHash: string,
    entry: CachedPrediction,
    ttlSeconds: number,
  ): Promise<void> {
    await this.redisService.set(
      this.buildKey(modelId, deploymentId, payloadHash),
      JSON.stringify(entry),
      ttlSeconds > 0 ? ttlSeconds : 60,
    );
  }

  /** Increments the cache-hit counter for a model. */
  async recordHit(modelId: string): Promise<void> {
    await this.redisService.incr(this.statsKey(modelId, 'hits'));
  }

  /** Increments the cache-miss counter for a model. */
  async recordMiss(modelId: string): Promise<void> {
    await this.redisService.incr(this.statsKey(modelId, 'misses'));
  }

  /** Reads the current hit/miss counters and derived hit rate for a model. */
  async getStats(modelId: string): Promise<CacheStats> {
    const [hitsRaw, missesRaw] = await Promise.all([
      this.redisService.get(this.statsKey(modelId, 'hits')),
      this.redisService.get(this.statsKey(modelId, 'misses')),
    ]);
    const hits = parseInt(hitsRaw || '0', 10);
    const misses = parseInt(missesRaw || '0', 10);
    const total = hits + misses;
    return {
      hits,
      misses,
      hitRatePercent: total > 0 ? Math.round((hits / total) * 1000) / 10 : 0,
    };
  }
}
