import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * Service to connect to and interact with a Redis server.
 * Integrates an in-memory Map fallback if connection fails to ensure the application starts
 * and functions properly in offline environments.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis | null = null;
  private fallbackCache = new Map<
    string,
    { value: string; expiresAt: number }
  >();
  private isFallbackMode = false;

  /**
   * Initializes connection to Redis client. Fallbacks gracefully to memory if Redis is unavailable.
   */
  onModuleInit() {
    try {
      const host = process.env.REDIS_HOST || 'localhost';
      const port = parseInt(process.env.REDIS_PORT || '6379');

      this.client = new Redis({
        host,
        port,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
      });

      this.client.on('error', (err) => {
        if (!this.isFallbackMode) {
          console.warn(
            'Redis connection failed. Gracefully falling back to in-memory Cache Store.',
            err.message,
          );
          this.isFallbackMode = true;
        }
      });

      this.client.connect().catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(
          `Could not establish initial connection to Redis: ${message}. Falling back to in-memory Cache Store.`,
        );
        this.isFallbackMode = true;
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      console.warn(
        `Failed to construct Redis client: ${message}. Falling back to in-memory Cache Store.`,
      );
      this.isFallbackMode = true;
    }
  }

  /**
   * Disconnects the Redis client upon application shutdown.
   */
  onModuleDestroy() {
    if (this.client) {
      this.client.disconnect();
    }
  }

  /**
   * Sets a cache key with optional expiration.
   *
   * @param key - Cache storage key.
   * @param value - Cache value to write.
   * @param ttlSeconds - Time-to-live parameter in seconds.
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.isFallbackMode && this.client) {
      try {
        if (ttlSeconds) {
          await this.client.set(key, value, 'EX', ttlSeconds);
        } else {
          await this.client.set(key, value);
        }
        return;
      } catch (err) {
        console.warn('Redis write failed, switching to memory fallback:', err);
        this.isFallbackMode = true;
      }
    }

    const expiresAt =
      Date.now() + (ttlSeconds ? ttlSeconds * 1000 : 365 * 24 * 60 * 60 * 1000);
    this.fallbackCache.set(key, { value, expiresAt });
  }

  /**
   * Retrieves a cache key.
   *
   * @param key - Target storage key.
   * @returns Cache hit string, or null on cache miss.
   */
  async get(key: string): Promise<string | null> {
    if (!this.isFallbackMode && this.client) {
      try {
        return await this.client.get(key);
      } catch (err) {
        console.warn('Redis read failed, switching to memory fallback:', err);
        this.isFallbackMode = true;
      }
    }

    const cached = this.fallbackCache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiresAt) {
      this.fallbackCache.delete(key);
      return null;
    }

    return cached.value;
  }

  /**
   * Evicts a cache key.
   *
   * @param key - Target storage key.
   */
  async del(key: string): Promise<void> {
    if (!this.isFallbackMode && this.client) {
      try {
        await this.client.del(key);
        return;
      } catch (err) {
        console.warn('Redis del failed, switching to memory fallback:', err);
        this.isFallbackMode = true;
      }
    }

    this.fallbackCache.delete(key);
  }

  /**
   * Atomically increments a numeric counter key, creating it at 1 if absent.
   *
   * @param key - Target storage key.
   * @returns The counter's new value.
   */
  async incr(key: string): Promise<number> {
    if (!this.isFallbackMode && this.client) {
      try {
        return await this.client.incr(key);
      } catch (err) {
        console.warn('Redis incr failed, switching to memory fallback:', err);
        this.isFallbackMode = true;
      }
    }

    const cached = this.fallbackCache.get(key);
    const current =
      cached && Date.now() <= cached.expiresAt ? parseInt(cached.value, 10) || 0 : 0;
    const next = current + 1;
    this.fallbackCache.set(key, {
      value: next.toString(),
      expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
    });
    return next;
  }

  /**
   * Atomically increments a counter and applies a TTL only on its first
   * increment, so repeated calls don't keep pushing the expiry back. Used for
   * fixed-window counters (e.g. per-minute rate limits) where the window
   * boundary is encoded in the key itself.
   *
   * @param key - Target storage key.
   * @param ttlSeconds - Expiry to apply the first time this key is created.
   * @returns The counter's new value.
   */
  async incrWithExpiry(key: string, ttlSeconds: number): Promise<number> {
    if (!this.isFallbackMode && this.client) {
      try {
        const value = await this.client.incr(key);
        if (value === 1) {
          await this.client.expire(key, ttlSeconds);
        }
        return value;
      } catch (err) {
        console.warn(
          'Redis incrWithExpiry failed, switching to memory fallback:',
          err,
        );
        this.isFallbackMode = true;
      }
    }

    const now = Date.now();
    const cached = this.fallbackCache.get(key);
    if (!cached || now > cached.expiresAt) {
      this.fallbackCache.set(key, {
        value: '1',
        expiresAt: now + ttlSeconds * 1000,
      });
      return 1;
    }
    const next = (parseInt(cached.value, 10) || 0) + 1;
    this.fallbackCache.set(key, { value: next.toString(), expiresAt: cached.expiresAt });
    return next;
  }

  /**
   * Atomically adds a floating-point amount to a counter, creating it at
   * `amount` if absent. Used for cumulative spend counters.
   *
   * @param key - Target storage key.
   * @param amount - Amount to add (may be fractional).
   * @param ttlSeconds - Expiry to (re-)apply after this increment, for cleanup.
   * @returns The counter's new value.
   */
  async incrByFloat(
    key: string,
    amount: number,
    ttlSeconds?: number,
  ): Promise<number> {
    if (!this.isFallbackMode && this.client) {
      try {
        const value = await this.client.incrbyfloat(key, amount);
        if (ttlSeconds) {
          await this.client.expire(key, ttlSeconds);
        }
        return parseFloat(value);
      } catch (err) {
        console.warn(
          'Redis incrByFloat failed, switching to memory fallback:',
          err,
        );
        this.isFallbackMode = true;
      }
    }

    const now = Date.now();
    const cached = this.fallbackCache.get(key);
    const current =
      cached && now <= cached.expiresAt ? parseFloat(cached.value) || 0 : 0;
    const next = current + amount;
    this.fallbackCache.set(key, {
      value: next.toString(),
      expiresAt: now + (ttlSeconds ? ttlSeconds * 1000 : 365 * 24 * 60 * 60 * 1000),
    });
    return next;
  }

  /**
   * Retrieves the remaining time to live of a cache key.
   *
   * @param key - Target storage key.
   * @returns Remaining TTL in seconds, or negative values on cache misses.
   */
  async ttl(key: string): Promise<number> {
    if (!this.isFallbackMode && this.client) {
      try {
        return await this.client.ttl(key);
      } catch (err) {
        console.warn('Redis ttl failed, switching to memory fallback:', err);
        this.isFallbackMode = true;
      }
    }

    const cached = this.fallbackCache.get(key);
    if (!cached) return -2;

    const remaining = Math.round((cached.expiresAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }
}
