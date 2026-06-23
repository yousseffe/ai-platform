import { IsString, IsEmail, IsOptional, IsUUID, Length } from 'class-validator';

/**
 * Data transfer object for user account verification OTP codes.
 * Supports both spec-compliant (user_id + code) and frontend-compliant (email + otp) payloads.
 */
export class VerifyDto {
  /**
   * User email address. Optional if user_id is provided.
   */
  @IsEmail({}, { message: 'Invalid email format' })
  @IsOptional()
  email?: string;

  /**
   * 6-digit verification OTP. Optional if code is provided.
   */
  @IsString()
  @IsOptional()
  @Length(6, 6, { message: 'OTP must be exactly 6 characters' })
  otp?: string;

  /**
   * User UUID. Optional if email is provided.
   */
  @IsUUID('4', { message: 'user_id must be a valid UUID' })
  @IsOptional()
  user_id?: string;

  /**
   * 6-digit verification code. Optional if otp is provided.
   */
  @IsString()
  @IsOptional()
  @Length(6, 6, { message: 'Code must be exactly 6 characters' })
  code?: string;
}
