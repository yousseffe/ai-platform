import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { WalletType } from '../../../shared/enums/wallet-type.enum';
import { Model } from '../entities/model.entity';
import { User } from '../../users/entities/user.entity';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { Transaction } from '../../wallets/entities/transaction.entity';
import { SystemConfig } from '../../wallets/entities/system-config.entity';
import { TransactionType } from '../../wallets/enums/transaction-type.enum';
import { TransactionStatus } from '../../wallets/enums/transaction-status.enum';
import { PredictionActor } from '../interfaces/inference.interface';
import { InferenceBillingService } from './inference-billing.service';

const actor: PredictionActor = {
  userId: 'consumer-user-id',
  email: 'consumer@example.com',
  workspaceId: 'consumer-user-id',
  workspaceType: OwnerType.USER,
};

const model = {
  id: 'model-id',
  name: 'Revenue Model',
  user: { id: 'provider-user-id', email: 'provider@example.com' },
  organization: null,
} as unknown as Model;

interface FindOneOptionsStub {
  where?: {
    key?: string;
  };
}

interface WalletSaveStub {
  id?: string;
  ownerId?: string;
}

function createService(overrides?: {
  debitRows?: Array<{ id: string }>;
  creditsPerEgp?: string;
}) {
  const manager = {
    query: jest.fn((sql: string) => {
      if (sql.includes('UPDATE wallets')) {
        return Promise.resolve(
          overrides?.debitRows ?? [{ id: 'consumer-wallet-id' }],
        );
      }
      return Promise.resolve([]);
    }),
    findOne: jest.fn((entity: unknown, options: FindOneOptionsStub = {}) => {
      if (entity === User) {
        return Promise.resolve({ id: actor.userId, email: actor.email });
      }
      if (entity === SystemConfig && options.where?.key === 'credits_per_egp') {
        return Promise.resolve({
          key: 'credits_per_egp',
          value: overrides?.creditsPerEgp ?? '10',
        });
      }
      if (entity === Wallet) {
        return Promise.resolve(null);
      }
      return Promise.resolve(null);
    }),
    create: jest.fn(<T>(_entity: unknown, value: T): T => value),
    save: jest.fn((entity: unknown, value: WalletSaveStub) => {
      if (entity === Wallet && !value.id) {
        return Promise.resolve({
          ...value,
          id:
            value.ownerId === 'provider-user-id'
              ? 'provider-wallet-id'
              : 'platform-wallet-id',
        });
      }
      return Promise.resolve(value);
    }),
  };
  const queryRunner = {
    manager,
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
  };
  const dataSource = {
    createQueryRunner: jest.fn(() => queryRunner),
  } as unknown as DataSource;

  return {
    service: new InferenceBillingService(dataSource),
    manager,
    queryRunner,
  };
}

describe('InferenceBillingService', () => {
  it('debits consumer credits and credits provider/platform EGP shares', async () => {
    const { service, manager, queryRunner } = createService();

    await service.chargeForInference(model, 10, 80, actor);

    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining('balance >= $1'),
      [10, actor.workspaceId, actor.workspaceType, WalletType.CONSUMER],
    );
    expect(manager.save).toHaveBeenCalledWith(
      Transaction,
      expect.objectContaining({
        walletId: 'consumer-wallet-id',
        type: TransactionType.DEBIT,
        amount: 10,
        status: TransactionStatus.COMPLETED,
      }),
    );
    expect(manager.save).toHaveBeenCalledWith(
      Transaction,
      expect.objectContaining({
        walletId: 'provider-wallet-id',
        type: TransactionType.CREDIT,
        amount: 0.8,
      }),
    );
    expect(manager.save).toHaveBeenCalledWith(
      Transaction,
      expect.objectContaining({
        walletId: 'platform-wallet-id',
        type: TransactionType.CREDIT,
        amount: 0.19999999999999996,
      }),
    );
    expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
  });

  it('rolls back and does not credit anyone when the consumer debit fails', async () => {
    const { service, manager, queryRunner } = createService({ debitRows: [] });
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    try {
      await expect(
        service.chargeForInference(model, 10, 80, actor),
      ).rejects.toThrow(BadRequestException);

      expect(manager.save).not.toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});
