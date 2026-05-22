import {
  Controller,
  Request,
  Post,
  Body,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { AuthDto } from '../dto/auth.dto';
import { RefreshDto } from '../dto/refresh.dto';

/**
 * Controller handling authentication-related HTTP endpoints.
 * Handles user registration, login, and token refresh requests.
 */
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Registers a new user with email and password.
   *
   * @param body - Data transfer object containing registration credentials.
   * @returns A promise resolving to the created user or token response.
   */
  @Post('register')
  async register(@Body() body: AuthDto) {
    return this.authService.register(body.email, body.password);
  }

  /**
   * Authenticats a user based on email and password.
   *
   * @param body - Data transfer object containing login credentials.
   * @throws UnauthorizedException if credentials are invalid.
   * @returns A promise resolving to the access and refresh token payload.
   */
  @Post('login')
  async login(@Body() body: AuthDto) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  /**
   * Refreshes an expired access token using a valid refresh token.
   *
   * @param body - Data transfer object containing the refresh token.
   * @returns A promise resolving to the refreshed token payload.
   */
  @Post('refresh')
  refresh(@Body() body: RefreshDto) {
    return this.authService.refreshToken(body.refresh_token);
  }
}
