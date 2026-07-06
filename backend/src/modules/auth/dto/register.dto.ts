import {
  IsString,
  IsEmail,
  IsNotEmpty,
  Length,
  Matches,
} from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'full_name is required' })
  @Length(2, 100, { message: 'Full name must be between 2 and 100 characters' })
  full_name: string;

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
