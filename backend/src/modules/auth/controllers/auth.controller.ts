import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { AuthDto } from '../dto/auth.dto';
import { RegisterDto } from '../dto/register.dto';
import { VerifyDto } from '../dto/verify.dto';
import { RefreshDto } from '../dto/refresh.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

/**
 * Controller handling authentication-related HTTP endpoints.
 * Handles user registration, email validation, login, token refresh, and profile retrieval.
 */
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Registers a new user account on the platform and issues a mock email OTP code.
   *
   * @param body - Registration credentials (email, username, password).
   * @returns Successful registration notification message.
   */
  @Post('register')
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body.email, body.username, body.password);
  }

  /**
   * Verifies registration code to activate user account.
   *
   * @param body - Verification payload containing email and code.
   * @returns Verification confirmation indicator.
   */
  @Post('verify')
  async verify(@Body() body: VerifyDto) {
    return this.authService.verifyOtp(body.email, body.otp);
  }

  /**
   * Authenticates a user based on email and password.
   *
   * @param body - Data transfer object containing login credentials.
   * @returns Signed token pair payload.
   */
  @Post('login')
  async login(@Body() body: AuthDto) {
    // validateUser will verify email, password, AND if status is ACTIVE
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      // Handled inside AuthService throwing Exception
      return null;
    }
    return this.authService.login(user);
  }

  /**
   * Refreshes an expired access token using a valid refresh token.
   *
   * @param body - Data transfer object containing the refresh token.
   * @returns Refreshed token payload.
   */
  @Post('refresh')
  refresh(@Body() body: RefreshDto) {
    return this.authService.refreshToken(body.refresh_token);
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
