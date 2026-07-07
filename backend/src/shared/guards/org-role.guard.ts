import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { User } from '../../modules/users/entities/user.entity';
import { OrgMember } from '../../modules/organizations/entities/org-member.entity';
import { OrgRole } from '../enums/org-role.enum';
import { OwnerType } from '../enums/owner-type.enum';

export const REQUIRE_ORG_ROLE_KEY = 'requireOrgRole';

interface CustomRequest extends Request {
  user?: User;
  workspaceId?: string;
  workspaceType?: OwnerType;
}

export const RequireOrgRole = (...roles: OrgRole[]) =>
  SetMetadata(REQUIRE_ORG_ROLE_KEY, roles);

@Injectable()
export class OrgRoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(OrgMember)
    private readonly orgMemberRepository: Repository<OrgMember>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<OrgRole[]>(
      REQUIRE_ORG_ROLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<CustomRequest>();
    const user = request.user;
    const workspaceType = request.workspaceType;
    let workspaceId = request.workspaceId;

    if (!workspaceId && request.params) {
      const val = request.params.orgId || request.params.slug;
      workspaceId = Array.isArray(val) ? val[0] : val;
    }

    if (!user || !workspaceId) {
      return false;
    }

    if (workspaceType === OwnerType.USER) {
      return true;
    }

    const member = await this.orgMemberRepository.findOne({
      where: { orgId: workspaceId, userId: user.id },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    const hasRole = requiredRoles.includes(member.role);
    if (!hasRole) {
      throw new ForbiddenException('Insufficient workspace permissions');
    }

    return true;
  }
}
