import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OrgRoleGuard, RequireOrgRole } from '../../auth/guards/org-role.guard';
import { OrganizationsService } from '../services/organizations.service';
import { OrgRole } from '../../../shared/enums/org-role.enum';
import { OrgType } from '../enums/org-type.enum';

/**
 * Controller exposing endpoints for organization/workspace settings, memberships, and OTP challenges.
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
    @Body()
    body: {
      name: string;
      slug?: string;
      type?: OrgType;
      description?: string;
      avatarUrl?: string;
      collaborators?: Array<{ email: string; role: OrgRole }>;
    },
  ) {
    return this.orgsService.createOrganization(
      body.name,
      body.slug,
      req.user.id,
      body.collaborators || [],
      body.type ?? OrgType.CONSUMER,
      body.description,
      body.avatarUrl,
    );
  }

  /**
   * Generates a Stripe Checkout Session for organization creation.
   * Caches pending workspace creation parameters in Redis.
   *
   * @param req - Request containing user details.
   * @param body - Post parameters.
   * @returns Checkout Session redirect URL.
   */
  @Post('checkout-session')
  async createCheckoutSession(
    @Req() req: Record<string, unknown> & { user: { id: string } },
    @Body()
    body: {
      name: string;
      slug?: string;
      type?: OrgType;
      description?: string;
      avatarUrl?: string;
      collaborators?: Array<{ email: string; role: OrgRole }>;
    },
  ) {
    return this.orgsService.createCheckoutSession(
      body.name,
      body.slug,
      req.user.id,
      body.collaborators || [],
      body.type ?? OrgType.CONSUMER,
      body.description,
      body.avatarUrl,
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
   * Retrieves the current system organization creation fee.
   *
   * @returns The fee configuration.
   */
  @Get('config/org-creation-fee')
  async getOrgCreationFee() {
    const fee = await this.orgsService.getOrgCreationFee();
    return { fee };
  }

  /**
   * Retrieves the current state of an organization Stripe checkout flow.
   *
   * @param pendingId - Pending organization checkout identifier.
   * @param req - Request containing authenticated user details.
   * @returns Pending/completed/expired status payload.
   */
  @Get('checkout-status/:pendingId')
  async getCheckoutStatus(
    @Param('pendingId') pendingId: string,
    @Req() req: Record<string, unknown> & { user: { id: string } },
  ) {
    return this.orgsService.getCheckoutStatus(pendingId, req.user.id);
  }

  /**
   * Lists members of an organization workspace.
   * Exposes slug-based membership for backwards compatibility.
   *
   * @param slug - Organization unique URL slug.
   * @returns Array of member profiles.
   */
  @Get(':slug/members')
  @UseGuards(OrgRoleGuard)
  @RequireOrgRole(OrgRole.OWNER, OrgRole.MAINTAINER)
  async listMembersSlug(@Param('slug') slug: string) {
    // Check if slug is UUID, if so run orgId, else find by slug
    const isUuid =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
        slug,
      );
    if (isUuid) {
      return this.orgsService.listMembers(slug);
    }
    const org = await this.orgsService.findOneBySlug(slug);
    return this.orgsService.listMembers(org.id);
  }

  /**
   * Invites/adds a collaborator to the organization workspace.
   * Exposes slug-based invite for backwards compatibility.
   *
   * @param slug - Organization unique URL slug.
   * @param body - Target user email and workspace role details.
   * @param req - Request details.
   * @returns Created membership record.
   */
  @Post(':slug/members/invite')
  @UseGuards(OrgRoleGuard)
  @RequireOrgRole(OrgRole.OWNER, OrgRole.MAINTAINER)
  async inviteSlug(
    @Param('slug') slug: string,
    @Body() body: { email: string; role: OrgRole },
    @Req() req: Record<string, unknown> & { user: { id: string } },
  ) {
    const isUuid =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
        slug,
      );
    let orgId = slug;
    if (!isUuid) {
      const org = await this.orgsService.findOneBySlug(slug);
      orgId = org.id;
    }
    return this.orgsService.inviteMember(
      orgId,
      body.email,
      body.role,
      req.user.id,
    );
  }

  /**
   * Invites/adds a collaborator to the organization workspace.
   * Spec-compliant route.
   *
   * @param orgId - Organization UUID.
   * @param body - Target user email and workspace role details.
   * @param req - Request details.
   * @returns Created membership record.
   */
  @Post(':orgId/members')
  @UseGuards(OrgRoleGuard)
  @RequireOrgRole(OrgRole.OWNER, OrgRole.MAINTAINER)
  async invite(
    @Param('orgId') orgId: string,
    @Body() body: { email: string; role: OrgRole },
    @Req() req: Record<string, unknown> & { user: { id: string } },
  ) {
    return this.orgsService.inviteMember(
      orgId,
      body.email,
      body.role,
      req.user.id,
    );
  }

  /**
   * Removes a member from the organization workspace.
   * Spec-compliant route.
   *
   * @param orgId - Organization UUID.
   * @param userId - User UUID to remove.
   * @param req - Request details.
   * @returns Successful deletion notification.
   */
  @Delete(':orgId/members/:userId')
  @UseGuards(OrgRoleGuard)
  @RequireOrgRole(OrgRole.OWNER, OrgRole.MAINTAINER)
  async removeMember(
    @Param('orgId') orgId: string,
    @Param('userId') userId: string,
    @Req() req: Record<string, unknown> & { user: { id: string } },
  ) {
    return this.orgsService.removeMember(orgId, userId, req.user.id);
  }

  /**
   * Updates a member's role in the organization workspace.
   * Spec-compliant route.
   *
   * @param orgId - Organization UUID.
   * @param userId - User UUID to update.
   * @param body - Target new role.
   * @param req - Request details.
   * @returns Updated membership record.
   */
  @Patch(':orgId/members/:userId')
  @UseGuards(OrgRoleGuard)
  @RequireOrgRole(OrgRole.OWNER, OrgRole.MAINTAINER)
  async updateMemberRole(
    @Param('orgId') orgId: string,
    @Param('userId') userId: string,
    @Body() body: { role: OrgRole },
    @Req() req: Record<string, unknown> & { user: { id: string } },
  ) {
    return this.orgsService.updateMemberRole(
      orgId,
      userId,
      body.role,
      req.user.id,
    );
  }

  /**
   * Triggers organization switcher access OTP generation.
   *
   * @param orgId - Target organization UUID.
   * @param req - Request details.
   * @returns Successful OTP trigger.
   */
  @Post(':orgId/access-otp/send')
  async sendAccessOtp(
    @Param('orgId') orgId: string,
    @Req() req: Record<string, unknown> & { user: { id: string } },
  ) {
    return this.orgsService.sendAccessOtp(orgId, req.user.id);
  }

  /**
   * Verifies organization switcher access OTP code.
   *
   * @param orgId - Target organization UUID.
   * @param body - Code payload.
   * @param req - Request details.
   * @returns Verified signal.
   */
  @Post(':orgId/access-otp/verify')
  async verifyAccessOtp(
    @Param('orgId') orgId: string,
    @Body() body: { code: string },
    @Req() req: Record<string, unknown> & { user: { id: string } },
  ) {
    if (!body.code) {
      throw new BadRequestException('Code is required');
    }
    return this.orgsService.verifyAccessOtp(orgId, req.user.id, body.code);
  }

  /**
   * Retrieves an organization details by its slug.
   *
   * @param slug - Organization unique URL slug.
   * @returns Organization details.
   */
  @Get('slug/:slug')
  async getBySlug(@Param('slug') slug: string) {
    return this.orgsService.findOneBySlug(slug);
  }

  /**
   * Updates organization profile settings.
   *
   * @param orgId - Organization UUID.
   * @param req - Request containing user details.
   * @param body - Editable organization profile fields.
   * @returns Updated organization record.
   */
  @Patch(':orgId')
  async updateOrganization(
    @Param('orgId') orgId: string,
    @Req() req: Record<string, unknown> & { user: { id: string } },
    @Body()
    body: {
      name?: string;
      description?: string | null;
      avatarUrl?: string | null;
    },
  ) {
    return this.orgsService.updateOrganization(orgId, req.user.id, body);
  }

  /**
   * Uploads an organization logo image and assigns it to the organization profile.
   *
   * @param orgId - Organization UUID.
   * @param req - Request containing user details.
   * @param file - Uploaded image file.
   * @returns Updated organization record.
   */
  @Post(':orgId/logo')
  @UseInterceptors(
    FileInterceptor('logo', {
      limits: { fileSize: 5 * 1024 * 1024 },
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `org-logo-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(
            new BadRequestException('Only image uploads are allowed'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadOrganizationLogo(
    @Param('orgId') orgId: string,
    @Req() req: Record<string, unknown> & { user: { id: string } },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Logo image is required');
    }
    return this.orgsService.uploadOrganizationLogo(orgId, req.user.id, file);
  }

  /**
   * Lists models registered by members of this organization.
   *
   * @param orgId - Organization UUID.
   * @param req - Request containing user details.
   * @returns Organization member models.
   */
  @Get(':orgId/models')
  async listOrganizationModels(
    @Param('orgId') orgId: string,
    @Req() req: Record<string, unknown> & { user: { id: string } },
  ) {
    return this.orgsService.listOrganizationModels(orgId, req.user.id);
  }

  /**
   * Retrieves the current user's role inside a specific organization.
   *
   * @param orgId - Organization UUID.
   * @param req - Request containing user details.
   * @returns User's active role.
   */
  @Get(':orgId/my-role')
  async getMyRole(
    @Param('orgId') orgId: string,
    @Req() req: Record<string, unknown> & { user: { id: string } },
  ) {
    const role = await this.orgsService.getMemberRole(orgId, req.user.id);
    return { role };
  }

  /**
   * Compiles organization stats metrics.
   *
   * @param orgId - Organization UUID.
   * @returns Aggregated statistics.
   */
  @Get(':orgId/stats')
  async getStats(@Param('orgId') orgId: string) {
    return this.orgsService.getOrgStats(orgId);
  }
}
