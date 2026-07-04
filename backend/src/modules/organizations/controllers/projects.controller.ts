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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OrgRoleGuard, RequireOrgRole } from '../../auth/guards/org-role.guard';
import { ProjectsService } from '../services/projects.service';
import { OrganizationsService } from '../services/organizations.service';
import { OrgRole } from '../../../shared/enums/org-role.enum';
import { OrgApiKey } from '../entities/org-api-key.entity';

/**
 * Controller exposing endpoints to manage projects and API keys within organizations.
 * All routes require JWT authentication and organization membership.
 * Write operations additionally require OWNER or MAINTAINER role.
 */
@Controller('organizations/:orgId/projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly organizationsService: OrganizationsService,
  ) {}

  // ─── Projects ────────────────────────────────────────────────────────────

  /**
   * Creates a new project under the organization.
   * Requires OWNER or MAINTAINER role.
   *
   * @param orgId - UUID of the parent organization.
   * @param body - Project name and optional description.
   * @returns The newly created Project entity.
   */
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

  /**
   * Lists all active projects belonging to the organization.
   * Accessible by all org members.
   *
   * @param orgId - UUID of the organization.
   * @returns Array of Project entities.
   */
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

  /**
   * Returns organization-wide consumer usage analytics.
   * API-key breakdowns are returned only for OWNER and MAINTAINER roles.
   *
   * @param orgId - UUID of the organization.
   * @param req - Authenticated request context.
   * @returns Aggregated usage summary across projects, API keys, models, days, and months.
   */
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

  /**
   * Retrieves a single project by ID within the organization.
   * Accessible by all org members.
   *
   * @param orgId - UUID of the organization.
   * @param projectId - UUID of the project.
   * @returns The Project entity.
   */
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

  /**
   * Soft-deletes a project and revokes all its associated API keys.
   * Requires OWNER or MAINTAINER role.
   *
   * @param orgId - UUID of the organization.
   * @param projectId - UUID of the project to delete.
   * @returns Confirmation message.
   */
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

  // ─── API Keys ─────────────────────────────────────────────────────────────

  /**
   * Generates a new API key for the project.
   * The raw key value is returned ONCE in this response — never stored in DB.
   * Requires OWNER or MAINTAINER role.
   *
   * @param orgId - UUID of the organization.
   * @param projectId - UUID of the project.
   * @param body - Label for the key.
   * @returns The OrgApiKey entity plus the one-time rawKey string.
   */
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
    // Strip keyHash before returning — only expose rawKey (once) and prefix
    const { keyHash, ...safeKey } = result;
    void keyHash;
    return safeKey;
  }

  /**
   * Lists all active API keys for the project.
   * Never exposes keyHash — only the masked prefix is returned.
   * Accessible by OWNER, MAINTAINER, and CONTRIBUTOR.
   *
   * @param orgId - UUID of the organization.
   * @param projectId - UUID of the project.
   * @returns Array of OrgApiKey entities with keyHash stripped.
   */
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

  /**
   * Revokes an API key, preventing future use.
   * Requires OWNER or MAINTAINER role.
   *
   * @param orgId - UUID of the organization.
   * @param projectId - UUID of the project.
   * @param keyId - UUID of the API key to revoke.
   * @returns Confirmation message.
   */
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

  /**
   * Updates the rate limit and daily spend budget quota for a project API key.
   * Requires OWNER or MAINTAINER role.
   *
   * @param orgId - UUID of the organization.
   * @param projectId - UUID of the project.
   * @param keyId - UUID of the API key to update.
   * @param body - Quota fields to update.
   * @returns The updated OrgApiKey entity.
   */
  @Patch(':projectId/api-keys/:keyId/quota')
  @UseGuards(OrgRoleGuard)
  @RequireOrgRole(OrgRole.OWNER, OrgRole.MAINTAINER)
  async updateApiKeyQuota(
    @Param('orgId') orgId: string,
    @Param('projectId') projectId: string,
    @Param('keyId') keyId: string,
    @Body()
    body: { maxRequestsPerMinute?: number | null; maxDailySpendCredits?: number | null },
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

  /**
   * Returns project API key usage analytics and credit consumption.
   */
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

  /**
   * Returns recent model calls made through this project's API keys.
   */
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
