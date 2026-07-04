import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
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

  /**
   * Retrieves all active LIVE API keys for the authenticated user.
   *
   * @param req - Request containing user context.
   * @returns Array of active API keys with model metadata.
   */
  @Get('me/api-keys')
  async getMyApiKeys(
    @Req() req: Record<string, unknown> & { user: { id: string } },
  ) {
    return this.usersService.getUserApiKeys(req.user.id);
  }

  /**
   * Generates a new named LIVE API key for a specific model.
   *
   * @param req - Request containing user context.
   * @param body - Specs (modelId, name).
   * @returns Newly generated API key details.
   */
  @Post('me/api-keys')
  async createMyApiKey(
    @Req() req: Record<string, unknown> & { user: { id: string } },
    @Body() body: { modelId: string; name?: string },
  ) {
    return this.usersService.generateUserApiKey(
      req.user.id,
      body.modelId,
      body.name || '',
    );
  }

  /**
   * Revokes (deactivates) a specific API key.
   *
   * @param req - Request containing user context.
   * @param id - API Key ID parameter.
   * @returns Status receipt.
   */
  @Post('me/api-keys/:id/revoke')
  async revokeMyApiKey(
    @Req() req: Record<string, unknown> & { user: { id: string } },
    @Param('id') id: string,
  ) {
    await this.usersService.revokeUserApiKey(req.user.id, id);
    return { success: true };
  }

  /**
   * Updates the rate limit and daily spend budget quota for a specific API key.
   *
   * @param req - Request containing user context.
   * @param id - API Key ID parameter.
   * @param body - Quota fields to update.
   * @returns The updated API key.
   */
  @Patch('me/api-keys/:id/quota')
  async updateMyApiKeyQuota(
    @Req() req: Record<string, unknown> & { user: { id: string } },
    @Param('id') id: string,
    @Body()
    body: { maxRequestsPerMinute?: number | null; maxDailySpendCredits?: number | null },
  ) {
    return this.usersService.updateApiKeyQuota(req.user.id, id, body);
  }
}
