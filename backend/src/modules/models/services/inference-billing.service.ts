import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Model } from '../entities/model.entity';
import { User } from '../../users/entities/user.entity';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { Transaction } from '../../wallets/entities/transaction.entity';
import { SystemConfig } from '../../wallets/entities/system-config.entity';
import { TransactionType } from '../../wallets/enums/transaction-type.enum';
import { TransactionStatus } from '../../wallets/enums/transaction-status.enum';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { WalletType } from '../../../shared/enums/wallet-type.enum';
import { PredictionActor } from '../interfaces/inference.interface';

const SYSTEM_OWNER_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Moves credits for a single successful prediction call: debits the consumer
 * wallet, credits the model owner's provider wallet in EGP, and credits the
 * platform's commission share. Runs as one DB transaction per call.
 */
@Injectable()
export class InferenceBillingService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Charges the consumer and pays out the provider/platform shares for one
   * successful inference call. Failures are caught and logged — billing
   * errors never fail the prediction response since the caller already
   * received their result.
   *
   * @param model - The model that was called.
   * @param cost - The credit cost already validated against the consumer balance.
   * @param providerSharePercent - The percentage of the cost owed to the provider.
   * @param actor - The caller whose workspace wallet is debited.
   */
  async chargeForInference(
    model: Model,
    cost: number,
    providerSharePercent: number,
    actor: PredictionActor,
  ): Promise<void> {
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

      await queryRunner.manager.query(
        `UPDATE wallets SET balance = balance - $1 WHERE owner_id = $2 AND owner_type = $3 AND wallet_type = $4`,
        [cost, actor.workspaceId, actor.workspaceType, WalletType.CONSUMER],
      );

      const consumerWallet = await queryRunner.manager.findOne(Wallet, {
        where: {
          ownerId: actor.workspaceId,
          ownerType: actor.workspaceType,
          walletType: WalletType.CONSUMER,
        },
      });
      if (consumerWallet) {
        await queryRunner.manager.save(
          Transaction,
          queryRunner.manager.create(Transaction, {
            walletId: consumerWallet.id,
            type: TransactionType.DEBIT,
            amount: cost,
            reference: `Inference debit for model: ${model.name}`,
            status: TransactionStatus.COMPLETED,
          }),
        );
      }

      let config = await queryRunner.manager.findOne(SystemConfig, {
        where: { key: 'credits_per_egp' },
      });
      if (!config) {
        config = await queryRunner.manager.findOne(SystemConfig, {
          where: { key: 'credits_per_usd' },
        });
      }
      const creditsPerEgp = config ? parseInt(config.value, 10) || 10 : 10;
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
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('[Billing Error] Rollback transaction:', error);
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Credits a provider-type wallet for a given owner, creating it on first use.
   */
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
}
