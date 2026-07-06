import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { User } from '../../modules/users/entities/user.entity';
import { OwnerType } from '../enums/owner-type.enum';

interface CustomRequest extends Request {
  user?: User;
  workspaceId?: string;
  workspaceType?: OwnerType;
}

@Injectable()
export class WorkspaceInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<CustomRequest>();
    const user = request.user;

    const workspaceIdHeader =
      typeof request.headers['x-workspace-id'] === 'string'
        ? request.headers['x-workspace-id']
        : undefined;

    if (!user) {
      return next.handle();
    }

    if (request.workspaceId && request.workspaceType) {
      return next.handle();
    }

    let workspaceId = user.id;
    let workspaceType: OwnerType = OwnerType.USER;

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (
      workspaceIdHeader &&
      uuidRegex.test(workspaceIdHeader) &&
      workspaceIdHeader !== user.id
    ) {
      workspaceId = workspaceIdHeader;
      workspaceType = OwnerType.ORG;
    }

    request.workspaceId = workspaceId;
    request.workspaceType = workspaceType;

    return next.handle();
  }
}
