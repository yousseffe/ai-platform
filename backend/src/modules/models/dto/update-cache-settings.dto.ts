import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Data Transfer Object for updating a model's response cache policy.
 */
export class UpdateCacheSettingsDto {
  /**
   * Whether identical prediction requests should be served from cache.
   */
  @IsBoolean()
  @IsOptional()
  cacheEnabled?: boolean;

  /**
   * How long a cached prediction response remains valid, in seconds.
   */
  @IsInt()
  @Min(1)
  @Max(86400)
  @IsOptional()
  cacheTtlSeconds?: number;

  /**
   * Percentage (0-100) of the normal cost waived on a cache hit.
   */
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  cacheHitDiscountPercent?: number;
}
