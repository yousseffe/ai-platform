import { HttpException, HttpStatus } from '@nestjs/common';
import { KeyQuotaService } from './key-quota.service';
import { RedisService } from '../../../shared/redis/redis.service';

describe('KeyQuotaService', () => {
  let service: KeyQuotaService;
  let redisServiceMock: any;

  beforeEach(() => {
    redisServiceMock = {
      get: jest.fn(),
      incrWithExpiry: jest.fn(),
      incrByFloat: jest.fn(),
    };
    service = new KeyQuotaService(redisServiceMock as unknown as RedisService);
  });

  describe('checkRateLimit', () => {
    it('does nothing if limit is null, undefined, or <= 0', async () => {
      await expect(service.checkRateLimit('key1', null)).resolves.not.toThrow();
      await expect(service.checkRateLimit('key1', undefined as any)).resolves.not.toThrow();
      await expect(service.checkRateLimit('key1', 0)).resolves.not.toThrow();
      await expect(service.checkRateLimit('key1', -5)).resolves.not.toThrow();
      expect(redisServiceMock.incrWithExpiry).not.toHaveBeenCalled();
    });

    it('allows requests within the limit', async () => {
      redisServiceMock.incrWithExpiry.mockResolvedValue(5);
      await expect(service.checkRateLimit('key1', 10)).resolves.not.toThrow();
      expect(redisServiceMock.incrWithExpiry).toHaveBeenCalled();
    });

    it('allows requests within limit when limit is passed as string', async () => {
      redisServiceMock.incrWithExpiry.mockResolvedValue(5);
      await expect(service.checkRateLimit('key1', '10' as any)).resolves.not.toThrow();
    });

    it('throws TOO_MANY_REQUESTS when limit is exceeded', async () => {
      redisServiceMock.incrWithExpiry.mockResolvedValue(11);
      await expect(service.checkRateLimit('key1', 10)).rejects.toThrow(
        new HttpException('Rate limit exceeded for this API key', HttpStatus.TOO_MANY_REQUESTS),
      );
    });

    it('throws TOO_MANY_REQUESTS when limit is exceeded and limit is a string', async () => {
      redisServiceMock.incrWithExpiry.mockResolvedValue(11);
      await expect(service.checkRateLimit('key1', '10' as any)).rejects.toThrow(
        new HttpException('Rate limit exceeded for this API key', HttpStatus.TOO_MANY_REQUESTS),
      );
    });
  });

  describe('assertWithinDailyBudget', () => {
    it('does nothing if limit is null, undefined, or <= 0', async () => {
      await expect(service.assertWithinDailyBudget('key1', null)).resolves.not.toThrow();
      await expect(service.assertWithinDailyBudget('key1', undefined as any)).resolves.not.toThrow();
      await expect(service.assertWithinDailyBudget('key1', 0)).resolves.not.toThrow();
      await expect(service.assertWithinDailyBudget('key1', -1.5)).resolves.not.toThrow();
      expect(redisServiceMock.get).not.toHaveBeenCalled();
    });

    it('allows requests within spend limit', async () => {
      redisServiceMock.get.mockResolvedValue('5.5');
      await expect(service.assertWithinDailyBudget('key1', 10)).resolves.not.toThrow();
    });

    it('allows requests within spend limit when limit is a string decimal', async () => {
      redisServiceMock.get.mockResolvedValue('5.5');
      await expect(service.assertWithinDailyBudget('key1', '10.0000' as any)).resolves.not.toThrow();
    });

    it('throws PAYMENT_REQUIRED when spend limit is reached/exceeded', async () => {
      redisServiceMock.get.mockResolvedValue('10.0001');
      await expect(service.assertWithinDailyBudget('key1', 10)).rejects.toThrow(
        new HttpException('Daily spend budget exceeded for this API key', HttpStatus.PAYMENT_REQUIRED),
      );
    });

    it('throws PAYMENT_REQUIRED when spend limit is reached/exceeded and limit is string decimal', async () => {
      redisServiceMock.get.mockResolvedValue('10.0001');
      await expect(service.assertWithinDailyBudget('key1', '10.0000' as any)).rejects.toThrow(
        new HttpException('Daily spend budget exceeded for this API key', HttpStatus.PAYMENT_REQUIRED),
      );
    });
  });

  describe('recordSpend', () => {
    it('does nothing if cost is <= 0 or NaN', async () => {
      await service.recordSpend('key1', 0);
      await service.recordSpend('key1', -2.5);
      await service.recordSpend('key1', NaN);
      expect(redisServiceMock.incrByFloat).not.toHaveBeenCalled();
    });

    it('records positive cost spend', async () => {
      await service.recordSpend('key1', 5.25);
      expect(redisServiceMock.incrByFloat).toHaveBeenCalledWith(
        expect.stringContaining('spend:key1:'),
        5.25,
        90000,
      );
    });
  });
});
