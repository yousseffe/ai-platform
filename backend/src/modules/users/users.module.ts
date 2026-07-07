import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { AuditLog } from './entities/audit-log.entity';
import { ApiKey } from '../auth/entities/api-key.entity';
import { Model } from '../models/entities/model.entity';
import { SystemConfig } from '../wallets/entities/system-config.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { WalletsModule } from '../wallets/wallets.module';
import { ProviderAccountsModule } from '../provider-accounts/provider-accounts.module';
import { UsersService } from './services/users.service';
import { UsersRepository } from './repositories/users.repository';
import { UsersController } from './controllers/users.controller';
import { AdminController } from './controllers/admin.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      AuditLog,
      ApiKey,
      Model,
      SystemConfig,
      Wallet,
    ]),
    forwardRef(() => WalletsModule),
    forwardRef(() => ProviderAccountsModule),
  ],
  providers: [UsersService, UsersRepository],
  controllers: [UsersController, AdminController],
  exports: [UsersService, UsersRepository, TypeOrmModule],
})
export class UsersModule {}
