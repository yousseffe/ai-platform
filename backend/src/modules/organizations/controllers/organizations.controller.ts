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
import * as fs from 'fs';
import { RequireOrgRole } from '../../../shared/guards/org-role.guard';
import { OrgRoleGuard } from '../../../shared/guards/org-role.guard';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { OrganizationsService } from '../services/organizations.service';
import { OrgRole } from '../../../shared/enums/org-role.enum';
import { OrgType } from '../enums/org-type.enum';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

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

  @Get()
  async list(@Req() req: Record<string, unknown> & { user: { id: string } }) {
    return this.orgsService.findUserOrganizations(req.user.id);
  }

  @Get('config/org-creation-fee')
  async getOrgCreationFee() {
    const fee = await this.orgsService.getOrgCreationFee();
    return { fee };
  }

  @Get('checkout-status/:pendingId')
  async getCheckoutStatus(
    @Param('pendingId') pendingId: string,
    @Req() req: Record<string, unknown> & { user: { id: string } },
  ) {
    return this.orgsService.getCheckoutStatus(pendingId, req.user.id);
  }

  @Get(':slug/members')
  @UseGuards(OrgRoleGuard)
  @RequireOrgRole(OrgRole.OWNER, OrgRole.MAINTAINER)
  async listMembersSlug(@Param('slug') slug: string) {
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

  @Post(':orgId/access-otp/send')
  async sendAccessOtp(
    @Param('orgId') orgId: string,
    @Req() req: Record<string, unknown> & { user: { id: string } },
  ) {
    return this.orgsService.sendAccessOtp(orgId, req.user.id);
  }

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

  @Get('slug/:slug')
  async getBySlug(@Param('slug') slug: string) {
    return this.orgsService.findOneBySlug(slug);
  }

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

  @Post(':orgId/logo')
  @UseInterceptors(
    FileInterceptor('logo', {
      limits: { fileSize: 5 * 1024 * 1024 },
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dir = './uploads';
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          cb(null, dir);
        },
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

  @Get(':orgId/models')
  async listOrganizationModels(
    @Param('orgId') orgId: string,
    @Req() req: Record<string, unknown> & { user: { id: string } },
  ) {
    return this.orgsService.listOrganizationModels(orgId, req.user.id);
  }

  @Get(':orgId/my-role')
  async getMyRole(
    @Param('orgId') orgId: string,
    @Req() req: Record<string, unknown> & { user: { id: string } },
  ) {
    const role = await this.orgsService.getMemberRole(orgId, req.user.id);
    return { role };
  }

  @Get(':orgId/stats')
  async getStats(@Param('orgId') orgId: string) {
    return this.orgsService.getOrgStats(orgId);
  }
}
