import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { Model } from '../../models/entities/model.entity';
import { ModelLog } from '../../models/entities/model-log.entity';
import { DeploymentStatus } from '../../deployments';
import { Deployment } from '../../deployments/entities/deployment.entity';

export interface MinuteBucket {
  minute: string;
  count: number;
  errors: number;
}

export interface RequestStats {
  modelId: string;
  windowMinutes: number;
  requestCount: number;
  errorCount: number;
  errorRate: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
  statusCodes: Record<string, number>;
  perMinute: MinuteBucket[];
}

export interface DeploymentSummary {
  deploymentId: string;
  modelId: string;
  modelName: string;
  status: string;
  url: string | null;
  createdAt: Date;
}

@Injectable()
export class AnalyticsQueryService {
  constructor(
    @InjectRepository(Model)
    private readonly modelsRepository: Repository<Model>,
    @InjectRepository(ModelLog)
    private readonly modelLogRepository: Repository<ModelLog>,
    @InjectRepository(Deployment)
    private readonly deploymentsRepository: Repository<Deployment>,
  ) {}

  async requestStats(
    modelId: string,
    actorId: string,
    windowMinutes: number,
    isAdmin = false,
  ): Promise<RequestStats> {
    const minutes = Math.min(
      Math.max(Math.trunc(windowMinutes) || 15, 1),
      1440,
    );
    const model = await this.modelsRepository.findOne({
      where: { id: modelId },
      relations: ['user'],
    });
    if (!model) throw new NotFoundException('Model not found');
    if (model.user?.id !== actorId && !isAdmin) {
      throw new ForbiddenException('You do not own this model');
    }

    const since = new Date(Date.now() - minutes * 60 * 1000);
    const logs = await this.modelLogRepository.find({
      where: { model: { id: modelId }, createdAt: MoreThanOrEqual(since) },
    });

    const statusCodes: Record<string, number> = {};
    const latencies: number[] = [];
    const buckets = new Map<string, MinuteBucket>();
    let errorCount = 0;

    for (const log of logs) {
      const code = log.statusCode ?? 0;
      const codeKey = String(code);
      statusCodes[codeKey] = (statusCodes[codeKey] ?? 0) + 1;
      if (code >= 400) errorCount += 1;
      if (typeof log.responseTimeMs === 'number')
        latencies.push(log.responseTimeMs);

      const minuteKey = new Date(
        Math.floor(log.createdAt.getTime() / 60000) * 60000,
      ).toISOString();
      const bucket = buckets.get(minuteKey) ?? {
        minute: minuteKey,
        count: 0,
        errors: 0,
      };
      bucket.count += 1;
      if (code >= 400) bucket.errors += 1;
      buckets.set(minuteKey, bucket);
    }

    return {
      modelId,
      windowMinutes: minutes,
      requestCount: logs.length,
      errorCount,
      errorRate: logs.length ? errorCount / logs.length : 0,
      latencyP50Ms: percentile(latencies, 0.5),
      latencyP95Ms: percentile(latencies, 0.95),
      statusCodes,
      perMinute: [...buckets.values()].sort((a, b) =>
        a.minute.localeCompare(b.minute),
      ),
    };
  }

  async listDeployments(
    actorId: string,
    onlyRunning: boolean,
    isAdmin = false,
  ): Promise<DeploymentSummary[]> {
    const deployments = await this.deploymentsRepository.find({
      where: onlyRunning ? { status: DeploymentStatus.RUNNING } : {},
      relations: [
        'modelVersion',
        'modelVersion.model',
        'modelVersion.model.user',
      ],
    });

    return deployments
      .filter((d) => isAdmin || d.modelVersion?.model?.user?.id === actorId)
      .map((d) => ({
        deploymentId: d.id,
        modelId: d.modelVersion.model.id,
        modelName: d.modelVersion.model.name,
        status: d.status,
        url: d.url ?? null,
        createdAt: d.createdAt,
      }));
  }
}

function percentile(values: number[], q: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * q));
  return sorted[idx] ?? 0;
}
