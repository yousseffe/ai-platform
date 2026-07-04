import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OrgRoleGuard, RequireOrgRole } from '../../auth/guards/org-role.guard';
import { OrgRole } from '../../../shared/enums/org-role.enum';
import { Model } from '../../models/entities/model.entity';
import { FirewallService } from '../services/firewall.service';
import { FirewallScopeType } from '../enums/firewall-scope-type.enum';
import { UpdateFirewallPolicyDto } from '../dto/update-firewall-policy.dto';

interface RequestWithUser {
  user: { id: string; isAdmin?: boolean };
}

/**
 * Owner/organization-facing CRUD for firewall security policies (IP
 * allow/deny lists, prompt-injection blocking, and fraud-engine auto-block
 * threshold), plus read/clear access to any currently active auto-block.
 */
@Controller('firewall')
export class FirewallController {
  constructor(
    private readonly firewallService: FirewallService,
    @InjectRepository(Model)
    private readonly modelRepository: Repository<Model>,
  ) {}

  private async assertModelAccess(
    modelId: string,
    req: RequestWithUser,
  ): Promise<Model> {
    const model = await this.modelRepository.findOne({
      where: { id: modelId },
      relations: ['organization', 'user'],
    });
    if (!model) {
      throw new NotFoundException('Model not found');
    }
    if (
      !model.organization &&
      model.user?.id !== req.user.id &&
      !req.user.isAdmin
    ) {
      throw new ForbiddenException('You do not have access to this model');
    }
    return model;
  }

  /** Retrieves the firewall policy for a model (or defaults if unset). */
  @UseGuards(JwtAuthGuard)
  @Get('models/:modelId')
  async getModelPolicy(
    @Param('modelId') modelId: string,
    @Request() req: RequestWithUser,
  ) {
    await this.assertModelAccess(modelId, req);
    return this.firewallService.getPolicy(FirewallScopeType.MODEL, modelId);
  }

  /** Creates or updates the firewall policy for a model. */
  @UseGuards(JwtAuthGuard)
  @Put('models/:modelId')
  async updateModelPolicy(
    @Param('modelId') modelId: string,
    @Body() body: UpdateFirewallPolicyDto,
    @Request() req: RequestWithUser,
  ) {
    await this.assertModelAccess(modelId, req);
    return this.firewallService.upsertPolicy(
      FirewallScopeType.MODEL,
      modelId,
      body,
    );
  }

  /** Returns whether a model is currently auto-blocked, and why. */
  @UseGuards(JwtAuthGuard)
  @Get('models/:modelId/status')
  async getModelStatus(
    @Param('modelId') modelId: string,
    @Request() req: RequestWithUser,
  ) {
    await this.assertModelAccess(modelId, req);
    const reason = await this.firewallService.getBlockReason(
      FirewallScopeType.MODEL,
      modelId,
    );
    return { blocked: reason !== null, reason };
  }

  /** Manually lifts an active auto-block on a model. */
  @UseGuards(JwtAuthGuard)
  @Post('models/:modelId/unblock')
  async unblockModel(
    @Param('modelId') modelId: string,
    @Request() req: RequestWithUser,
  ) {
    await this.assertModelAccess(modelId, req);
    await this.firewallService.clearBlock(FirewallScopeType.MODEL, modelId);
    return { success: true };
  }

  /** Retrieves the firewall policy for an organization (or defaults if unset). */
  @UseGuards(JwtAuthGuard, OrgRoleGuard)
  @RequireOrgRole(OrgRole.OWNER, OrgRole.MAINTAINER)
  @Get('orgs/:orgId')
  async getOrgPolicy(@Param('orgId') orgId: string) {
    return this.firewallService.getPolicy(FirewallScopeType.ORG, orgId);
  }

  /** Creates or updates the firewall policy for an organization. */
  @UseGuards(JwtAuthGuard, OrgRoleGuard)
  @RequireOrgRole(OrgRole.OWNER, OrgRole.MAINTAINER)
  @Put('orgs/:orgId')
  async updateOrgPolicy(
    @Param('orgId') orgId: string,
    @Body() body: UpdateFirewallPolicyDto,
  ) {
    return this.firewallService.upsertPolicy(
      FirewallScopeType.ORG,
      orgId,
      body,
    );
  }
}
