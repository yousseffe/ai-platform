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
import { AdminGuard } from '../../../shared/guards/admin.guard';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
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

@Controller('admin/providers')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminProvidersController {
  constructor(
    private readonly adminProviderQueryService: AdminProviderQueryService,
    private readonly adminProviderManagementService: AdminProviderManagementService,
  ) {}

  @Get()
  async listProviders(
    @Query() query: ListProvidersQueryDto,
  ): Promise<AdminProvidersListResponse> {
    return this.adminProviderQueryService.listProviders(query);
  }

  @Get(':id')
  async getProviderDetails(
    @Param('id') id: string,
  ): Promise<AdminProviderDetailsResponse> {
    return this.adminProviderQueryService.getProviderDetails(id);
  }

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
