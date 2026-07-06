import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../../../shared/guards/admin.guard';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import {
  ChangeProviderStatusDto,
  ChangeProviderTierDto,
  ProviderOverridesDto,
  UpsertProviderAccountDto,
} from '../dto/provider-account.dto';
import { UpsertProviderOfferDto } from '../dto/provider-offer.dto';
import { UpsertProviderTierDto } from '../dto/provider-tier.dto';
import { ProviderAccount } from '../entities/provider-account.entity';
import { ProviderOffer } from '../entities/provider-offer.entity';
import { ProviderTierDefinition } from '../entities/provider-tier-definition.entity';
import { ProviderAccountsService } from '../services/provider-accounts.service';
import { ProviderOffersService } from '../services/provider-offers.service';
import { ProviderTierService } from '../services/provider-tier.service';
import { ProviderUtilizationService } from '../services/provider-utilization.service';

@Controller('admin/provider')
@UseGuards(JwtAuthGuard, AdminGuard)
export class ProviderAccountsAdminController {
  constructor(
    private readonly tierService: ProviderTierService,
    private readonly accountsService: ProviderAccountsService,
    private readonly offersService: ProviderOffersService,
    private readonly utilizationService: ProviderUtilizationService,
  ) {}

  @Get('tiers')
  async listTiers(): Promise<ProviderTierDefinition[]> {
    return this.tierService.listTiers();
  }

  @Post('tiers')
  async createTier(
    @Body() body: UpsertProviderTierDto,
  ): Promise<ProviderTierDefinition> {
    return this.tierService.createTier(body);
  }

  @Patch('tiers/:id')
  async updateTier(
    @Param('id') id: string,
    @Body() body: UpsertProviderTierDto,
  ): Promise<ProviderTierDefinition> {
    return this.tierService.updateTier(id, body);
  }

  @Delete('tiers/:id')
  async deleteTier(
    @Param('id') id: string,
  ): Promise<{ deleted: boolean; tier?: ProviderTierDefinition }> {
    return this.tierService.deleteOrDeactivateTier(id);
  }

  @Get('accounts')
  async listAccounts(): Promise<ProviderAccount[]> {
    return this.accountsService.listProviderAccounts();
  }

  @Post('accounts')
  async upsertAccount(
    @Body() body: UpsertProviderAccountDto,
    @Req() req: { user: { id: string } },
  ): Promise<ProviderAccount> {
    return this.accountsService.upsertProviderAccount(body, req.user.id);
  }

  @Get('accounts/:id')
  async getAccount(@Param('id') id: string): Promise<{
    account: ProviderAccount;
    utilization: Awaited<
      ReturnType<ProviderUtilizationService['getUtilization']>
    >;
  }> {
    const account = await this.accountsService.getProviderAccount(id);
    return {
      account,
      utilization: await this.utilizationService.getUtilization(account),
    };
  }

  @Patch('accounts/:id/tier')
  async changeTier(
    @Param('id') id: string,
    @Body() body: ChangeProviderTierDto,
    @Req() req: { user: { id: string } },
  ): Promise<ProviderAccount> {
    return this.accountsService.changeTier(id, body, req.user.id);
  }

  @Patch('accounts/:id/status')
  async changeStatus(
    @Param('id') id: string,
    @Body() body: ChangeProviderStatusDto,
  ): Promise<ProviderAccount> {
    return this.accountsService.changeStatus(id, body);
  }

  @Patch('accounts/:id/overrides')
  async updateOverrides(
    @Param('id') id: string,
    @Body() body: ProviderOverridesDto,
  ): Promise<ProviderAccount> {
    return this.accountsService.updateOverrides(id, body);
  }

  @Get('offers')
  async listOffers(): Promise<ProviderOffer[]> {
    return this.offersService.listOffers();
  }

  @Post('offers')
  async createOffer(
    @Body() body: UpsertProviderOfferDto,
    @Req() req: { user: { id: string } },
  ): Promise<ProviderOffer> {
    return this.offersService.createOffer(body, req.user.id);
  }

  @Patch('offers/:id')
  async updateOffer(
    @Param('id') id: string,
    @Body() body: UpsertProviderOfferDto,
  ): Promise<ProviderOffer> {
    return this.offersService.updateOffer(id, body);
  }

  @Patch('offers/:id/active')
  async setOfferActive(
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
  ): Promise<ProviderOffer> {
    return this.offersService.setOfferActive(id, body.isActive);
  }
}
