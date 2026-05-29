import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceInterceptor } from '../../auth/guards/workspace.interceptor';
import { OrgRoleGuard, RequireOrgRole } from '../../auth/guards/org-role.guard';
import { OrganizationsService } from '../services/organizations.service';
import { OrgRole } from '../../../shared/enums/org-role.enum';

/**
 * Controller exposing endpoints for organization/workspace settings and memberships.
 */
@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  /**
   * Registers a new organization workspace.
   *
   * @param req - Request containing user details.
   * @param body - Post parameters (name, slug).
   * @returns Fully created Organization.
   */
  @Post()
  async create(
    @Req() req: Record<string, unknown> & { user: { id: string } },
    @Body() body: { name: string; slug: string },
  ) {
    return this.orgsService.createOrganization(
      body.name,
      body.slug,
      req.user.id,
    );
  }

  /**
   * Lists all organizations user belongs to.
   *
   * @param req - Request containing user details.
   * @returns List of active workspaces.
   */
  @Get()
  async list(@Req() req: Record<string, unknown> & { user: { id: string } }) {
    return this.orgsService.findUserOrganizations(req.user.id);
  }

  /**
   * Lists members of an organization workspace.
   * Resolves the workspace context and checks roles.
   *
   * @param slug - Organization unique URL slug.
   * @returns Array of member profiles.
   */
  @Get(':slug/members')
  @UseGuards(OrgRoleGuard)
  @UseInterceptors(WorkspaceInterceptor)
  @RequireOrgRole(OrgRole.OWNER, OrgRole.MAINTAINER)
  async listMembers(@Param('slug') slug: string) {
    return this.orgsService.listMembers(slug);
  }

  /**
   * Invites/adds a collaborator to the organization workspace.
   * Resolves the workspace context and checks roles.
   *
   * @param slug - Organization unique URL slug.
   * @param body - Target user email and workspace role details.
   * @returns Created membership record.
   */
  @Post(':slug/members/invite')
  @UseGuards(OrgRoleGuard)
  @UseInterceptors(WorkspaceInterceptor)
  @RequireOrgRole(OrgRole.OWNER, OrgRole.MAINTAINER)
  async invite(
    @Param('slug') slug: string,
    @Body()
    body: {
      email: string;
      role: OrgRole;
    },
  ) {
    return this.orgsService.inviteMember(slug, body.email, body.role);
  }
}
