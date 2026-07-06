import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Organization } from '../entities/organization.entity';
import { OrgMember } from '../entities/org-member.entity';
import { UsersService } from '../../users';
import { AuditLog } from '../../users/entities/audit-log.entity';
import {
  TransactionStatus,
  TransactionType,
  WalletsService,
} from '../../wallets';
import { ProcessedWebhook } from '../../wallets/entities/processed-webhook.entity';
import { SystemConfig } from '../../wallets/entities/system-config.entity';
import { Transaction } from '../../wallets/entities/transaction.entity';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { Model } from '../../models/entities/model.entity';
import { ProviderAccountsService } from '../../provider-accounts';
import { OrgRole } from '../../../shared/enums/org-role.enum';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { WalletType } from '../../../shared/enums/wallet-type.enum';
import { OrgStatus } from '../enums/org-status.enum';
import { OrgType } from '../enums/org-type.enum';
import { RedisService } from '../../../shared/redis/redis.service';
import { MailService } from '../../../shared/mail/mail.service';
import { StripeService } from '../../../shared/stripe/stripe.service';
import { Project } from '../entities/project.entity';
import { MinioService } from '../../../shared/minio/minio.service';
import * as fs from 'fs';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    public readonly orgRepository: Repository<Organization>,
    @InjectRepository(OrgMember)
    private readonly memberRepository: Repository<OrgMember>,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => WalletsService))
    private readonly walletsService: WalletsService,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly redisService: RedisService,
    private readonly dataSource: DataSource,
    private readonly mailService: MailService,
    private readonly stripeService: StripeService,
    private readonly minioService: MinioService,
    private readonly providerAccountsService: ProviderAccountsService,
  ) {}

  async createOrganization(
    name: string,
    slug: string | undefined,
    ownerUserId: string,
    collaborators: Array<{ email: string; role: OrgRole }> = [],
    type: OrgType = OrgType.CONSUMER,
    description?: string,
    avatarUrl?: string,
    isPaidViaStripe = false,
    stripeEventId?: string,
  ): Promise<Organization & { your_role: string }> {
    const formattedSlug = slug
      ? slug.toLowerCase().replace(/[^a-z0-9-_]/g, '')
      : name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-');

    const existingName = await this.orgRepository.findOne({ where: { name } });
    if (existingName) {
      throw new ConflictException('Organization name already taken');
    }

    const existingSlug = await this.orgRepository.findOne({
      where: { slug: formattedSlug },
    });
    if (existingSlug) {
      throw new ConflictException('Organization slug is already in use');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const configEntity = await queryRunner.manager.findOne(SystemConfig, {
        where: { key: 'org_creation_fee' },
      });
      const orgCreationFee = configEntity
        ? parseFloat(configEntity.value)
        : 50.0;

      if (!isPaidViaStripe) {
        const creatorWallet = await queryRunner.manager.findOne(Wallet, {
          where: {
            ownerId: ownerUserId,
            ownerType: OwnerType.USER,
            walletType: WalletType.CONSUMER,
          },
        });

        if (!creatorWallet) {
          throw new BadRequestException('Creator wallet not initialized');
        }

        const balance =
          typeof creatorWallet.balance === 'string'
            ? parseFloat(creatorWallet.balance)
            : creatorWallet.balance;

        if (balance < orgCreationFee) {
          throw new BadRequestException(
            `Insufficient balance to create organization. Fee is ${orgCreationFee} credits.`,
          );
        }

        creatorWallet.balance = balance - orgCreationFee;
        await queryRunner.manager.save(Wallet, creatorWallet);

        const debitTx = queryRunner.manager.create(Transaction, {
          walletId: creatorWallet.id,
          type: TransactionType.DEBIT,
          amount: orgCreationFee,
          reference: `Organization creation fee: ${name}`,
          status: TransactionStatus.COMPLETED,
        });
        await queryRunner.manager.save(Transaction, debitTx);
      }

      const systemOwnerId = '00000000-0000-0000-0000-000000000000';
      const platformWalletType = isPaidViaStripe
        ? WalletType.PROVIDER
        : WalletType.CONSUMER;
      const platformWalletCurrency = isPaidViaStripe ? 'EGP' : 'CREDITS';
      let systemWallet = await queryRunner.manager.findOne(Wallet, {
        where: {
          ownerId: systemOwnerId,
          ownerType: OwnerType.USER,
          walletType: platformWalletType,
        },
      });

      if (!systemWallet) {
        systemWallet = queryRunner.manager.create(Wallet, {
          walletType: platformWalletType,
          ownerType: OwnerType.USER,
          ownerId: systemOwnerId,
          balance: 0.0,
          currency: platformWalletCurrency,
        });
        await queryRunner.manager.save(Wallet, systemWallet);
      }

      const systemBalance =
        typeof systemWallet.balance === 'string'
          ? parseFloat(systemWallet.balance)
          : systemWallet.balance;
      systemWallet.balance = systemBalance + orgCreationFee;
      await queryRunner.manager.save(Wallet, systemWallet);

      const platformTx = queryRunner.manager.create(Transaction, {
        walletId: systemWallet.id,
        type: TransactionType.CREDIT,
        amount: orgCreationFee,
        reference: isPaidViaStripe
          ? `Platform commission for organization creation (Stripe payment): ${name} (EGP ${orgCreationFee.toFixed(2)})`
          : `Platform commission for organization creation: ${name}`,
        status: TransactionStatus.COMPLETED,
        stripeEventId: stripeEventId || null,
      });
      await queryRunner.manager.save(Transaction, platformTx);

      const org = queryRunner.manager.create(Organization, {
        name,
        slug: formattedSlug,
        createdBy: ownerUserId,
        status: OrgStatus.ACTIVE,
        type,
        description: description?.trim() ?? null,
        avatarUrl: avatarUrl?.trim() ?? null,
      });
      const savedOrg = await queryRunner.manager.save(Organization, org);

      if (type === OrgType.CONSUMER || type === OrgType.HYBRID) {
        const consumerWallet = queryRunner.manager.create(Wallet, {
          walletType: WalletType.CONSUMER,
          ownerType: OwnerType.ORG,
          ownerId: savedOrg.id,
          balance: 0.0,
          currency: 'CREDITS',
        });
        const savedWallet = await queryRunner.manager.save(
          Wallet,
          consumerWallet,
        );
        savedOrg.walletId = savedWallet.id;
      }

      if (type === OrgType.PROVIDER || type === OrgType.HYBRID) {
        const providerWallet = queryRunner.manager.create(Wallet, {
          walletType: WalletType.PROVIDER,
          ownerType: OwnerType.ORG,
          ownerId: savedOrg.id,
          balance: 0.0,
          currency: 'EGP',
        });
        await queryRunner.manager.save(Wallet, providerWallet);
      }

      await queryRunner.manager.save(Organization, savedOrg);

      const ownerMember = queryRunner.manager.create(OrgMember, {
        orgId: savedOrg.id,
        userId: ownerUserId,
        role: OrgRole.OWNER,
      });
      await queryRunner.manager.save(OrgMember, ownerMember);

      for (const col of collaborators) {
        const user = await this.usersService.findOneByEmail(col.email);
        if (!user) {
          throw new BadRequestException(
            `User not found with email: ${col.email}`,
          );
        }

        if (col.role === OrgRole.OWNER) {
          throw new BadRequestException(
            'Cannot assign OWNER role during organization setup',
          );
        }

        const member = queryRunner.manager.create(OrgMember, {
          orgId: savedOrg.id,
          userId: user.id,
          role: col.role,
        });
        await queryRunner.manager.save(OrgMember, member);

        const inviteLog = queryRunner.manager.create(AuditLog, {
          userId: ownerUserId,
          action: 'MEMBER_INVITE',
          metadata: {
            org_id: savedOrg.id,
            invited_user_id: user.id,
            role: col.role,
          },
        });
        await queryRunner.manager.save(AuditLog, inviteLog);
      }

      if (isPaidViaStripe && stripeEventId) {
        const processed = queryRunner.manager.create(ProcessedWebhook, {
          stripeEventId,
          walletId: systemWallet.id,
        });
        await queryRunner.manager.save(ProcessedWebhook, processed);
      }

      await queryRunner.commitTransaction();

      if (type === OrgType.PROVIDER || type === OrgType.HYBRID) {
        await this.providerAccountsService.ensureProviderAccount(
          OwnerType.ORG,
          savedOrg.id,
          ownerUserId,
        );
      }

      const log = this.auditLogRepository.create({
        userId: ownerUserId,
        action: 'ORG_CREATE',
        metadata: { org_id: savedOrg.id, name: savedOrg.name },
      });
      await this.auditLogRepository.save(log);

      return {
        ...savedOrg,
        your_role: 'OWNER',
      };
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async createCheckoutSession(
    name: string,
    slug: string | undefined,
    ownerUserId: string,
    collaborators: Array<{ email: string; role: OrgRole }> = [],
    type: OrgType = OrgType.CONSUMER,
    description?: string,
    avatarUrl?: string,
  ): Promise<{ url: string }> {
    const formattedSlug = slug
      ? slug.toLowerCase().replace(/[^a-z0-9-_]/g, '')
      : name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-');

    const existingName = await this.orgRepository.findOne({ where: { name } });
    if (existingName) {
      throw new ConflictException('Organization name already taken');
    }

    const existingSlug = await this.orgRepository.findOne({
      where: { slug: formattedSlug },
    });
    if (existingSlug) {
      throw new ConflictException('Organization slug is already in use');
    }

    for (const col of collaborators) {
      const user = await this.usersService.findOneByEmail(col.email);
      if (!user) {
        throw new BadRequestException(
          `User not found with email: ${col.email}`,
        );
      }
      if (col.role === OrgRole.OWNER) {
        throw new BadRequestException(
          'Cannot assign OWNER role during organization setup',
        );
      }
    }

    const fee = await this.getOrgCreationFee();

    const pendingId =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

    const cacheKey = `pending_org:${pendingId}`;
    const payload = {
      name,
      slug: formattedSlug,
      ownerUserId,
      type,
      description,
      avatarUrl,
      collaborators,
    };
    await this.redisService.set(cacheKey, JSON.stringify(payload), 86400);

    const session = await this.stripeService.createOrgCheckoutSession(
      fee,
      pendingId,
      ownerUserId,
    );

    return { url: session.url as string };
  }

  async getCheckoutStatus(
    pendingId: string,
    ownerUserId: string,
  ): Promise<{
    status: 'pending' | 'completed' | 'expired';
    organization?: Pick<Organization, 'id' | 'name' | 'slug'>;
  }> {
    const completedKey = `completed_org:${pendingId}`;
    const completedRaw = await this.redisService.get(completedKey);
    if (completedRaw) {
      const completed = JSON.parse(completedRaw) as {
        ownerUserId: string;
        organization: Pick<Organization, 'id' | 'name' | 'slug'>;
      };

      if (completed.ownerUserId !== ownerUserId) {
        throw new ForbiddenException(
          'You are not allowed to access this checkout state',
        );
      }

      return {
        status: 'completed',
        organization: completed.organization,
      };
    }

    const pendingKey = `pending_org:${pendingId}`;
    const pendingRaw = await this.redisService.get(pendingKey);
    if (pendingRaw) {
      const pending = JSON.parse(pendingRaw) as { ownerUserId?: string };
      if (pending.ownerUserId && pending.ownerUserId !== ownerUserId) {
        throw new ForbiddenException(
          'You are not allowed to access this checkout state',
        );
      }

      return { status: 'pending' };
    }

    return { status: 'expired' };
  }

  async getOrgCreationFee(): Promise<number> {
    const configEntity = await this.dataSource
      .getRepository(SystemConfig)
      .findOne({
        where: { key: 'org_creation_fee' },
      });
    return configEntity ? parseFloat(configEntity.value) : 50.0;
  }

  async findUserOrganizations(
    userId: string,
  ): Promise<Array<Organization & { userRole: OrgRole }>> {
    const memberships = await this.memberRepository.find({
      where: { userId },
    });

    const orgIds = memberships.map((m) => m.orgId);
    if (orgIds.length === 0) return [];

    const orgs = await this.orgRepository.findBy({
      id: In(orgIds),
    });

    return orgs.map((org) => {
      const membership = memberships.find((m) => m.orgId === org.id);
      return {
        ...org,
        userRole: membership ? membership.role : OrgRole.VIEWER,
      };
    });
  }

  async inviteMember(
    orgId: string,
    email: string,
    role: OrgRole,
    requesterId: string,
  ): Promise<OrgMember> {
    const org = await this.orgRepository.findOne({ where: { id: orgId } });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const requesterMember = await this.memberRepository.findOne({
      where: { orgId, userId: requesterId },
    });
    if (!requesterMember) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    if (
      requesterMember.role !== OrgRole.OWNER &&
      requesterMember.role !== OrgRole.MAINTAINER
    ) {
      throw new ForbiddenException('Insufficient permissions');
    }

    if (requesterMember.role === OrgRole.MAINTAINER && role === OrgRole.OWNER) {
      throw new ForbiddenException('Insufficient permissions');
    }

    if (role === OrgRole.OWNER) {
      throw new BadRequestException('Use transfer ownership flow');
    }

    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      throw new BadRequestException('User not found with this email');
    }

    const requesterUser = await this.usersService.usersRepository.findOneBy({
      id: requesterId,
    });

    const existingMember = await this.memberRepository.findOne({
      where: { orgId, userId: user.id },
    });

    if (existingMember) {
      throw new ConflictException(
        'User is already a member of this organization',
      );
    }

    const member = this.memberRepository.create({
      orgId,
      userId: user.id,
      role,
    });
    const savedMember = await this.memberRepository.save(member);

    const log = this.auditLogRepository.create({
      userId: requesterId,
      action: 'MEMBER_INVITE',
      metadata: { org_id: orgId, invited_user_id: user.id, role },
    });
    await this.auditLogRepository.save(log);

    const inviteeName = user.fullName?.trim() || user.email;
    const inviterName =
      requesterUser?.fullName?.trim() ||
      requesterUser?.email ||
      'A workspace administrator';
    this.mailService
      .sendOrganizationInvitation(
        user.email,
        inviteeName,
        org.name,
        role,
        inviterName,
      )
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(
          `Deferred organization invitation email send failed: ${msg}`,
        );
      });

    return savedMember;
  }

  async removeMember(
    orgId: string,
    userId: string,
    requesterId: string,
  ): Promise<{ success: boolean }> {
    const org = await this.orgRepository.findOne({ where: { id: orgId } });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const requesterMember = await this.memberRepository.findOne({
      where: { orgId, userId: requesterId },
    });
    if (!requesterMember) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    if (
      requesterMember.role !== OrgRole.OWNER &&
      requesterMember.role !== OrgRole.MAINTAINER
    ) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const targetMember = await this.memberRepository.findOne({
      where: { orgId, userId },
    });
    if (!targetMember) {
      throw new NotFoundException('Target member not found in organization');
    }

    if (targetMember.role === OrgRole.OWNER) {
      const owners = await this.memberRepository.find({
        where: { orgId, role: OrgRole.OWNER },
      });
      if (owners.length <= 1) {
        throw new BadRequestException(
          'Cannot remove the last owner of an organization',
        );
      }
    }

    await this.memberRepository.remove(targetMember);

    const log = this.auditLogRepository.create({
      userId: requesterId,
      action: 'MEMBER_REMOVE',
      metadata: { org_id: orgId, removed_user_id: userId },
    });
    await this.auditLogRepository.save(log);

    return { success: true };
  }

  async updateMemberRole(
    orgId: string,
    userId: string,
    role: OrgRole,
    requesterId: string,
  ): Promise<OrgMember> {
    const requesterMember = await this.memberRepository.findOne({
      where: { orgId, userId: requesterId },
    });
    if (
      !requesterMember ||
      (requesterMember.role !== OrgRole.OWNER &&
        requesterMember.role !== OrgRole.MAINTAINER)
    ) {
      throw new ForbiddenException('Insufficient permissions');
    }

    if (
      requesterMember.role === OrgRole.MAINTAINER &&
      (role === OrgRole.OWNER || role === OrgRole.MAINTAINER)
    ) {
      throw new ForbiddenException('Insufficient permissions');
    }

    if (role === OrgRole.OWNER) {
      throw new BadRequestException('Use transfer ownership flow');
    }

    const targetMember = await this.memberRepository.findOne({
      where: { orgId, userId },
    });
    if (!targetMember) {
      throw new NotFoundException('Target member not found');
    }

    const oldRole = targetMember.role;
    targetMember.role = role;
    const saved = await this.memberRepository.save(targetMember);

    const log = this.auditLogRepository.create({
      userId: requesterId,
      action: 'MEMBER_ROLE_CHANGE',
      metadata: {
        org_id: orgId,
        target_user_id: userId,
        old_role: oldRole,
        new_role: role,
      },
    });
    await this.auditLogRepository.save(log);

    return saved;
  }

  async listMembers(orgId: string): Promise<unknown[]> {
    const org = await this.orgRepository.findOne({ where: { id: orgId } });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const memberships = await this.memberRepository.find({
      where: { orgId: org.id },
    });

    const membersList: unknown[] = [];
    for (const membership of memberships) {
      const user = await this.usersService.usersRepository.findOneBy({
        id: membership.userId,
      });
      if (user) {
        membersList.push({
          userId: user.id,
          email: user.email,
          fullName: user.fullName,
          role: membership.role,
          joinedAt: membership.joinedAt,
        });
      }
    }

    return membersList;
  }

  async getMemberRole(orgId: string, userId: string): Promise<OrgRole | null> {
    const member = await this.memberRepository.findOne({
      where: { orgId, userId },
    });

    return member ? member.role : null;
  }

  async sendAccessOtp(
    orgId: string,
    userId: string,
  ): Promise<{ success: boolean }> {
    const user = await this.usersService.usersRepository.findOneBy({
      id: userId,
    });
    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    const isMember = await this.getMemberRole(orgId, userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const redisKey = `org_otp:${userId}:${orgId}`;
    await this.redisService.set(redisKey, code, 300);

    const org = await this.orgRepository.findOneBy({ id: orgId });
    const orgName = org ? org.name : 'Unknown Workspace';

    this.mailService
      .sendWorkspaceAccessOtp(user.email, orgName, code)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Deferred workspace access email send failed: ${msg}`);
      });

    return { success: true };
  }

  async verifyAccessOtp(
    orgId: string,
    userId: string,
    code: string,
  ): Promise<{ success: boolean; message: string }> {
    const redisKey = `org_otp:${userId}:${orgId}`;
    const cachedCode = await this.redisService.get(redisKey);

    if (!cachedCode || cachedCode !== code) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    await this.redisService.del(redisKey);

    const log = this.auditLogRepository.create({
      userId,
      action: 'ORG_WORKSPACE_SWITCH',
      metadata: { org_id: orgId },
    });
    await this.auditLogRepository.save(log);

    return {
      success: true,
      message: 'Access verified successfully.',
    };
  }

  async findOneBySlug(slug: string): Promise<Organization> {
    const org = await this.orgRepository.findOne({ where: { slug } });
    if (!org) {
      throw new NotFoundException(`Organization with slug '${slug}' not found`);
    }
    return org;
  }

  async updateOrganization(
    orgId: string,
    requesterId: string,
    payload: {
      name?: string;
      description?: string | null;
      avatarUrl?: string | null;
    },
  ): Promise<Organization> {
    const role = await this.getMemberRole(orgId, requesterId);
    if (role !== OrgRole.OWNER) {
      throw new ForbiddenException(
        'Only organization owners can edit settings',
      );
    }

    const org = await this.orgRepository.findOne({ where: { id: orgId } });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    if (payload.name && payload.name.trim() !== org.name) {
      const existingName = await this.orgRepository.findOne({
        where: { name: payload.name.trim() },
      });
      if (existingName) {
        throw new ConflictException('Organization name already taken');
      }
      org.name = payload.name.trim();
    }

    if (payload.description !== undefined) {
      org.description = payload.description?.trim() || null;
    }

    if (payload.avatarUrl !== undefined) {
      org.avatarUrl = payload.avatarUrl?.trim() || null;
    }

    return this.orgRepository.save(org);
  }

  async uploadOrganizationLogo(
    orgId: string,
    requesterId: string,
    file: Express.Multer.File,
  ): Promise<Organization> {
    if (!file) {
      throw new BadRequestException('Logo image is required');
    }

    const role = await this.getMemberRole(orgId, requesterId);
    if (role !== OrgRole.OWNER) {
      throw new ForbiddenException(
        'Only organization owners can update the logo',
      );
    }

    const org = await this.orgRepository.findOne({ where: { id: orgId } });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const objectName = `organizations/${org.slug}/branding/${Date.now()}-${safeName}`;
    await this.minioService.uploadFile(objectName, file.path, file.mimetype);
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    org.avatarUrl = await this.minioService.getFileUrl(objectName);

    return this.orgRepository.save(org);
  }

  async listOrganizationModels(
    orgId: string,
    requesterId: string,
  ): Promise<Model[]> {
    const requesterRole = await this.getMemberRole(orgId, requesterId);
    if (!requesterRole) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    return this.dataSource.getRepository(Model).find({
      where: { organization: { id: orgId } },
      relations: [
        'organization',
        'user',
        'versions',
        'versions.uploadedBy',
        'versions.reviewedBy',
        'versions.testCases',
        'versions.deployments',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async getOrgStats(orgId: string) {
    const org = await this.orgRepository.findOne({ where: { id: orgId } });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const memberCount = await this.memberRepository.count({
      where: { orgId },
    });

    const projectCount = await this.dataSource.getRepository(Project).count({
      where: { orgId, isActive: true },
    });

    const modelCount = await this.dataSource.getRepository(Model).count({
      where: { organization: { id: orgId } },
    });

    const consumerBalance = await this.walletsService.getBalance(
      orgId,
      OwnerType.ORG,
      WalletType.CONSUMER,
    );

    const totalEarnings = await this.walletsService.getBalance(
      orgId,
      OwnerType.ORG,
      WalletType.PROVIDER,
    );

    const now = new Date();

    const members = await this.memberRepository.find({
      where: { orgId },
      order: { joinedAt: 'ASC' },
    });
    const membersTrend: Array<{ value: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const limit = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const count = members.filter((m) => m.joinedAt <= limit).length;
      membersTrend.push({ value: count });
    }

    const projects = await this.dataSource.getRepository(Project).find({
      where: { orgId, isActive: true },
      order: { createdAt: 'ASC' },
    });
    const projectsTrend: Array<{ value: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const limit = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const count = projects.filter((p) => p.createdAt <= limit).length;
      projectsTrend.push({ value: count });
    }

    const models = await this.dataSource.getRepository(Model).find({
      where: { organization: { id: orgId } },
      order: { createdAt: 'ASC' },
    });
    const modelsTrend: Array<{ value: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const limit = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const count = models.filter((m) => m.createdAt <= limit).length;
      modelsTrend.push({ value: count });
    }

    const consumerWallet = await this.dataSource.getRepository(Wallet).findOne({
      where: {
        ownerId: orgId,
        ownerType: OwnerType.ORG,
        walletType: WalletType.CONSUMER,
      },
    });
    const balanceTrend: Array<{ value: number }> = [];
    if (consumerWallet) {
      const transactions = await this.dataSource
        .getRepository(Transaction)
        .find({
          where: {
            walletId: consumerWallet.id,
            status: TransactionStatus.COMPLETED,
          },
          order: { createdAt: 'ASC' },
        });

      let currentTrack = Number(consumerWallet.balance);
      const monthlyBalances = new Map<string, number>();

      const sortedTx = [...transactions].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );
      const currentMonthKey = now.toISOString().slice(0, 7);
      monthlyBalances.set(currentMonthKey, currentTrack);

      for (const tx of sortedTx) {
        const txMonth = tx.createdAt.toISOString().slice(0, 7);
        const amount = Number(tx.amount);
        if (tx.type === TransactionType.CREDIT) {
          currentTrack -= amount;
        } else {
          currentTrack += amount;
        }
        if (!monthlyBalances.has(txMonth)) {
          monthlyBalances.set(txMonth, currentTrack);
        }
      }

      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toISOString().slice(0, 7);
        let val = monthlyBalances.get(key);
        if (val === undefined) {
          const searchDate = new Date(d);
          while (val === undefined) {
            searchDate.setMonth(searchDate.getMonth() - 1);
            const searchKey = searchDate.toISOString().slice(0, 7);
            val = monthlyBalances.get(searchKey);
            if (searchDate.getFullYear() < 2020) {
              val = 0;
              break;
            }
          }
        }
        balanceTrend.push({ value: val });
      }
    } else {
      for (let i = 0; i < 6; i++) {
        balanceTrend.push({ value: 0 });
      }
    }

    const providerWallet = await this.dataSource.getRepository(Wallet).findOne({
      where: {
        ownerId: orgId,
        ownerType: OwnerType.ORG,
        walletType: WalletType.PROVIDER,
      },
    });
    const earningsTrend: Array<{ value: number }> = [];
    if (providerWallet) {
      const transactions = await this.dataSource
        .getRepository(Transaction)
        .find({
          where: {
            walletId: providerWallet.id,
            status: TransactionStatus.COMPLETED,
          },
          order: { createdAt: 'ASC' },
        });

      let currentTrack = Number(providerWallet.balance);
      const monthlyBalances = new Map<string, number>();

      const sortedTx = [...transactions].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );
      const currentMonthKey = now.toISOString().slice(0, 7);
      monthlyBalances.set(currentMonthKey, currentTrack);

      for (const tx of sortedTx) {
        const txMonth = tx.createdAt.toISOString().slice(0, 7);
        const amount = Number(tx.amount);
        if (tx.type === TransactionType.CREDIT) {
          currentTrack -= amount;
        } else {
          currentTrack += amount;
        }
        if (!monthlyBalances.has(txMonth)) {
          monthlyBalances.set(txMonth, currentTrack);
        }
      }

      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toISOString().slice(0, 7);
        let val = monthlyBalances.get(key);
        if (val === undefined) {
          const searchDate = new Date(d);
          while (val === undefined) {
            searchDate.setMonth(searchDate.getMonth() - 1);
            const searchKey = searchDate.toISOString().slice(0, 7);
            val = monthlyBalances.get(searchKey);
            if (searchDate.getFullYear() < 2020) {
              val = 0;
              break;
            }
          }
        }
        earningsTrend.push({ value: val });
      }
    } else {
      for (let i = 0; i < 6; i++) {
        earningsTrend.push({ value: 0 });
      }
    }

    return {
      memberCount,
      projectCount,
      modelCount,
      consumerBalance,
      totalEarnings,
      trends: {
        members: membersTrend,
        projects: projectsTrend,
        models: modelsTrend,
        balance: balanceTrend,
        earnings: earningsTrend,
      },
    };
  }
}
