import { IsBoolean } from 'class-validator';

export class UpdateNetworkSettingsDto {
  @IsBoolean()
  allowEgress: boolean;
}
