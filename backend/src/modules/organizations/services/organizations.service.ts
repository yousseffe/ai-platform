import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Organization } from '../entities/organization.entity';
import { OrgMember } from '../entities/org-member.entity';
import { UsersService } from '../../users/services/users.service';
import { WalletsService } from '../../wallets/services/wallets.service';
import { AuditLog } from '../../users/entities/audit-log.entity';
import { OrgRole } from '../../../shared/enums/org-role.enum';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { WalletType } from '../../../shared/enums/wallet-type.enum';
import { OrgStatus } from '../enums/org-status.enum';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { SystemConfig } from '../../wallets/entities/system-config.entity';
import { Transaction } from '../../wallets/entities/transaction.entity';
import { TransactionType } from '../../wallets/enums/transaction-type.enum';
import { TransactionStatus } from '../../wallets/enums/transaction-status.enum';
import { RedisService } from '../../../shared/redis/redis.service';

/**
 * Service managing workspaces / organizations creation, collaborator enrollment,
 * membership context permissions, and wallets initializations.
 */
@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    public readonly orgRepository: Repository<Organization>,
    @InjectRepository(OrgMember)
    private readonly memberRepository: Repository<OrgMember>,
    private readonly usersService: UsersService,
    private readonly walletsService: WalletsService,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly redisService: RedisService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Registers a new organization workspace.
   * Atomically initializes both organization and its PROVIDER wallet in a transaction.
   * Registers the creator user as the primary OWNER member.
   *
   * @param name - Display name of the organization.
   * @param slug - Unique URL slug. Optional, auto-generated from name if omitted.
   * @param ownerUserId - UUID of the creator.
   * @returns Fully created Organization schema payload.
   * @throws {ConflictException} If name or slug is already registered.
   */
  async createOrganization(
    name: string,
    slug: string | undefined,
    ownerUserId: string,
    collaborators: Array<{ email: string; role: OrgRole }> = [],
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
      // Fetch org creation fee from system config
      const configEntity = await queryRunner.manager.findOne(SystemConfig, {
        where: { key: 'org_creation_fee' },
      });
      const orgCreationFee = configEntity ? parseFloat(configEntity.value) : 50.00;

      // 1. Get creator consumer wallet
      const creatorWallet = await queryRunner.manager.findOne(Wallet, {
        where: { ownerId: ownerUserId, ownerType: OwnerType.USER, walletType: WalletType.CONSUMER },
      });

      if (!creatorWallet) {
        throw new BadRequestException('Creator wallet not initialized');
      }

      const balance = typeof creatorWallet.balance === 'string' ? parseFloat(creatorWallet.balance) : creatorWallet.balance;

      if (balance < orgCreationFee) {
        throw new BadRequestException(`Insufficient balance to create organization. Fee is ${orgCreationFee} credits.`);
      }

      // 2. Deduct fee from creator consumer wallet
      creatorWallet.balance = balance - orgCreationFee;
      await queryRunner.manager.save(Wallet, creatorWallet);

      // Log Debit Transaction
      const debitTx = queryRunner.manager.create(Transaction, {
        walletId: creatorWallet.id,
        type: TransactionType.DEBIT,
        amount: orgCreationFee,
        reference: `Organization creation fee: ${name}`,
        status: TransactionStatus.COMPLETED,
      });
      await queryRunner.manager.save(Transaction, debitTx);

      // 3. Pay Platform Admin
      const systemOwnerId = '00000000-0000-0000-0000-000000000000';
      let systemWallet = await queryRunner.manager.findOne(Wallet, {
        where: { ownerId: systemOwnerId, ownerType: OwnerType.USER, walletType: WalletType.CONSUMER },
      });

      if (!systemWallet) {
        systemWallet = queryRunner.manager.create(Wallet, {
          walletType: WalletType.CONSUMER,
          ownerType: OwnerType.USER,
          ownerId: systemOwnerId,
          balance: 0.0,
          currency: 'CREDITS',
        });
        await queryRunner.manager.save(Wallet, systemWallet);
      }

      const systemBalance = typeof systemWallet.balance === 'string' ? parseFloat(systemWallet.balance) : systemWallet.balance;
      systemWallet.balance = systemBalance + orgCreationFee;
      await queryRunner.manager.save(Wallet, systemWallet);

      const platformTx = queryRunner.manager.create(Transaction, {
        walletId: systemWallet.id,
        type: TransactionType.CREDIT,
        amount: orgCreationFee,
        reference: `Platform commission for organization creation: ${name}`,
        status: TransactionStatus.COMPLETED,
      });
      await queryRunner.manager.save(Transaction, platformTx);

      const org = queryRunner.manager.create(Organization, {
        name,
        slug: formattedSlug,
        createdBy: ownerUserId,
        status: OrgStatus.ACTIVE,
      });
      const savedOrg = await queryRunner.manager.save(Organization, org);

      const wallet = queryRunner.manager.create(Wallet, {
        walletType: WalletType.PROVIDER,
        ownerType: OwnerType.ORG,
        ownerId: savedOrg.id,
        balance: 0.0,
        currency: 'CREDITS',
      });
      const savedWallet = await queryRunner.manager.save(Wallet, wallet);

      savedOrg.walletId = savedWallet.id;
      await queryRunner.manager.save(Organization, savedOrg);

      const ownerMember = queryRunner.manager.create(OrgMember, {
        orgId: savedOrg.id,
        userId: ownerUserId,
        role: OrgRole.OWNER,
      });
      await queryRunner.manager.save(OrgMember, ownerMember);

      // Process collaborator invitations inside the same transaction
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

      await queryRunner.commitTransaction();

      // Log audit
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
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Retrieves the current system organization creation fee.
   *
   * @returns The fee configuration.
   */
  async getOrgCreationFee(): Promise<number> {
    const configEntity = await this.dataSource.getRepository(SystemConfig).findOne({
      where: { key: 'org_creation_fee' },
    });
    return configEntity ? parseFloat(configEntity.value) : 50.00;
  }

  /**
   * Retrieves user membership list.
   *
   * @param userId - UUID of the target user.
   * @returns An array containing organizations and their matching user roles.
   */
  async findUserOrganizations(
    userId: string,
  ): Promise<Array<Organization & { userRole: OrgRole }>> {
    const memberships = await this.memberRepository.find({
      where: { userId },
    });

    const orgIds = memberships.map((m) => m.orgId);
    if (orgIds.length === 0) return [];

    const orgs = await this.orgRepository.findByIds(orgIds);

    return orgs.map((org) => {
      const membership = memberships.find((m) => m.orgId === org.id);
      return {
        ...org,
        userRole: membership ? membership.role : OrgRole.VIEWER,
      };
    });
  }

  /**
   * Invites a new collaborator to the organization using their email.
   * Enforces role escalation and owner assignment protections.
   *
   * @param orgId - Parent organization ID.
   * @param email - Target user email.
   * @param role - Access role.
   * @param requesterId - UUID of actor.
   * @returns Newly created membership.
   * @throws {NotFoundException | ConflictException | ForbiddenException} Based on rules.
   */
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

    // Role Escalation Check: cannot assign role above own level
    if (requesterMember.role === OrgRole.MAINTAINER && role === OrgRole.OWNER) {
      throw new ForbiddenException('Insufficient permissions');
    }

    // OWNER transfer rule check
    if (role === OrgRole.OWNER) {
      throw new BadRequestException('Use transfer ownership flow');
    }

    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      throw new BadRequestException('User not found with this email');
    }

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

    // Audit invite
    const log = this.auditLogRepository.create({
      userId: requesterId,
      action: 'MEMBER_INVITE',
      metadata: { org_id: orgId, invited_user_id: user.id, role },
    });
    await this.auditLogRepository.save(log);

    return savedMember;
  }

  /**
   * Removes a collaborator from the organization.
   * Enforces Last Owner protection.
   *
   * @param orgId - Parent organization ID.
   * @param userId - Target user ID to remove.
   * @param requesterId - UUID of actor.
   * @returns Confirmation.
   * @throws {NotFoundException | ForbiddenException | BadRequestException} Based on rules.
   */
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

    // Last Owner Protection
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

    // Audit removal
    const log = this.auditLogRepository.create({
      userId: requesterId,
      action: 'MEMBER_REMOVE',
      metadata: { org_id: orgId, removed_user_id: userId },
    });
    await this.auditLogRepository.save(log);

    return { success: true };
  }

  /**
   * Modifies a collaborator's role in the organization.
   *
   * @param orgId - Parent organization ID.
   * @param userId - Target user ID.
   * @param role - Target new role.
   * @param requesterId - UUID of actor.
   * @returns Updated membership.
   */
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

    // Escalation block
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

    // Audit role update
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

  /**
   * Lists all active members of an organization.
   *
   * @param orgId - Target organization ID.
   * @returns Array of members with email and username context.
   */
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

  /**
   * Resolves the member role of a user in a specific organization.
   *
   * @param orgId - Parent organization ID.
   * @param userId - Member user ID.
   * @returns The active role, or null if not a member.
   */
  async getMemberRole(orgId: string, userId: string): Promise<OrgRole | null> {
    const member = await this.memberRepository.findOne({
      where: { orgId, userId },
    });

    return member ? member.role : null;
  }

  /**
   * Initiates switcher challenge, generating access OTP.
   *
   * @param orgId - Target org ID.
   * @param userId - Requesting user ID.
   * @returns Success signal.
   */
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
    await this.redisService.set(redisKey, code, 300); // 5 minutes expiration

    console.log('\n----------------------------------------');
    console.log(
      `[Workspace-Access-Mock] OTP sent to User ID: ${userId} (${user.email})`,
    );
    console.log(
      `[Workspace-Access-Mock] Access Verification Code (OTP): ${code}`,
    );
    console.log('----------------------------------------\n');

    return { success: true };
  }

  /**
   * Confirms access OTP code validity.
   *
   * @param orgId - Target org ID.
   * @param userId - Requesting user ID.
   * @param code - Input 6-digit code.
   * @returns Verification confirmation.
   */
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

    // Audit switch
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

  /**
   * Returns a single organization by its slug.
   *
   * @param slug - The unique URL identifier.
   * @returns The Organization record.
   * @throws {NotFoundException} If the organization is not found.
   */
  async findOneBySlug(slug: string): Promise<Organization> {
    const org = await this.orgRepository.findOne({ where: { slug } });
    if (!org) {
      throw new NotFoundException(`Organization with slug '${slug}' not found`);
    }
    return org;
  }
}
