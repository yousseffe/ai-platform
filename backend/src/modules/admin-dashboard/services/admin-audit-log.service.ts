import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../users/entities/audit-log.entity';
import { AdminAuditEventSummary } from '../types/admin-dashboard.types';

@Injectable()
export class AdminAuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async logAdminAction(params: {
    actorAdminId: string;
    action: string;
    entityType: string;
    entityId: string;
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
    reason: string | null;
  }): Promise<AuditLog> {
    return this.auditLogRepository.save(
      this.auditLogRepository.create({
        userId: params.actorAdminId,
        action: params.action,
        metadata: {
          entityType: params.entityType,
          entityId: params.entityId,
          before: params.before,
          after: params.after,
          reason: params.reason,
        },
      }),
    );
  }

  async listEntityAuditEvents(
    entityType: string,
    entityId: string,
    limit = 10,
  ): Promise<AdminAuditEventSummary[]> {
    const auditLogs = await this.auditLogRepository.find({
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 50),
    });

    return auditLogs
      .filter((log) => {
        const metadata = log.metadata ?? {};
        return (
          metadata['entityType'] === entityType &&
          metadata['entityId'] === entityId
        );
      })
      .map((log) => {
        const metadata = log.metadata ?? {};
        return {
          id: log.id,
          actorAdminId: log.userId,
          action: log.action,
          reason:
            typeof metadata['reason'] === 'string' ? metadata['reason'] : null,
          before:
            metadata['before'] &&
            typeof metadata['before'] === 'object' &&
            !Array.isArray(metadata['before'])
              ? (metadata['before'] as Record<string, unknown>)
              : null,
          after:
            metadata['after'] &&
            typeof metadata['after'] === 'object' &&
            !Array.isArray(metadata['after'])
              ? (metadata['after'] as Record<string, unknown>)
              : null,
          createdAt: log.createdAt.toISOString(),
        };
      });
  }
}
