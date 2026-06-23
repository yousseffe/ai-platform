import {
  Controller,
  Get,
  Query,
  UseGuards,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Wallet } from '../entities/wallet.entity';
import { Transaction } from '../entities/transaction.entity';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { WalletType } from '../../../shared/enums/wallet-type.enum';

/**
 * Controller exposing endpoints for checking personal consumer wallet balances and paginated transaction history.
 */
@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  /**
   * Retrieves balance and currency details for the active user's personal CONSUMER wallet.
   *
   * @param req - Request carrying authenticated user context.
   * @returns Personal wallet configuration.
   */
  @Get()
  async getWallet(
    @Req() req: Record<string, unknown> & { user: { id: string } },
  ) {
    const wallet = await this.walletRepository.findOne({
      where: {
        ownerId: req.user.id,
        ownerType: OwnerType.USER,
        walletType: WalletType.CONSUMER,
      },
    });

    if (!wallet) {
      throw new NotFoundException('Personal consumer wallet not found');
    }

    return {
      id: wallet.id,
      balance: wallet.balance,
      currency: wallet.currency,
      created_at: wallet.createdAt,
    };
  }

  /**
   * Retrieves a paginated history list of transactions associated with the user's personal wallet.
   *
   * @param req - Request carrying user details.
   * @param page - Query page index selector (default 1).
   * @param limit - Count of items per page limit selector (default 20).
   * @returns Paginated list of ledger transaction records.
   */
  @Get('transactions')
  async getTransactions(
    @Req() req: Record<string, unknown> & { user: { id: string } },
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const wallet = await this.walletRepository.findOne({
      where: {
        ownerId: req.user.id,
        ownerType: OwnerType.USER,
        walletType: WalletType.CONSUMER,
      },
    });

    if (!wallet) {
      throw new NotFoundException('Personal consumer wallet not found');
    }

    const pageNum = parseInt(page as any) || 1;
    const limitNum = parseInt(limit as any) || 20;

    const [transactions, total] = await this.transactionRepository.findAndCount(
      {
        where: { walletId: wallet.id },
        order: { createdAt: 'DESC' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      },
    );

    return {
      success: true,
      data: transactions,
      total,
      page: pageNum,
      limit: limitNum,
    };
  }
}
