import { Controller, Request, Post, Body, UseGuards, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDto } from './dto/auth.dto';
import { RefreshDto } from './dto/refresh.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() body: AuthDto) {
    return this.authService.register(body.email, body.password);
  }

  @Post('login')
  async login(@Body() body: AuthDto) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  @Post('refresh')
  async refresh(@Body() body: RefreshDto) {
    return this.authService.refreshToken(body.refresh_token);
  }
}
