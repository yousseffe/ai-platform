import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';

/**
 * Data transfer object representing the password alteration request payload.
 */
export class ChangePasswordDto {
  /**
   * The user current active password.
   */
  @IsString()
  @IsNotEmpty({ message: 'Current password is required' })
  current_password: string;

  /**
   * New desired password.
   * Enforces policy: minimum 8 characters, at least 1 uppercase letter, 1 digit, and 1 special character.
   */
  @IsString()
  @IsNotEmpty({ message: 'New password is required' })
  @Length(8, 100, { message: 'New password must be at least 8 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message:
        'New password must contain at least one uppercase letter, one digit, and one special character',
    },
  )
  new_password: string;
}
