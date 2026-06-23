import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { AuthDto } from '../dto/auth.dto';
import { RegisterDto } from '../dto/register.dto';
import { VerifyDto } from '../dto/verify.dto';
import { RefreshDto } from '../dto/refresh.dto';
import { ResendVerificationDto } from '../dto/resend-verification.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

/**
 * Controller handling authentication-related HTTP endpoints.
 * Exposes endpoints for user registration, verification, login, token refresh, resending OTP, and logout.
 */
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Registers a new user account on the platform.
   *
   * @param body - Registration credentials (email, full_name, password).
   * @returns Successful registration notification payload.
   */
  @Post('register')
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body.email, body.full_name, body.password);
  }

  /**
   * Verifies registration code to activate user account.
   * Accepts both user_id/code and email/otp formats.
   *
   * @param body - Verification payload containing identifiers and the 6-digit code.
   * @returns Verification confirmation indicator.
   */
  @Post('verify')
  async verify(@Body() body: VerifyDto) {
    const emailOrUserId = body.user_id || body.email;
    const codeOrOtp = body.code || body.otp;

    if (!emailOrUserId || !codeOrOtp) {
      throw new BadRequestException(
        'Identify user (user_id/email) and verification (code/otp)',
      );
    }

    return this.authService.verifyOtp(emailOrUserId, codeOrOtp);
  }

  /**
   * Resends a verification OTP code, rate limited to 3 resends per hour.
   *
   * @param body - Payload containing email to verify.
   * @returns Confirmed resend notification.
   */
  @Post('resend-verification')
  async resend(@Body() body: ResendVerificationDto) {
    return this.authService.resendVerification(body.email);
  }

  /**
   * Authenticates a user based on email and password.
   *
   * @param body - Data transfer object containing login credentials.
   * @returns Signed token pair payload.
   */
  @Post('login')
  async login(@Body() body: AuthDto) {
    const user = await this.authService.validateUser(body.email, body.password);
    return this.authService.login(user);
  }

  /**
   * Refreshes an expired access token using a valid refresh token.
   *
   * @param body - Data transfer object containing the refresh token.
   * @returns Refreshed token payload.
   */
  @Post('refresh')
  async refresh(@Body() body: RefreshDto) {
    return this.authService.refreshToken(body.refresh_token);
  }

  /**
   * Revokes user session, invalidating access token's JTI.
   *
   * @param req - Authenticated request containing user JWT details.
   * @returns Confirmation status.
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: Record<string, unknown> & { user: { id: string } }) {
    return this.authService.logout(req.user.id);
  }

  /**
   * Retrieves user profile configurations, active balances, and workspace lists.
   *
   * @param req - Request envelope carrying Jwt sub validation details.
   * @returns Session metadata payload.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(
    @Req() req: Record<string, unknown> & { user: { id: string } },
  ) {
    return this.authService.getProfile(req.user.id);
  }
}
