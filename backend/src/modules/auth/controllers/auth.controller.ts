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
import { ApiIdentityService } from '../services/api-identity.service';
import { ApiIdentity } from '../interfaces/api-identity.interface';
import { AuthDto } from '../dto/auth.dto';
import { RegisterDto } from '../dto/register.dto';
import { VerifyDto } from '../dto/verify.dto';
import { RefreshDto } from '../dto/refresh.dto';
import { ResendVerificationDto } from '../dto/resend-verification.dto';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private apiIdentityService: ApiIdentityService,
  ) {}

  @Post('register')
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body.email, body.full_name, body.password);
  }

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

  @Post('resend-verification')
  async resend(@Body() body: ResendVerificationDto) {
    return this.authService.resendVerification(body.email);
  }

  @Post('login')
  async login(@Body() body: AuthDto) {
    const user = await this.authService.validateUser(body.email, body.password);
    return this.authService.login(user);
  }

  @Post('refresh')
  async refresh(@Body() body: RefreshDto) {
    return this.authService.refreshToken(body.refresh_token);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: Record<string, unknown> & { user: { id: string } }) {
    return this.authService.logout(req.user.id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(
    @Req() req: Record<string, unknown> & { user: { id: string } },
  ) {
    return this.authService.getProfile(req.user.id);
  }

  @Get('whoami')
  async whoami(
    @Req() req: { headers: { authorization?: string } },
  ): Promise<ApiIdentity> {
    return this.apiIdentityService.resolve(req.headers.authorization);
  }
}
