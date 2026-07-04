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

/**
 * Data Transfer Object for creating or updating a scope's firewall policy.
 */
export class UpdateFirewallPolicyDto {
  /** MONITOR (log only) or ENFORCE (actively reject matching requests). */
  @IsEnum(FirewallMode)
  @IsOptional()
  enforcementMode?: FirewallMode;

  /** If non-empty, only requests from these IPs are allowed. */
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(200)
  @IsOptional()
  ipAllowlist?: string[] | null;

  /** Requests from these IPs are always rejected. */
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(200)
  @IsOptional()
  ipDenylist?: string[] | null;

  /** Fraud engine risk score (0-100) that trips an automatic temporary block. */
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  blockOnRiskScoreThreshold?: number | null;

  /** Whether ENFORCE mode should reject requests matching injection patterns. */
  @IsBoolean()
  @IsOptional()
  blockOnInjection?: boolean;
}
