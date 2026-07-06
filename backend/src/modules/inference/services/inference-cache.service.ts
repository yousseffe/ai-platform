import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../shared/redis/redis.service';

export interface CachedPrediction {
  output: unknown;
  cost: number;
  responseSizeBytes: number | null;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRatePercent: number;
}

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

  async recordHit(modelId: string): Promise<void> {
    await this.redisService.incr(this.statsKey(modelId, 'hits'));
  }

  async recordMiss(modelId: string): Promise<void> {
    await this.redisService.incr(this.statsKey(modelId, 'misses'));
  }

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
