import { IsString, IsEmail, IsOptional, IsUUID, Length } from 'class-validator';

export class VerifyDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @Length(6, 6, { message: 'OTP must be exactly 6 characters' })
  otp?: string;

  @IsUUID('4', { message: 'user_id must be a valid UUID' })
  @IsOptional()
  user_id?: string;

  @IsString()
  @IsOptional()
  @Length(6, 6, { message: 'Code must be exactly 6 characters' })
  code?: string;
}
