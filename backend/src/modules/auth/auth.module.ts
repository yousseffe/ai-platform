import { Module } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { OrganizationsModule } from '../organizations/organizations.module';
import { WalletsModule } from '../wallets/wallets.module';
import { OrgRoleGuard } from './guards/org-role.guard';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'supersecret',
      signOptions: { expiresIn: '60m' },
    }),
    OrganizationsModule,
    WalletsModule,
  ],
  providers: [AuthService, JwtStrategy, OrgRoleGuard],
  controllers: [AuthController],
  exports: [AuthService, OrgRoleGuard],
})
export class AuthModule {}
