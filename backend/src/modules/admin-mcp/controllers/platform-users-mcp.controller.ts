import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKeyOrJwtGuard } from '../../auth/guards/api-key-or-jwt.guard';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { User } from '../../users/entities/user.entity';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { WalletType } from '../../../shared/enums/wallet-type.enum';
import { OwnerType } from '../../../shared/enums/owner-type.enum';

/** Compact user profile summary with wallet balances. */
interface UserSummary {
  id: string;
  fullName: string;
  email: string;
  isAdmin: boolean;
  providerMode: boolean;
  status: string;
  createdAt: Date;
  consumerBalance: number;
  providerBalance: number;
}

/**
 * Read-only platform user registry consumed by the `admin_list_users` and
 * `admin_get_user` MCP tools. Mirrors `AdminController.getUsers()`/
 * `getUserDetails()` but is guarded for API-key/MCP-token access instead of
 * JWT-only, so it never grants those tokens write access to the mutating endpoint.
 */
@Controller('admin-mcp')
@UseGuards(ApiKeyOrJwtGuard, AdminGuard)
export class PlatformUsersMcpController {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
  ) {}

  /**
   * Lists every registered platform user with role flags and wallet balances.
   *
   * @returns User registry summary.
   */
  @Get('users')
  async listUsers(): Promise<UserSummary[]> {
    const users = await this.userRepository.find({
      order: { createdAt: 'DESC' },
    });
    return Promise.all(users.map((user) => this.summarizeUser(user)));
  }

  /**
   * Retrieves a single user's profile and wallet balances.
   *
   * @param id - User UUID.
   * @returns The user summary.
   * @throws {NotFoundException} If no user matches the given id.
   */
  @Get('users/:id')
  async getUser(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserSummary> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) throw new NotFoundException('User not found');
    return this.summarizeUser(user);
  }

  /**
   * Builds a compact user summary with consumer/provider wallet balances.
   *
   * @param user - The target user entity.
   * @returns The summarized user profile.
   */
  private async summarizeUser(user: User): Promise<UserSummary> {
    const [consumerWallet, providerWallet] = await Promise.all([
      this.walletRepository.findOne({
        where: {
          ownerId: user.id,
          ownerType: OwnerType.USER,
          walletType: WalletType.CONSUMER,
        },
      }),
      this.walletRepository.findOne({
        where: {
          ownerId: user.id,
          ownerType: OwnerType.USER,
          walletType: WalletType.PROVIDER,
        },
      }),
    ]);

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      isAdmin: user.isAdmin,
      providerMode: user.providerMode,
      status: user.status,
      createdAt: user.createdAt,
      consumerBalance: consumerWallet ? Number(consumerWallet.balance) || 0 : 0,
      providerBalance: providerWallet ? Number(providerWallet.balance) || 0 : 0,
    };
  }
}
