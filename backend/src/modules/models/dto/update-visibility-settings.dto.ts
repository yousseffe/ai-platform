import { IsBoolean } from 'class-validator';

export class UpdateVisibilitySettingsDto {
  @IsBoolean()
  isPublic: boolean;
}
