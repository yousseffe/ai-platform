import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { FirewallMode } from '../enums/firewall-mode.enum';

export class UpdateFirewallPolicyDto {
  @IsEnum(FirewallMode)
  @IsOptional()
  enforcementMode?: FirewallMode;

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(200)
  @IsOptional()
  ipAllowlist?: string[] | null;

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(200)
  @IsOptional()
  ipDenylist?: string[] | null;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  blockOnRiskScoreThreshold?: number | null;

  @IsBoolean()
  @IsOptional()
  blockOnInjection?: boolean;
}
