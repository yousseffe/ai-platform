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
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('enable-provider')
  async enableProvider(
    @Req() req: Record<string, unknown> & { user: { id: string } },
  ) {
    return this.usersService.enableProvider(req.user.id);
  }

  @Post('me/enable-provider')
  async enableProviderMe(
    @Req() req: Record<string, unknown> & { user: { id: string } },
  ) {
    return this.usersService.enableProvider(req.user.id);
  }

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

  @Post('me/rotate-api-key')
  async rotateApiKey(
    @Req() req: Record<string, unknown> & { user: { id: string } },
  ) {
    const newApiKey = await this.usersService.rotateApiKey(req.user.id);
    return { key: newApiKey.key };
  }

  @Get('me/api-keys')
  async getMyApiKeys(
    @Req() req: Record<string, unknown> & { user: { id: string } },
  ) {
    return this.usersService.getUserApiKeys(req.user.id);
  }

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

  @Post('me/api-keys/:id/revoke')
  async revokeMyApiKey(
    @Req() req: Record<string, unknown> & { user: { id: string } },
    @Param('id') id: string,
  ) {
    await this.usersService.revokeUserApiKey(req.user.id, id);
    return { success: true };
  }

  @Patch('me/api-keys/:id/quota')
  async updateMyApiKeyQuota(
    @Req() req: Record<string, unknown> & { user: { id: string } },
    @Param('id') id: string,
    @Body()
    body: {
      maxRequestsPerMinute?: number | null;
      maxDailySpendCredits?: number | null;
    },
  ) {
    return this.usersService.updateApiKeyQuota(req.user.id, id, body);
  }
}
