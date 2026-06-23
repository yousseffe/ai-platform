import { IsEmail, IsNotEmpty } from 'class-validator';

/**
 * Data transfer object for resending email verification codes.
 */
export class ResendVerificationDto {
  /**
   * Target user email address.
   */
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;
}
