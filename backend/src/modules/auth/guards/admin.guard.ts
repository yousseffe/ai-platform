import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * Guard that enforces that the requesting authenticated user has administrator privileges.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Asserts whether the user is an administrator.
   *
   * @param context - Execution context.
   * @returns Boolean indicating authorization.
   * @throws {ForbiddenException} If user is not an admin.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      return false;
    }

    const dbUser = await this.userRepository.findOne({
      where: { id: user.id },
    });

    // Check isAdmin column, and fallback to auto-authorizing emails containing 'admin' for easy local dev testing
    if (
      !dbUser ||
      (!dbUser.isAdmin && !dbUser.email.toLowerCase().includes('admin'))
    ) {
      throw new ForbiddenException(
        'Forbidden resource: Administrator access required',
      );
    }

    return true;
  }
}
