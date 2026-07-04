import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { RedisService } from '../../../shared/redis/redis.service';

/**
 * Enforces per-API-key rate limits and daily spend budgets using Redis
 * fixed-window counters. Shared by both personal (`ml_sk_*`) and
 * organization (`sk_live_*`) API key authentication paths in
 * {@link ApiKeyOrJwtGuard}.
 */
@Injectable()
export class KeyQuotaService {
  constructor(private readonly redisService: RedisService) {}

  private rateLimitKey(keyId: string): string {
    const minuteBucket = Math.floor(Date.now() / 60000);
    return `ratelimit:${keyId}:${minuteBucket}`;
  }

  private spendKey(keyId: string): string {
    const day = new Date().toISOString().slice(0, 10);
    return `spend:${keyId}:${day}`;
  }

  /**
   * Increments and checks the current minute's request counter for a key.
   *
   * @throws {HttpException} 429 if the per-minute limit is exceeded.
   */
  async checkRateLimit(
    keyId: string,
    maxRequestsPerMinute: number | null,
  ): Promise<void> {
    if (!maxRequestsPerMinute || maxRequestsPerMinute <= 0) {
      return;
    }
    const count = await this.redisService.incrWithExpiry(
      this.rateLimitKey(keyId),
      70,
    );
    if (count > maxRequestsPerMinute) {
      throw new HttpException(
        'Rate limit exceeded for this API key',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /** Reads today's accumulated spend (in credits) for a key. */
  async getDailySpend(keyId: string): Promise<number> {
    const raw = await this.redisService.get(this.spendKey(keyId));
    return raw ? parseFloat(raw) : 0;
  }

  /**
   * Checks whether a key has already exceeded its daily spend budget.
   *
   * @throws {HttpException} 402 if the daily budget has been exceeded.
   */
  async assertWithinDailyBudget(
    keyId: string,
    maxDailySpendCredits: number | null,
  ): Promise<void> {
    if (!maxDailySpendCredits || maxDailySpendCredits <= 0) {
      return;
    }
    const spend = await this.getDailySpend(keyId);
    if (spend >= maxDailySpendCredits) {
      throw new HttpException(
        'Daily spend budget exceeded for this API key',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
  }

  /** Records a successful charge against a key's daily spend counter. */
  async recordSpend(keyId: string, cost: number): Promise<void> {
    if (cost <= 0) {
      return;
    }
    // TTL is a cleanup safety net; the actual daily reset comes from the
    // date-stamped key, not the expiry.
    await this.redisService.incrByFloat(this.spendKey(keyId), cost, 90000);
  }
}
