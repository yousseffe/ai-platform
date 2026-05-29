import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  Matches,
} from 'class-validator';

/**
 * Data transfer object for user registration.
 */
export class RegisterDto {
  /**
   * User email address.
   */
  @IsEmail()
  @IsNotEmpty()
  email: string;

  /**
   * Desired display name / username. Matches letters, numbers, and underscores.
   */
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message:
      'Username can only contain alphanumeric characters and underscores',
  })
  username: string;

  /**
   * Raw registration password. Must be at least 6 characters.
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
