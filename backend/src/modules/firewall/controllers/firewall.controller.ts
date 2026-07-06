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
import { RequireOrgRole } from '../../../shared/guards/org-role.guard';
import { OrgRoleGuard } from '../../../shared/guards/org-role.guard';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { Model } from '../../models/entities/model.entity';
import { AuditLog } from '../../users/entities/audit-log.entity';
import { OrgRole } from '../../../shared/enums/org-role.enum';
import { FirewallService } from '../services/firewall.service';
import { FirewallScopeType } from '../enums/firewall-scope-type.enum';
import { UpdateFirewallPolicyDto } from '../dto/update-firewall-policy.dto';

interface RequestWithUser {
  user: { id: string; isAdmin?: boolean };
}

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

  @UseGuards(JwtAuthGuard)
  @Get('models/:modelId')
  async getModelPolicy(
    @Param('modelId') modelId: string,
    @Request() req: RequestWithUser,
  ) {
    await this.assertModelAccess(modelId, req);
    return this.firewallService.getPolicy(FirewallScopeType.MODEL, modelId);
  }

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

  @UseGuards(JwtAuthGuard, OrgRoleGuard)
  @RequireOrgRole(OrgRole.OWNER, OrgRole.MAINTAINER)
  @Get('orgs/:orgId')
  async getOrgPolicy(@Param('orgId') orgId: string) {
    return this.firewallService.getPolicy(FirewallScopeType.ORG, orgId);
  }

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

  @UseGuards(JwtAuthGuard)
  @Get('models/:modelId/logs')
  async getModelFirewallLogs(
    @Param('modelId') modelId: string,
    @Request() req: RequestWithUser,
  ) {
    await this.assertModelAccess(modelId, req);

    return this.modelRepository.manager
      .createQueryBuilder(AuditLog, 'log')
      .where("log.action LIKE 'firewall.%'")
      .andWhere("log.metadata->>'modelId' = :modelId", { modelId })
      .orderBy('log.created_at', 'DESC')
      .limit(10)
      .getMany();
  }
}
