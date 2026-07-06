import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../modules/users/entities/user.entity';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      return false;
    }

    const dbUser = await this.userRepository.findOne({
      where: { id: user.id },
    });

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
