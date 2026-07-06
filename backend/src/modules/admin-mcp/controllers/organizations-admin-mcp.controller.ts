import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKeyOrJwtGuard } from '../../../shared/guards/api-key-or-jwt.guard';
import { AdminGuard } from '../../../shared/guards/admin.guard';
import { OrgApiKey } from '../../organizations/entities/org-api-key.entity';
import { OrgMember } from '../../organizations/entities/org-member.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { Project } from '../../organizations/entities/project.entity';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { WalletType } from '../../../shared/enums/wallet-type.enum';

@Controller('admin-mcp')
@UseGuards(ApiKeyOrJwtGuard, AdminGuard)
export class OrganizationsAdminMcpController {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(OrgMember)
    private readonly orgMemberRepository: Repository<OrgMember>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(OrgApiKey)
    private readonly orgApiKeyRepository: Repository<OrgApiKey>,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
  ) {}

  @Get('organizations')
  async listOrganizations() {
    const organizations = await this.organizationRepository.find({
      order: { createdAt: 'DESC' },
    });

    return Promise.all(
      organizations.map(async (org) => {
        const [memberCount, projectCount] = await Promise.all([
          this.orgMemberRepository.count({ where: { orgId: org.id } }),
          this.projectRepository.count({ where: { orgId: org.id } }),
        ]);
        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          status: org.status,
          type: org.type,
          memberCount,
          projectCount,
          createdAt: org.createdAt,
        };
      }),
    );
  }

  @Get('organizations/:id')
  async getOrganization(@Param('id', ParseUUIDPipe) id: string) {
    const org = await this.organizationRepository.findOneBy({ id });
    if (!org) throw new NotFoundException('Organization not found');

    const [members, projects, apiKeys, consumerWallet, providerWallet] =
      await Promise.all([
        this.orgMemberRepository.find({ where: { orgId: id } }),
        this.projectRepository.find({ where: { orgId: id } }),
        this.orgApiKeyRepository.find({ where: { orgId: id } }),
        this.walletRepository.findOne({
          where: {
            ownerId: id,
            ownerType: OwnerType.ORG,
            walletType: WalletType.CONSUMER,
          },
        }),
        this.walletRepository.findOne({
          where: {
            ownerId: id,
            ownerType: OwnerType.ORG,
            walletType: WalletType.PROVIDER,
          },
        }),
      ]);

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      status: org.status,
      type: org.type,
      description: org.description,
      createdAt: org.createdAt,
      members: members.map((m) => ({
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        isActive: p.isActive,
        createdAt: p.createdAt,
      })),
      apiKeys: apiKeys.map((k) => ({
        id: k.id,
        label: k.label,
        keyPrefix: k.keyPrefix,
        isActive: k.isActive,
        lastUsedAt: k.lastUsedAt,
      })),
      consumerBalance: consumerWallet ? Number(consumerWallet.balance) || 0 : 0,
      providerBalance: providerWallet ? Number(providerWallet.balance) || 0 : 0,
    };
  }
}
