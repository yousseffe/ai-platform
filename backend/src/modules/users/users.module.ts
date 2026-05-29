import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './services/users.service';
import { UsersRepository } from './repositories/users.repository';
import { UsersController } from './controllers/users.controller';
import { WalletsModule } from '../wallets/wallets.module';

/**
 * Module responsible for user account management and data persistence.
 */
@Module({
  imports: [TypeOrmModule.forFeature([User]), WalletsModule],
  providers: [UsersService, UsersRepository],
  controllers: [UsersController],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
