import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ListProvidersQueryDto } from '../dto/list-providers-query.dto';
import {
  AdminChangeProviderStatusDto,
  AdminChangeProviderTierDto,
  AdminProviderNoteDto,
  AdminProviderOverridesDto,
} from '../dto/provider-management.dto';
import { AdminProviderManagementService } from '../services/admin-provider-management.service';
import { AdminProviderQueryService } from '../services/admin-provider-query.service';
import {
  AdminProviderDetailsResponse,
  AdminProvidersListResponse,
} from '../types/admin-dashboard.types';

/**
 * Provider-focused admin controller for enterprise dashboard workflows.
 */
@Controller('admin/providers')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminProvidersController {
  constructor(
    private readonly adminProviderQueryService: AdminProviderQueryService,
    private readonly adminProviderManagementService: AdminProviderManagementService,
  ) {}

  /**
   * Returns the admin providers list with filtering and pagination.
   */
  @Get()
  async listProviders(
    @Query() query: ListProvidersQueryDto,
  ): Promise<AdminProvidersListResponse> {
    return this.adminProviderQueryService.listProviders(query);
  }

  /**
   * Returns the admin details payload for a single provider account.
   */
  @Get(':id')
  async getProviderDetails(
    @Param('id') id: string,
  ): Promise<AdminProviderDetailsResponse> {
    return this.adminProviderQueryService.getProviderDetails(id);
  }

  /**
   * Changes provider lifecycle status with a mandatory audit reason.
   */
  @Patch(':id/status')
  async changeStatus(
    @Param('id') id: string,
    @Body() body: AdminChangeProviderStatusDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.adminProviderManagementService.changeStatus(
      id,
      body,
      req.user.id,
    );
  }

  /**
   * Changes provider tier with a mandatory audit reason.
   */
  @Patch(':id/tier')
  async changeTier(
    @Param('id') id: string,
    @Body() body: AdminChangeProviderTierDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.adminProviderManagementService.changeTier(
      id,
      body,
      req.user.id,
    );
  }

  /**
   * Updates provider overrides with a mandatory audit reason.
   */
  @Patch(':id/overrides')
  async updateOverrides(
    @Param('id') id: string,
    @Body() body: AdminProviderOverridesDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.adminProviderManagementService.updateOverrides(
      id,
      body,
      req.user.id,
    );
  }

  /**
   * Appends an internal provider note.
   */
  @Post(':id/notes')
  async appendNote(
    @Param('id') id: string,
    @Body() body: AdminProviderNoteDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.adminProviderManagementService.appendNote(
      id,
      body,
      req.user.id,
    );
  }
}
