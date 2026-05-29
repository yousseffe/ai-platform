import { IsString, IsEmail, IsNotEmpty, Length } from 'class-validator';

/**
 * Data transfer object for user OTP code verification.
 */
export class VerifyDto {
  /**
   * User email address.
   */
  @IsEmail()
  @IsNotEmpty()
  email: string;

  /**
   * 6-digit verification code.
   */
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'OTP must be exactly 6 characters' })
  otp: string;
}
