import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Model } from '../../models/entities/model.entity';
import { User } from '../../users/entities/user.entity';
import { TransactionStatus, TransactionType } from '../../wallets';
import { SystemConfig } from '../../wallets/entities/system-config.entity';
import { Transaction } from '../../wallets/entities/transaction.entity';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { WalletType } from '../../../shared/enums/wallet-type.enum';
import { PredictionActor } from '../interfaces/inference.interface';

const SYSTEM_OWNER_ID = '00000000-0000-0000-0000-000000000000';

interface ReturningIdRow {
  id: string;
}

@Injectable()
export class InferenceBillingService {
  constructor(private readonly dataSource: DataSource) {}

  async chargeForInference(
    model: Model,
    cost: number,
    providerSharePercent: number,
    actor: PredictionActor,
  ): Promise<void> {
    if (!Number.isFinite(cost) || cost <= 0) {
      return;
    }
    if (
      !Number.isFinite(providerSharePercent) ||
      providerSharePercent < 0 ||
      providerSharePercent > 100
    ) {
      throw new BadRequestException('Invalid provider share percentage');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const callerUser = actor.orgApiKeyId
        ? null
        : await queryRunner.manager.findOne(User, {
            where: { id: actor.userId },
          });
      const callerEmail =
        callerUser?.email ||
        actor.orgApiKeyLabel ||
        actor.email ||
        'Organization API Key';

      let debitRows = this.extractReturningRows<ReturningIdRow>(
        await queryRunner.manager.query(
          `UPDATE wallets
         SET balance = balance - $1
         WHERE owner_id = $2
           AND owner_type = $3
           AND wallet_type = $4
           AND balance >= $1
         RETURNING id`,
          [cost, actor.workspaceId, actor.workspaceType, WalletType.CONSUMER],
        ),
      );
      if (
        debitRows.length === 0 &&
        !actor.orgApiKeyId &&
        actor.workspaceId !== actor.userId
      ) {
        debitRows = this.extractReturningRows<ReturningIdRow>(
          await queryRunner.manager.query(
            `UPDATE wallets
            SET balance = balance - $1
            WHERE owner_id = $2
              AND owner_type = $3
              AND wallet_type = $4
              AND balance >= $1
            RETURNING id`,
            [cost, actor.userId, OwnerType.USER, WalletType.CONSUMER],
          ),
        );
      }

      const debitedWalletId = debitRows[0]?.id;
      if (!debitedWalletId) {
        throw new BadRequestException(
          'Insufficient credits to perform prediction',
        );
      }

      await queryRunner.manager.save(
        Transaction,
        queryRunner.manager.create(Transaction, {
          walletId: debitedWalletId,
          type: TransactionType.DEBIT,
          amount: cost,
          reference: `Inference debit for model: ${model.name}`,
          status: TransactionStatus.COMPLETED,
        }),
      );

      let config = await queryRunner.manager.findOne(SystemConfig, {
        where: { key: 'credits_per_egp' },
      });
      if (!config) {
        config = await queryRunner.manager.findOne(SystemConfig, {
          where: { key: 'credits_per_usd' },
        });
      }
      const configuredCreditsPerEgp = config ? Number(config.value) : 10;
      const creditsPerEgp =
        Number.isFinite(configuredCreditsPerEgp) && configuredCreditsPerEgp > 0
          ? configuredCreditsPerEgp
          : 10;
      const costInEgp = cost / creditsPerEgp;
      const providerShareEgp = costInEgp * (providerSharePercent / 100);

      await queryRunner.manager.query(
        `UPDATE models SET total_earnings = total_earnings + $1 WHERE id = $2`,
        [providerShareEgp, model.id],
      );

      const providerWalletOwnerId = model.organization?.id ?? model.user.id;
      const providerWalletOwnerType = model.organization
        ? OwnerType.ORG
        : OwnerType.USER;
      const revenueRecipientLabel =
        model.organization?.name ??
        model.user.email ??
        'Personal publishing workspace';

      await this.creditWallet(
        queryRunner.manager,
        providerWalletOwnerId,
        providerWalletOwnerType,
        providerShareEgp,
        `Inference revenue share for model: ${model.name} to ${revenueRecipientLabel} from ${callerEmail} (EGP ${providerShareEgp.toFixed(4)})`,
      );

      const platformShareEgp = costInEgp - providerShareEgp;
      if (platformShareEgp > 0) {
        await this.creditWallet(
          queryRunner.manager,
          SYSTEM_OWNER_ID,
          OwnerType.USER,
          platformShareEgp,
          `Platform commission for model: ${model.name} from call by user ${callerEmail} (EGP ${platformShareEgp.toFixed(4)})`,
        );
      }

      await queryRunner.commitTransaction();
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      console.error('[Billing Error] Rollback transaction:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async creditWallet(
    manager: EntityManager,
    ownerId: string,
    ownerType: OwnerType,
    amountEgp: number,
    reference: string,
  ): Promise<void> {
    let wallet = await manager.findOne(Wallet, {
      where: {
        ownerId,
        ownerType,
        walletType: WalletType.PROVIDER,
      },
    });
    if (!wallet) {
      wallet = manager.create(Wallet, {
        ownerId,
        ownerType,
        walletType: WalletType.PROVIDER,
        balance: 0.0,
        currency: 'EGP',
      });
      wallet = await manager.save(Wallet, wallet);
    }
    const currentBalance =
      typeof wallet.balance === 'string'
        ? parseFloat(wallet.balance)
        : wallet.balance;
    wallet.balance = currentBalance + amountEgp;
    await manager.save(Wallet, wallet);

    await manager.save(
      Transaction,
      manager.create(Transaction, {
        walletId: wallet.id,
        type: TransactionType.CREDIT,
        amount: amountEgp,
        reference,
        status: TransactionStatus.COMPLETED,
      }),
    );
  }

  private extractReturningRows<T>(result: unknown): T[] {
    if (Array.isArray(result)) {
      const [rows] = result;
      if (Array.isArray(rows) && typeof result[1] === 'number') {
        return rows as T[];
      }
      return result as T[];
    }

    if (result && typeof result === 'object') {
      const structured = result as { records?: unknown; raw?: unknown };
      if (Array.isArray(structured.records)) {
        return structured.records as T[];
      }
      if (structured.raw !== result) {
        return this.extractReturningRows<T>(structured.raw);
      }
    }

    return [];
  }
}
