import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  ILike,
  In,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { ApiKeyOrJwtGuard } from '../../../shared/guards/api-key-or-jwt.guard';
import { AdminGuard } from '../../../shared/guards/admin.guard';
import { User } from '../../users/entities/user.entity';
import { Model } from '../../models/entities/model.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { Transaction } from '../../wallets/entities/transaction.entity';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { WalletType } from '../../../shared/enums/wallet-type.enum';

const PLATFORM_OWNER_ID = '00000000-0000-0000-0000-000000000000';

@Controller('admin-mcp')
@UseGuards(ApiKeyOrJwtGuard, AdminGuard)
export class PlatformStatsMcpController {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Model)
    private readonly modelRepository: Repository<Model>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  @Get('stats')
  async getStats(): Promise<{
    totalUsers: number;
    totalModels: number;
    totalOrganizations: number;
    platformBalance: number;
    platformCurrency: string;
  }> {
    const [totalUsers, totalModels, totalOrganizations] = await Promise.all([
      this.userRepository.count(),
      this.modelRepository.count(),
      this.organizationRepository.count(),
    ]);

    const platformWallet = await this.walletRepository.findOne({
      where: { ownerId: PLATFORM_OWNER_ID, walletType: WalletType.PROVIDER },
    });

    return {
      totalUsers,
      totalModels,
      totalOrganizations,
      platformBalance: platformWallet ? Number(platformWallet.balance) || 0 : 0,
      platformCurrency: platformWallet?.currency ?? 'EGP',
    };
  }

  @Get('transactions')
  async getTransactions(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('scope') scope: 'ALL' | 'SYSTEM_REVENUE' = 'ALL',
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
  ): Promise<{
    data: Transaction[];
    total: number;
    page: number;
    limit: number;
  }> {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
    const where: Record<string, unknown> = {};

    if (scope === 'SYSTEM_REVENUE') {
      const platformWallets = await this.walletRepository.find({
        where: { ownerId: PLATFORM_OWNER_ID },
      });
      const ids = platformWallets.map((w) => w.id);
      if (ids.length === 0) {
        return { data: [], total: 0, page: pageNum, limit: limitNum };
      }
      where.walletId = In(ids);
    }

    if (type && type !== 'ALL') where.type = type;

    if (startDate && endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt = Between(new Date(startDate), end);
    } else if (startDate) {
      where.createdAt = MoreThanOrEqual(new Date(startDate));
    } else if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt = LessThanOrEqual(end);
    }

    if (search) where.reference = ILike(`%${search}%`);

    const [data, total] = await this.transactionRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    });

    return { data, total, page: pageNum, limit: limitNum };
  }
}
