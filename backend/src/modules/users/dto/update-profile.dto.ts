import { IsString, IsOptional, Length } from 'class-validator';

/**
 * Data transfer object for profile configuration updates.
 */
export class UpdateProfileDto {
  /**
   * User display full name. Optional, 2-100 characters.
   */
  @IsString()
  @IsOptional()
  @Length(2, 100, { message: 'Full name must be between 2 and 100 characters' })
  full_name?: string;
}
