import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { User } from '../../users/entities/user.entity';
import { OrganizationsService } from '../../organizations/services/organizations.service';
import { OrgRole } from '../../../shared/enums/org-role.enum';
import { OwnerType } from '../../../shared/enums/owner-type.enum';

export const REQUIRE_ORG_ROLE_KEY = 'requireOrgRole';

interface CustomRequest extends Request {
  user?: User;
  workspaceId?: string;
  workspaceType?: OwnerType;
}

/**
 * Decorator to require specific organization workspace roles for route executions.
 *
 * @param roles - Array of permitted workspace roles (e.g. OWNER, MAINTAINER).
 */
export const RequireOrgRole = (...roles: OrgRole[]) =>
  SetMetadata(REQUIRE_ORG_ROLE_KEY, roles);

/**
 * Guard that verifies if the user has the required organization role inside the active organization.
 */
@Injectable()
export class OrgRoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private orgsService: OrganizationsService,
  ) {}

  /**
   * Asserts workspace access rules before route invocation.
   *
   * @param context - Execution context helper.
   * @returns A promise resolving to a access allowed boolean.
   * @throws {ForbiddenException} If member permissions are invalid or missing.
   */
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

    // Individual workspaces are not restricted by organization roles
    if (workspaceType === OwnerType.USER) {
      return true;
    }

    const userRole = await this.orgsService.getMemberRole(workspaceId, user.id);
    if (!userRole) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    const hasRole = requiredRoles.includes(userRole);
    if (!hasRole) {
      throw new ForbiddenException('Insufficient workspace permissions');
    }

    return true;
  }
}
