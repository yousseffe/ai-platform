import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Current password is required' })
  current_password: string;

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
