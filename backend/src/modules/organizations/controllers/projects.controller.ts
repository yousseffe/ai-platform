import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  Req,
} from '@nestjs/common';
import { RequireOrgRole } from '../../../shared/guards/org-role.guard';
import { OrgRoleGuard } from '../../../shared/guards/org-role.guard';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { ProjectsService } from '../services/projects.service';
import { OrganizationsService } from '../services/organizations.service';
import { OrgRole } from '../../../shared/enums/org-role.enum';
import { OrgApiKey } from '../entities/org-api-key.entity';

@Controller('organizations/:orgId/projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly organizationsService: OrganizationsService,
  ) {}

  @Post()
  @UseGuards(OrgRoleGuard)
  @RequireOrgRole(OrgRole.OWNER, OrgRole.MAINTAINER)
  async createProject(
    @Param('orgId') orgId: string,
    @Body() body: { name: string; description?: string },
  ) {
    return this.projectsService.createProject(
      orgId,
      body.name,
      body.description,
    );
  }

  @Get()
  @UseGuards(OrgRoleGuard)
  @RequireOrgRole(
    OrgRole.OWNER,
    OrgRole.MAINTAINER,
    OrgRole.CONTRIBUTOR,
    OrgRole.VIEWER,
  )
  async listProjects(@Param('orgId') orgId: string) {
    return this.projectsService.listProjects(orgId);
  }

  @Get('usage/summary')
  @UseGuards(OrgRoleGuard)
  @RequireOrgRole(
    OrgRole.OWNER,
    OrgRole.MAINTAINER,
    OrgRole.CONTRIBUTOR,
    OrgRole.VIEWER,
  )
  async getOrganizationUsage(
    @Param('orgId') orgId: string,
    @Req() req: Record<string, unknown> & { user: { id: string } },
  ) {
    const role = await this.organizationsService.getMemberRole(
      orgId,
      req.user.id,
    );
    return this.projectsService.getOrganizationUsage(
      orgId,
      role ?? OrgRole.VIEWER,
    );
  }

  @Get(':projectId')
  @UseGuards(OrgRoleGuard)
  @RequireOrgRole(
    OrgRole.OWNER,
    OrgRole.MAINTAINER,
    OrgRole.CONTRIBUTOR,
    OrgRole.VIEWER,
  )
  async getProject(
    @Param('orgId') orgId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.projectsService.getProject(orgId, projectId);
  }

  @Delete(':projectId')
  @UseGuards(OrgRoleGuard)
  @RequireOrgRole(OrgRole.OWNER, OrgRole.MAINTAINER)
  @HttpCode(HttpStatus.OK)
  async deleteProject(
    @Param('orgId') orgId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.projectsService.deleteProject(orgId, projectId);
  }

  @Post(':projectId/api-keys')
  @UseGuards(OrgRoleGuard)
  @RequireOrgRole(OrgRole.OWNER, OrgRole.MAINTAINER)
  async createApiKey(
    @Param('orgId') orgId: string,
    @Param('projectId') projectId: string,
    @Body() body: { label: string; modelId: string },
  ) {
    const result = await this.projectsService.createApiKey(
      orgId,
      projectId,
      body.label,
      body.modelId,
    );

    const { keyHash, ...safeKey } = result;
    void keyHash;
    return safeKey;
  }

  @Get(':projectId/api-keys')
  @UseGuards(OrgRoleGuard)
  @RequireOrgRole(OrgRole.OWNER, OrgRole.MAINTAINER, OrgRole.CONTRIBUTOR)
  async listApiKeys(
    @Param('orgId') orgId: string,
    @Param('projectId') projectId: string,
  ): Promise<Omit<OrgApiKey, 'keyHash'>[]> {
    const keys = await this.projectsService.listApiKeys(orgId, projectId);
    return keys.map(({ keyHash, ...safeKey }) => {
      void keyHash;
      return safeKey;
    });
  }

  @Delete(':projectId/api-keys/:keyId')
  @UseGuards(OrgRoleGuard)
  @RequireOrgRole(OrgRole.OWNER, OrgRole.MAINTAINER)
  @HttpCode(HttpStatus.OK)
  async revokeApiKey(
    @Param('orgId') orgId: string,
    @Param('projectId') projectId: string,
    @Param('keyId') keyId: string,
  ) {
    return this.projectsService.revokeApiKey(orgId, projectId, keyId);
  }

  @Patch(':projectId/api-keys/:keyId/quota')
  @UseGuards(OrgRoleGuard)
  @RequireOrgRole(OrgRole.OWNER, OrgRole.MAINTAINER)
  async updateApiKeyQuota(
    @Param('orgId') orgId: string,
    @Param('projectId') projectId: string,
    @Param('keyId') keyId: string,
    @Body()
    body: {
      maxRequestsPerMinute?: number | null;
      maxDailySpendCredits?: number | null;
    },
  ) {
    const key = await this.projectsService.updateApiKeyQuota(
      orgId,
      projectId,
      keyId,
      body,
    );
    const { keyHash, ...safeKey } = key;
    void keyHash;
    return safeKey;
  }

  @Get(':projectId/api-keys/usage')
  @UseGuards(OrgRoleGuard)
  @RequireOrgRole(
    OrgRole.OWNER,
    OrgRole.MAINTAINER,
    OrgRole.CONTRIBUTOR,
    OrgRole.VIEWER,
  )
  async getApiKeyUsage(
    @Param('orgId') orgId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.projectsService.getProjectApiKeyUsage(orgId, projectId);
  }

  @Get(':projectId/api-keys/logs')
  @UseGuards(OrgRoleGuard)
  @RequireOrgRole(
    OrgRole.OWNER,
    OrgRole.MAINTAINER,
    OrgRole.CONTRIBUTOR,
    OrgRole.VIEWER,
  )
  async getApiKeyLogs(
    @Param('orgId') orgId: string,
    @Param('projectId') projectId: string,
    @Query('limit') limit = '50',
  ) {
    return this.projectsService.listProjectApiKeyLogs(
      orgId,
      projectId,
      parseInt(limit, 10) || 50,
    );
  }
}
