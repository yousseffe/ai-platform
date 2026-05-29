import { Controller, Post, UseGuards, Req } from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

/**
 * Controller handling user-specific settings and state actions.
 */
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Enrolls the user's individual account to act as a Provider.
   * Initializes a PROVIDER wallet for this user.
   *
   * @param req - Request envelope carrying authenticated user details.
   * @returns Updated User profile.
   */
  @Post('enable-provider')
  async enableProvider(
    @Req() req: Record<string, unknown> & { user: { id: string } },
  ) {
    return this.usersService.enableProvider(req.user.id);
  }
}
