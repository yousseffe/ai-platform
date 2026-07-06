import { IsString, IsUUID } from 'class-validator';
import {
  ChangeProviderStatusDto,
  ProviderOverridesDto,
} from '../../provider-accounts';

export class AdminChangeProviderTierDto {
  @IsUUID()
  tierId: string;

  @IsString()
  reason: string;
}

export class AdminChangeProviderStatusDto extends ChangeProviderStatusDto {
  @IsString()
  reason: string;
}

export class AdminProviderOverridesDto extends ProviderOverridesDto {
  @IsString()
  reason: string;
}

export class AdminProviderNoteDto {
  @IsString()
  note: string;
}
