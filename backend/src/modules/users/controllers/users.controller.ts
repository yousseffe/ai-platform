import {
  Controller,
  Post,
  Patch,
  Body,
  UseGuards,
  Req,
  Headers,
} from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';

/**
 * Controller handling user-specific settings, profile updates, and state actions.
 */
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Enrolls the user's individual account to act as a Provider.
   * Backwards compatible endpoint.
   *
   * @param req - Request envelope carrying authenticated user details.
   * @returns Updated User profile.
   */
  @Post('enable-provider')
  async enableProvider(
    @Req() req: Record<string, unknown> & { user: { id: string } },
  ) {
    return this.usersService.enableProvider(req.user.id);
  }

  /**
   * Enrolls the user's individual account to act as a Provider.
   * Spec-compliant endpoint.
   *
   * @param req - Request envelope carrying authenticated user details.
   * @returns Updated User profile.
   */
  @Post('me/enable-provider')
  async enableProviderMe(
    @Req() req: Record<string, unknown> & { user: { id: string } },
  ) {
    return this.usersService.enableProvider(req.user.id);
  }

  /**
   * Modifies display configurations for the authenticated user.
   *
   * @param req - Request carrying user details.
   * @param userAgent - Client agent header value.
   * @param body - Target configurations (full_name).
   * @returns Updated User profile.
   */
  @Patch('me')
  async updateProfile(
    @Req() req: Record<string, unknown> & { user: { id: string }; ip: string },
    @Headers('user-agent') userAgent: string,
    @Body() body: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(
      req.user.id,
      body.full_name,
      req.ip,
      userAgent,
    );
  }

  /**
   * Modifies authentication credentials after confirming current password.
   *
   * @param req - Request carrying user details.
   * @param userAgent - Client agent header value.
   * @param body - Security payload (current_password, new_password).
   * @returns Status receipt confirming update.
   */
  @Post('me/change-password')
  async changePassword(
    @Req() req: Record<string, unknown> & { user: { id: string }; ip: string },
    @Headers('user-agent') userAgent: string,
    @Body() body: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(
      req.user.id,
      body.current_password,
      body.new_password,
      req.ip,
      userAgent,
    );
  }

  /**
   * Rotates the API key of the authenticated user.
   *
   * @param req - Request envelope carrying authenticated user details.
   * @returns Newly created active ApiKey configuration.
   */
  @Post('me/rotate-api-key')
  async rotateApiKey(
    @Req() req: Record<string, unknown> & { user: { id: string } },
  ) {
    const newApiKey = await this.usersService.rotateApiKey(req.user.id);
    return { key: newApiKey.key };
  }
}
