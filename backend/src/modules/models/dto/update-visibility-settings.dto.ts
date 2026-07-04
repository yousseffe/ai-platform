import { IsBoolean } from 'class-validator';

/**
 * Data Transfer Object for updating a model's marketplace visibility.
 */
export class UpdateVisibilitySettingsDto {
  /**
   * Whether the model is listed in the public marketplace. False (the
   * default) keeps the model private to its owner (personal user or
   * organization member).
   */
  @IsBoolean()
  isPublic: boolean;
}
