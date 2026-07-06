import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateCacheSettingsDto {
  @IsBoolean()
  @IsOptional()
  cacheEnabled?: boolean;

  @IsInt()
  @Min(1)
  @Max(86400)
  @IsOptional()
  cacheTtlSeconds?: number;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  cacheHitDiscountPercent?: number;
}
