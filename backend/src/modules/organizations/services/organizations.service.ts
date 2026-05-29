import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../entities/organization.entity';
import { OrgMember } from '../entities/org-member.entity';
import { UsersService } from '../../users/services/users.service';
import { WalletsService } from '../../wallets/services/wallets.service';
import { OrgRole } from '../../../shared/enums/org-role.enum';
import { OrgMemberStatus } from '../../../shared/enums/org-member-status.enum';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { WalletType } from '../../../shared/enums/wallet-type.enum';

/**
 * Service managing workspaces / organizations creation, collaborator enrollment,
 * membership context permissions, and wallets initializations.
 */
@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepository: Repository<Organization>,
    @InjectRepository(OrgMember)
    private readonly memberRepository: Repository<OrgMember>,
    private readonly usersService: UsersService,
    private readonly walletsService: WalletsService,
  ) {}

  /**
   * Registers a new organization workspace.
   * Initializes both CONSUMER and PROVIDER wallets for the organization.
   * Registers the owner user as the primary OWNER member.
   *
   * @param name - Display name of the organization.
   * @param slug - Unique URL slug.
   * @param ownerUserId - UUID of the creator.
   * @returns Fully created Organization.
   * @throws {ConflictException} If slug is already registered.
   */
  async createOrganization(
    name: string,
    slug: string,
    ownerUserId: string,
  ): Promise<Organization> {
    const existing = await this.orgRepository.findOne({ where: { slug } });
    if (existing) {
      throw new ConflictException('Organization slug is already in use');
    }

    const org = this.orgRepository.create({
      name,
      slug,
      ownerUserId,
      isProvider: true, // Organizations are dual-role providers by default
    });

    const savedOrg = await this.orgRepository.save(org);

    // Create Owner membership
    const ownerMember = this.memberRepository.create({
      orgId: savedOrg.id,
      userId: ownerUserId,
      role: OrgRole.OWNER,
      status: OrgMemberStatus.ACTIVE,
    });
    await this.memberRepository.save(ownerMember);

    // Initialize organization wallets
    await this.walletsService.createWallet(
      savedOrg.id,
      OwnerType.ORG,
      WalletType.CONSUMER,
      100.0,
    ); // Give 100.00 credits to start
    await this.walletsService.createWallet(savedOrg.id, OwnerType.ORG, WalletType.PROVIDER, 0.0);

    return savedOrg;
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
      where: { userId, status: OrgMemberStatus.ACTIVE },
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

  /**
   * Invites a new collaborator to the organization using their email.
   *
   * @param slug - Parent organization slug.
   * @param email - Target user email.
   * @param role - Access role.
   * @returns Newly created membership.
   * @throws {NotFoundException} If user or organization is not found.
   * @throws {ConflictException} If user is already a member.
   */
  async inviteMember(
    slug: string,
    email: string,
    role: OrgRole,
  ): Promise<OrgMember> {
    const org = await this.orgRepository.findOne({ where: { slug } });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      throw new NotFoundException(`User with email '${email}' not found`);
    }

    const existingMember = await this.memberRepository.findOne({
      where: { orgId: org.id, userId: user.id },
    });

    if (existingMember) {
      throw new ConflictException(
        'User is already a member of this organization',
      );
    }

    const member = this.memberRepository.create({
      orgId: org.id,
      userId: user.id,
      role,
      status: OrgMemberStatus.ACTIVE, // Automatically approve memberships for seamless testing
    });

    return this.memberRepository.save(member);
  }

  /**
   * Lists all active members of an organization.
   *
   * @param slug - Target organization slug.
   * @returns Array of members with email and username context.
   */
  async listMembers(slug: string): Promise<unknown[]> {
    const org = await this.orgRepository.findOne({ where: { slug } });
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
          id: membership.id,
          userId: user.id,
          email: user.email,
          username: user.username,
          role: membership.role,
          status: membership.status,
          createdAt: membership.createdAt,
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
      where: { orgId, userId, status: OrgMemberStatus.ACTIVE },
    });

    return member ? member.role : null;
  }
}
