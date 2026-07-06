import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FirewallPolicy } from './entities/firewall-policy.entity';
import { FirewallService } from './services/firewall.service';
import { FirewallController } from './controllers/firewall.controller';
import { Model } from '../models/entities/model.entity';
import { AuthModule } from '../auth/auth.module';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FirewallPolicy, Model]),
    AuthModule,

    forwardRef(() => OrganizationsModule),
  ],
  controllers: [FirewallController],
  providers: [FirewallService],
  exports: [FirewallService],
})
export class FirewallModule {}
