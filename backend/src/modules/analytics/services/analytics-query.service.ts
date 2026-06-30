import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { Model } from '../../models/entities/model.entity';
import { ModelLog } from '../../models/entities/model-log.entity';
import { Deployment } from '../../deployments/entities/deployment.entity';
import { DeploymentStatus } from '../../deployments/enums/deployment-status.enum';

/** Per-minute traffic bucket derived from ModelLog. */
export interface MinuteBucket {
  minute: string;
  count: number;
  errors: number;
}

/** Windowed request statistics for a model, derived from ModelLog (reliable
 * even when Prometheus has no samples). Consumed by the MCP correlation tool. */
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

/** Compact, scoped deployment summary. */
export interface DeploymentSummary {
  deploymentId: string;
  modelId: string;
  modelName: string;
  status: string;
  url: string | null;
  createdAt: Date;
}

/**
 * Provides scoped, raw observability data (request statistics, deployment
 * inventory) for the MCP server to correlate and summarize. Deterministic and
 * read-only; it performs no inference and returns no secrets.
 */
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

  /**
   * Computes windowed request statistics for a model the actor owns.
   *
   * @param modelId - Target model UUID.
   * @param actorId - Authenticated user id (ownership is enforced).
   * @param windowMinutes - Look-back window in minutes (clamped 1..1440).
   * @returns The {@link RequestStats}.
   * @throws {NotFoundException} If the model does not exist.
   * @throws {ForbiddenException} If the actor does not own the model.
   */
  async requestStats(
    modelId: string,
    actorId: string,
    windowMinutes: number,
  ): Promise<RequestStats> {
    const minutes = Math.min(Math.max(Math.trunc(windowMinutes) || 15, 1), 1440);
    const model = await this.modelsRepository.findOne({
      where: { id: modelId },
      relations: ['user'],
    });
    if (!model) throw new NotFoundException('Model not found');
    if (model.user?.id !== actorId) {
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
      if (typeof log.responseTimeMs === 'number') latencies.push(log.responseTimeMs);

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

  /**
   * Lists deployments for the models the actor owns.
   *
   * @param actorId - Authenticated user id.
   * @param onlyRunning - When true, restrict to RUNNING deployments.
   * @returns Scoped deployment summaries.
   */
  async listDeployments(
    actorId: string,
    onlyRunning: boolean,
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
      .filter((d) => d.modelVersion?.model?.user?.id === actorId)
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

/**
 * Computes the q-th percentile of a numeric array (nearest-rank).
 *
 * @param values - Numeric samples.
 * @param q - Quantile in [0, 1].
 * @returns The percentile value, or 0 for an empty input.
 */
function percentile(values: number[], q: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * q));
  return sorted[idx] ?? 0;
}
