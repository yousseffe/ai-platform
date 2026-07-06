import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AdminChangeProviderStatusDto,
  AdminChangeProviderTierDto,
  AdminProviderNoteDto,
  AdminProviderOverridesDto,
} from '../dto/provider-management.dto';
import { AdminAuditLogService } from './admin-audit-log.service';
import {
  ProviderAccount,
  ProviderAccountsService,
} from '../../provider-accounts';

@Injectable()
export class AdminProviderManagementService {
  constructor(
    @InjectRepository(ProviderAccount)
    private readonly providerAccountRepository: Repository<ProviderAccount>,
    private readonly providerAccountsService: ProviderAccountsService,
    private readonly auditLogService: AdminAuditLogService,
  ) {}

  async changeStatus(
    providerAccountId: string,
    body: AdminChangeProviderStatusDto,
    actorAdminId: string,
  ): Promise<ProviderAccount> {
    const before = await this.getAccount(providerAccountId);
    const updated = await this.providerAccountsService.changeStatus(
      providerAccountId,
      body,
    );
    await this.auditLogService.logAdminAction({
      actorAdminId,
      action: 'ADMIN_PROVIDER_STATUS_CHANGED',
      entityType: 'PROVIDER_ACCOUNT',
      entityId: providerAccountId,
      before: { status: before.status, notes: before.notes },
      after: { status: updated.status, notes: updated.notes },
      reason: body.reason,
    });
    return updated;
  }

  async changeTier(
    providerAccountId: string,
    body: AdminChangeProviderTierDto,
    actorAdminId: string,
  ): Promise<ProviderAccount> {
    const before = await this.getAccount(providerAccountId);
    const updated = await this.providerAccountsService.changeTier(
      providerAccountId,
      body,
      actorAdminId,
    );
    await this.auditLogService.logAdminAction({
      actorAdminId,
      action: 'ADMIN_PROVIDER_TIER_CHANGED',
      entityType: 'PROVIDER_ACCOUNT',
      entityId: providerAccountId,
      before: { tierId: before.tier.id, tierName: before.tier.displayName },
      after: { tierId: updated.tier.id, tierName: updated.tier.displayName },
      reason: body.reason,
    });
    return updated;
  }

  async updateOverrides(
    providerAccountId: string,
    body: AdminProviderOverridesDto,
    actorAdminId: string,
  ): Promise<ProviderAccount> {
    const before = await this.getAccount(providerAccountId);
    const updated = await this.providerAccountsService.updateOverrides(
      providerAccountId,
      body,
    );
    await this.auditLogService.logAdminAction({
      actorAdminId,
      action: 'ADMIN_PROVIDER_OVERRIDES_UPDATED',
      entityType: 'PROVIDER_ACCOUNT',
      entityId: providerAccountId,
      before: this.extractOverrides(before),
      after: this.extractOverrides(updated),
      reason: body.reason,
    });
    return updated;
  }

  async appendNote(
    providerAccountId: string,
    body: AdminProviderNoteDto,
    actorAdminId: string,
  ): Promise<ProviderAccount> {
    const account = await this.getAccount(providerAccountId);
    const updated = await this.providerAccountRepository.save({
      ...account,
      notes: [account.notes?.trim(), body.note.trim()]
        .filter(Boolean)
        .join('\n\n'),
    });
    await this.auditLogService.logAdminAction({
      actorAdminId,
      action: 'ADMIN_PROVIDER_NOTE_ADDED',
      entityType: 'PROVIDER_ACCOUNT',
      entityId: providerAccountId,
      before: { notes: account.notes },
      after: { notes: updated.notes },
      reason: body.note,
    });
    return updated;
  }

  private async getAccount(
    providerAccountId: string,
  ): Promise<ProviderAccount> {
    const account = await this.providerAccountRepository.findOne({
      where: { id: providerAccountId },
      relations: ['tier'],
    });
    if (!account) {
      throw new NotFoundException('Provider account not found');
    }
    return account;
  }

  private extractOverrides(account: ProviderAccount): Record<string, unknown> {
    return {
      customCommissionPercent: account.customCommissionPercent,
      customProviderSharePercent: account.customProviderSharePercent,
      customMaxModels: account.customMaxModels,
      customMaxPublicModels: account.customMaxPublicModels,
      customMaxVersionsPerModel: account.customMaxVersionsPerModel,
      customMaxLLMModels: account.customMaxLLMModels,
      customMaxVisionModels: account.customMaxVisionModels,
      customMaxNLPModels: account.customMaxNLPModels,
      customMaxTabularModels: account.customMaxTabularModels,
      customMaxDiffusionModels: account.customMaxDiffusionModels,
      customNotes: account.customNotes,
    };
  }
}
