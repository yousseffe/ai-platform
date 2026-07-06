import {
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { Model } from '../../models/entities/model.entity';
import { ModelLog } from '../../models/entities/model-log.entity';
import { Alert } from '../../analytics/entities/alert.entity';
import { FirewallService } from '../../firewall';
import { MailService } from '../../../shared/mail/mail.service';
import { RiskBaseline } from '../entities/risk-baseline.entity';
import { RiskEvent } from '../entities/risk-event.entity';
import { assessTraffic, TrafficFeatures } from '../fraud-rules';
import { aggregateFeatures } from './fraud-aggregate';

const WINDOW_MINUTES = 5;
const EWMA_ALPHA = 0.3;
const PERSIST_THRESHOLD = 50;

@Injectable()
export class FraudService {
  private readonly logger = new Logger(FraudService.name);

  constructor(
    @InjectRepository(ModelLog)
    private readonly modelLogRepository: Repository<ModelLog>,
    @InjectRepository(RiskBaseline)
    private readonly baselineRepository: Repository<RiskBaseline>,
    @InjectRepository(RiskEvent)
    private readonly riskEventRepository: Repository<RiskEvent>,
    @InjectRepository(Alert)
    private readonly alertRepository: Repository<Alert>,
    private readonly mailService: MailService,
    private readonly firewallService: FirewallService,
  ) {}

  async scanAll(): Promise<number> {
    const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);
    const logs = await this.modelLogRepository.find({
      where: { createdAt: MoreThanOrEqual(since) },
      relations: ['model', 'model.user'],
    });

    const byModel = new Map<string, ModelLog[]>();
    for (const log of logs) {
      const id = log.model?.id;
      if (!id) continue;
      const arr = byModel.get(id) ?? [];
      arr.push(log);
      byModel.set(id, arr);
    }

    let recorded = 0;
    for (const [modelId, modelLogs] of byModel) {
      try {
        const handled = await this.assessModel(modelId, modelLogs);
        if (handled) recorded += 1;
      } catch (err: unknown) {
        this.logger.warn(
          `Fraud scan failed for model ${modelId}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
    return recorded;
  }

  private async assessModel(
    modelId: string,
    modelLogs: ModelLog[],
  ): Promise<boolean> {
    const model = modelLogs[0]?.model ?? null;
    const features = aggregateFeatures(
      modelId,
      modelLogs,
      WINDOW_MINUTES,
      model ? Number(model.averageRating ?? 0.0) : undefined,
      model ? Number(model.reviewCount ?? 0) : undefined,
    );

    const baseline = await this.baselineRepository.findOne({
      where: { modelId },
    });
    const prior = {
      ewmaRequestRatePerMin: baseline
        ? Number(baseline.ewmaRequestRatePerMin)
        : 0,
      ewmaErrorRate: baseline ? Number(baseline.ewmaErrorRate) : 0,
    };

    const assessment = assessTraffic(features, prior);
    await this.updateBaseline(baseline, modelId, features);

    if (assessment.riskScore < PERSIST_THRESHOLD || !assessment.threatClass) {
      return false;
    }

    const recentSince = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);
    const duplicate = await this.riskEventRepository.findOne({
      where: {
        modelId,
        threatClass: assessment.threatClass,
        createdAt: MoreThanOrEqual(recentSince),
      },
    });
    if (duplicate) return false;

    const owner = modelLogs.find((l) => l.model?.user)?.model?.user ?? null;
    await this.persistFinding(modelId, owner?.id ?? null, features, assessment);
    await this.notify(owner?.email ?? null, modelId, features, assessment);

    const blockReason = `${assessment.threatClass}: ${assessment.firedRules
      .map((r) => r.rule)
      .join(', ')}`;
    await this.firewallService
      .maybeAutoBlock(modelId, assessment.riskScore, blockReason)
      .catch((err) =>
        this.logger.warn(
          `Firewall auto-block check failed for model ${modelId}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        ),
      );

    return true;
  }

  private async updateBaseline(
    baseline: RiskBaseline | null,
    modelId: string,
    f: TrafficFeatures,
  ): Promise<void> {
    const avgLatency = 0;
    const ewma = (prev: number, cur: number): number =>
      EWMA_ALPHA * cur + (1 - EWMA_ALPHA) * prev;

    if (!baseline) {
      await this.baselineRepository.save(
        this.baselineRepository.create({
          modelId,
          ewmaRequestRatePerMin: f.requestRatePerMin,
          ewmaErrorRate: f.errorRate,
          ewmaLatencyMs: avgLatency,
        }),
      );
      return;
    }
    baseline.ewmaRequestRatePerMin = ewma(
      Number(baseline.ewmaRequestRatePerMin),
      f.requestRatePerMin,
    );
    baseline.ewmaErrorRate = ewma(Number(baseline.ewmaErrorRate), f.errorRate);
    await this.baselineRepository.save(baseline);
  }

  private async persistFinding(
    modelId: string,
    ownerId: string | null,
    features: TrafficFeatures,
    assessment: ReturnType<typeof assessTraffic>,
  ): Promise<void> {
    await this.riskEventRepository.save(
      this.riskEventRepository.create({
        modelId,
        ownerId,
        riskScore: assessment.riskScore,
        threatClass: assessment.threatClass as string,
        firedRules: assessment.firedRules,
        evidence: features as unknown as Record<string, unknown>,
        recommendations: assessment.recommendations,
        windowMinutes: features.windowMinutes,
      }),
    );

    await this.alertRepository.save(
      this.alertRepository.create({
        alertName: 'ModelRiskDetected',
        severity: assessment.riskScore >= 75 ? 'critical' : 'warning',
        status: 'firing',
        summary: `Risk ${assessment.riskScore}/100 (${assessment.threatClass}) on model ${modelId}`,
        labels: {
          model_id: modelId,
          threat_class: assessment.threatClass as string,
        },
        startsAt: new Date(),
        endsAt: null,
      }),
    );
    this.logger.warn(
      `Risk event: model ${modelId} score ${assessment.riskScore} (${assessment.threatClass})`,
    );
  }

  private async notify(
    ownerEmail: string | null,
    modelId: string,
    features: TrafficFeatures,
    assessment: ReturnType<typeof assessTraffic>,
  ): Promise<void> {
    if (!ownerEmail) return;
    const body =
      `A risk pattern was detected on your model ${modelId}.\n\n` +
      `Risk score: ${assessment.riskScore}/100\n` +
      `Threat class: ${assessment.threatClass}\n` +
      `Window: last ${features.windowMinutes} minutes\n\n` +
      `Findings:\n${assessment.firedRules
        .map((r) => `- ${r.rule}: ${r.detail}`)
        .join('\n')}\n\n` +
      `Recommendations:\n${assessment.recommendations
        .map((r) => `- ${r}`)
        .join('\n')}`;
    await this.mailService.sendSecurityAlert(
      ownerEmail,
      `[Security] Risk detected on your model (${assessment.threatClass})`,
      body,
    );
  }

  async getAdminRiskEvents(limit = 50): Promise<unknown[]> {
    return this.riskEventRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getAdminRiskReport(modelId: string): Promise<unknown> {
    const model = await this.modelLogRepository.manager
      .getRepository(Model)
      .findOne({ where: { id: modelId }, relations: ['user'] });
    if (!model) throw new NotFoundException('Model not found');

    const [events, baseline] = await Promise.all([
      this.riskEventRepository.find({
        where: { modelId },
        order: { createdAt: 'DESC' },
        take: 20,
      }),
      this.baselineRepository.findOne({ where: { modelId } }),
    ]);

    const latest = events[0];
    return {
      modelId,
      modelName: model.name,
      ownerEmail: model.user?.email ?? null,
      currentRiskScore: latest ? latest.riskScore : 0,
      currentThreatClass: latest ? latest.threatClass : null,
      averageRating: Number(model.averageRating ?? 0.0),
      reviewCount: Number(model.reviewCount ?? 0),
      baseline,
      events,
    };
  }

  async getRiskReport(modelId: string, actorId: string): Promise<unknown> {
    const model = await this.modelLogRepository.manager
      .getRepository(Model)
      .findOne({ where: { id: modelId }, relations: ['user'] });
    if (!model) throw new NotFoundException('Model not found');
    if (model.user?.id !== actorId) {
      throw new ForbiddenException('You do not own this model');
    }

    const [events, baseline] = await Promise.all([
      this.riskEventRepository.find({
        where: { modelId },
        order: { createdAt: 'DESC' },
        take: 20,
      }),
      this.baselineRepository.findOne({ where: { modelId } }),
    ]);

    const latest = events[0];
    return {
      modelId,
      currentRiskScore: latest ? latest.riskScore : 0,
      currentThreatClass: latest ? latest.threatClass : null,
      averageRating: Number(model.averageRating ?? 0.0),
      reviewCount: Number(model.reviewCount ?? 0),
      baseline,
      events,
    };
  }
}
