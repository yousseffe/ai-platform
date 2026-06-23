import {
  IsString,
  IsEmail,
  IsNotEmpty,
  Length,
  Matches,
} from 'class-validator';

/**
 * Data transfer object representing the user registration payload.
 */
export class RegisterDto {
  /**
   * User email address. Must be a valid email format.
   */
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  /**
   * User display full name. Required, 2-100 characters.
   */
  @IsString()
  @IsNotEmpty({ message: 'full_name is required' })
  @Length(2, 100, { message: 'Full name must be between 2 and 100 characters' })
  full_name: string;

  /**
   * Raw registration password.
   * Enforces policy: minimum 8 characters, at least 1 uppercase letter, 1 digit, and 1 special character.
   */
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @Length(8, 100, { message: 'Password must be at least 8 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message:
        'Password must contain at least one uppercase letter, one digit, and one special character',
    },
  )
  password: string;
}
