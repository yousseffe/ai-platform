import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { User } from '../../users/entities/user.entity';
import { OwnerType } from '../../../shared/enums/owner-type.enum';

interface CustomRequest extends Request {
  user?: User;
  workspaceId?: string;
  workspaceType?: OwnerType;
}

/**
 * Interceptor that parses and resolves active workspace context from the custom `X-Workspace-Id` HTTP header.
 * Adds resolved parameters `workspaceId` and `workspaceType` to the HTTP Request context.
 */
@Injectable()
export class WorkspaceInterceptor implements NestInterceptor {
  /**
   * Resolves the workspace details and binds them to the request payload.
   *
   * @param context - Execution context details.
   * @param next - Call pipeline handler.
   * @returns Observable returning request downstream execution.
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<CustomRequest>();
    const user = request.user;

    const workspaceIdHeader =
      typeof request.headers['x-workspace-id'] === 'string'
        ? request.headers['x-workspace-id']
        : undefined;

    if (!user) {
      // If endpoint is unauthenticated, skip workspace context parsing
      return next.handle();
    }

    if (request.workspaceId && request.workspaceType) {
      return next.handle();
    }

    // Default workspace context: Individual User
    let workspaceId = user.id;
    let workspaceType: OwnerType = OwnerType.USER;

    if (workspaceIdHeader && workspaceIdHeader !== user.id) {
      workspaceId = workspaceIdHeader;
      workspaceType = OwnerType.ORG;
    }

    request.workspaceId = workspaceId;
    request.workspaceType = workspaceType;

    return next.handle();
  }
}
