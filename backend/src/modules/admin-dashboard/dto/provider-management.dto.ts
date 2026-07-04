import { IsString, IsUUID } from 'class-validator';
import {
  ChangeProviderStatusDto,
  ProviderOverridesDto,
} from '../../provider-accounts/dto/provider-account.dto';

/**
 * Admin payload for provider tier changes requiring an audit reason.
 */
export class AdminChangeProviderTierDto {
  /** Target provider tier UUID. */
  @IsUUID()
  tierId: string;

  /** Mandatory human-readable reason for the change. */
  @IsString()
  reason: string;
}

/**
 * Admin payload for provider status changes requiring an audit reason.
 */
export class AdminChangeProviderStatusDto extends ChangeProviderStatusDto {
  /** Mandatory human-readable reason for the change. */
  @IsString()
  reason: string;
}

/**
 * Admin payload for provider override changes requiring an audit reason.
 */
export class AdminProviderOverridesDto extends ProviderOverridesDto {
  /** Mandatory human-readable reason for the override change. */
  @IsString()
  reason: string;
}

/**
 * Admin payload for appending provider notes.
 */
export class AdminProviderNoteDto {
  /** Note content to append to lifecycle notes. */
  @IsString()
  note: string;
}
