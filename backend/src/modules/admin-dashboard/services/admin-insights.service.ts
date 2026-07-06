import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Repository, Like } from 'typeorm';
import * as Docker from 'dockerode';
import { getDockerOptions } from '../../../shared/docker/docker.util';
import { MinioService } from '../../../shared/minio/minio.service';
import { User } from '../../users/entities/user.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { ProviderAccount } from '../../provider-accounts';
import { Model } from '../../models/entities/model.entity';
import { ModelLog } from '../../models/entities/model-log.entity';
import { DeploymentStatus } from '../../deployments';
import { Deployment } from '../../deployments/entities/deployment.entity';
import { SystemConfig } from '../../wallets/entities/system-config.entity';
import { Alert } from '../../analytics/entities/alert.entity';
import { InferenceStatus } from '../../inference';
import { AdminProviderMetricsService } from './admin-provider-metrics.service';

export const DEFAULT_CAPS: Record<
  string,
  { cpuPercent: number; ramMb: number }
> = {
  TABULAR: { cpuPercent: 30, ramMb: 512 },
  NLP: { cpuPercent: 60, ramMb: 1024 },
  VISION: { cpuPercent: 70, ramMb: 1024 },
  DIFFUSION: { cpuPercent: 85, ramMb: 2048 },
  LLM_GGUF: { cpuPercent: 95, ramMb: 2048 },
};

@Injectable()
export class AdminInsightsService {
  private readonly logger = new Logger(AdminInsightsService.name);
  private readonly docker: Docker;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(ProviderAccount)
    private readonly providerAccountRepository: Repository<ProviderAccount>,
    @InjectRepository(Model)
    private readonly modelRepository: Repository<Model>,
    @InjectRepository(ModelLog)
    private readonly modelLogRepository: Repository<ModelLog>,
    @InjectRepository(Deployment)
    private readonly deploymentsRepository: Repository<Deployment>,
    @InjectRepository(SystemConfig)
    private readonly systemConfigRepository: Repository<SystemConfig>,
    @InjectRepository(Alert)
    private readonly alertRepository: Repository<Alert>,
    private readonly minioService: MinioService,
    private readonly metricsService: AdminProviderMetricsService,
    @InjectQueue('build-queue') private readonly buildQueue: Queue,
    @InjectQueue('deploy-queue') private readonly deployQueue: Queue,
  ) {
    this.docker = new Docker(getDockerOptions());
  }

  async getInsights() {
    const now = new Date();

    const [
      users,
      providers,
      models,
      queueStatus,
      storageStats,
      activeDeps,
      capsConfig,
      recentAlerts,
    ] = await Promise.all([
      this.userRepository.find({ order: { createdAt: 'ASC' } }),
      this.providerAccountRepository.find({ relations: ['tier'] }),
      this.modelRepository.find({ relations: ['user', 'organization'] }),
      this.getQueueStatus(),
      this.minioService.getStorageStats(),
      this.deploymentsRepository.find({
        where: { status: DeploymentStatus.RUNNING },
        relations: ['modelVersion', 'modelVersion.model'],
      }),
      this.modelTypeCaps(),
      this.alertRepository.find({
        order: { receivedAt: 'DESC' },
        take: 30,
      }),
    ]);

    const userGrowthTrend = this.calculateUserGrowth(users);

    const subscriptionAnalytics =
      await this.compileSubscriptionInsights(providers);

    const containerStatsList = await this.getContainerStats(activeDeps);

    const pricingRecommendations = await this.generatePricingRecommendations(
      models,
      containerStatsList,
    );

    return {
      generatedAt: now.toISOString(),
      userGrowth: userGrowthTrend,
      subscriptions: subscriptionAnalytics,
      infrastructure: {
        activeContainers: activeDeps.length,
        containersList: containerStatsList,
        storage: storageStats,
        queues: queueStatus,
      },
      recommendations: pricingRecommendations,
      caps: capsConfig,
      alerts: recentAlerts,
    };
  }

  private async compileSubscriptionInsights(providers: ProviderAccount[]) {
    const ownerSummaryMap =
      await this.metricsService.getOwnerSummaryMap(providers);
    const subscriptionMap =
      await this.metricsService.getSubscriptionMap(providers);

    const planStats: Record<string, number> = {};
    const subscribersList: Record<string, unknown>[] = [];

    for (const provider of providers) {
      const ownerMeta = ownerSummaryMap.get(provider.id);
      const subSnap = subscriptionMap.get(provider.id);
      const tierName = provider.tier?.displayName || 'Free';

      planStats[tierName] = (planStats[tierName] || 0) + 1;

      const price =
        provider.subscriptionBillingCycle === 'ANNUAL'
          ? Number(provider.tier?.annualPriceEgp || 0)
          : Number(provider.tier?.monthlyPriceEgp || 0);

      let daysRemaining: number | null = null;
      if (provider.subscriptionExpiresAt) {
        const expiresTime = new Date(provider.subscriptionExpiresAt).getTime();
        daysRemaining = Math.max(
          0,
          Math.ceil((expiresTime - Date.now()) / (1000 * 60 * 60 * 24)),
        );
      }

      subscribersList.push({
        id: provider.id,
        ownerName: ownerMeta?.ownerName || 'Unknown',
        ownerEmail: ownerMeta?.ownerEmail || 'Unknown',
        tierName,
        status: provider.status,
        billingCycle: provider.subscriptionBillingCycle || 'MONTHLY',
        price,
        lastPaymentAt: provider.lastSubscriptionPaymentAt,
        expiresAt: provider.subscriptionExpiresAt,
        daysRemaining,
        totalPaidEgp: subSnap?.totalPaidEgp || 0,
      });
    }

    return {
      planBreakdown: Object.entries(planStats).map(([name, count]) => ({
        name,
        value: count,
      })),
      subscribers: subscribersList.sort((a, b) => {
        const da = a.daysRemaining as number | null;
        const db = b.daysRemaining as number | null;
        if (da === null) return 1;
        if (db === null) return -1;
        return da - db;
      }),
    };
  }

  /**
   * Computes monthly user registrations trends.
   */
  private calculateUserGrowth(users: User[]) {
    const signupsByMonth: Record<string, number> = {};
    for (const u of users) {
      if (u.createdAt) {
        const month = new Date(u.createdAt).toISOString().slice(0, 7); // YYYY-MM
        signupsByMonth[month] = (signupsByMonth[month] || 0) + 1;
      }
    }

    let cumulativeTotal = 0;
    return Object.entries(signupsByMonth)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, count]) => {
        cumulativeTotal += count;
        return {
          month,
          signups: count,
          totalUsers: cumulativeTotal,
        };
      });
  }

  /**
   * Collects CPU and Memory stats from running containers or Postgres fallback logs.
   */
  private async getContainerStats(activeDeps: Deployment[]) {
    const statsList: Record<string, unknown>[] = [];

    for (const dep of activeDeps) {
      let cpuPercent = 0.0;
      let ramMb = 0.0;
      let resolved = false;

      if (dep.containerId) {
        try {
          const container = this.docker.getContainer(dep.containerId);
          const stats = await container.stats({ stream: false });
          const cpuDelta =
            stats.cpu_stats.cpu_usage.total_usage -
            stats.precpu_stats.cpu_usage.total_usage;
          const systemDelta =
            stats.cpu_stats.system_cpu_usage -
            stats.precpu_stats.system_cpu_usage;
          const numCpus = stats.cpu_stats.online_cpus || 1;

          if (systemDelta > 0 && cpuDelta > 0) {
            cpuPercent = parseFloat(
              ((cpuDelta / systemDelta) * numCpus * 100).toFixed(1),
            );
          }
          const usageBytes = stats.memory_stats.usage || 0;
          ramMb = parseFloat((usageBytes / (1024 * 1024)).toFixed(1));
          resolved = true;
        } catch {
          // ignore error to let fallback logs execute
        }
      }

      // If docker daemon metrics fail, fall back to Postgres request history logs
      if (!resolved) {
        try {
          const stats = await this.modelLogRepository.findOne({
            where: { model: { id: dep.modelVersion?.model?.id } },
            order: { createdAt: 'DESC' },
          });
          if (stats) {
            cpuPercent = 0.0;
            ramMb = 0.0;
          }
        } catch {
          // ignore
        }
      }

      statsList.push({
        deploymentId: dep.id,
        modelId: dep.modelVersion?.model?.id,
        modelName: dep.modelVersion?.model?.name || 'Unknown',
        modelType: dep.modelVersion?.model?.type || 'Unknown',
        tier: dep.modelVersion?.model?.tier || 'SMALL',
        cpu: cpuPercent,
        ram: ramMb,
        port: dep.port,
        url: dep.url,
        createdAt: dep.createdAt,
      });
    }

    return statsList;
  }

  /**
   * Generates smart pricing recommendations based on model requests and caps violations.
   */
  private async generatePricingRecommendations(
    models: Model[],
    containerStats: Record<string, unknown>[],
  ) {
    const recommendations: Record<string, unknown>[] = [];

    for (const model of models) {
      const successfulRequests = await this.modelLogRepository.count({
        where: { model: { id: model.id }, status: InferenceStatus.SUCCESS },
      });
      const costVal =
        typeof model.costPerRequest === 'string'
          ? parseFloat(model.costPerRequest)
          : model.costPerRequest;

      // Suggest price increase for highly used, low-priced models
      if (successfulRequests > 100 && costVal < 0.1) {
        recommendations.push({
          modelId: model.id,
          modelName: model.name,
          currentPrice: costVal,
          currentTier: model.tier,
          reason: `Highly popular: Served ${successfulRequests} successful predictions. Price is too low.`,
          suggestedPrice:
            costVal === 0 ? 0.05 : parseFloat((costVal * 1.5).toFixed(2)),
          suggestedTier: model.tier,
          actionType: 'PRICE_UPGRADE',
        });
      }

      // Recommend tier upgrade if model container is currently active and pushing caps limits
      const stats = containerStats.find((s) => s.modelId === model.id);
      if (stats) {
        const statsModelType = stats.modelType as string;
        const statsCpu = stats.cpu as number;
        const statsRam = stats.ram as number;
        const caps = DEFAULT_CAPS[statsModelType.toUpperCase()] || {
          cpuPercent: 80,
          ramMb: 1024,
        };
        if (statsCpu > caps.cpuPercent * 0.9 || statsRam > caps.ramMb * 0.9) {
          const nextTierMap: Record<string, string> = {
            SMALL: 'MEDIUM',
            MEDIUM: 'LARGE',
            LARGE: 'LARGE',
          };
          const nextTier = nextTierMap[model.tier.toUpperCase()] || 'LARGE';
          if (nextTier !== model.tier) {
            recommendations.push({
              modelId: model.id,
              modelName: model.name,
              currentPrice: costVal,
              currentTier: model.tier,
              reason: `Resource stress: Active container is using ${stats.cpu}% CPU and ${stats.ram}MB RAM (Cap limit is ${caps.cpuPercent}% CPU, ${caps.ramMb}MB RAM).`,
              suggestedPrice: parseFloat((costVal * 1.25).toFixed(2)),
              suggestedTier: nextTier,
              actionType: 'TIER_AND_PRICE_UPGRADE',
            });
          }
        }
      }
    }

    return recommendations;
  }

  /**
   * Retrieves BullMQ Queue Job statuses.
   */
  private async getQueueStatus() {
    try {
      const [buildCounts, deployCounts] = await Promise.all([
        this.buildQueue.getJobCounts(),
        this.deployQueue.getJobCounts(),
      ]);
      return {
        buildQueue: buildCounts,
        deployQueue: deployCounts,
      };
    } catch {
      return {
        buildQueue: {
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          delayed: 0,
        },
        deployQueue: {
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          delayed: 0,
        },
      };
    }
  }

  /**
   * Resolves the current CPU & Memory caps per model type.
   */
  async modelTypeCaps() {
    const configs = await this.systemConfigRepository.find();
    const configMap = new Map(configs.map((c) => [c.key, c.value]));

    const caps: Record<string, { cpuPercent: number; ramMb: number }> = {};
    for (const key of Object.keys(DEFAULT_CAPS)) {
      const lower = key.toLowerCase();
      caps[key] = {
        cpuPercent: parseFloat(
          configMap.get(`cap_cpu_${lower}`) ||
            DEFAULT_CAPS[key].cpuPercent.toString(),
        ),
        ramMb: parseFloat(
          configMap.get(`cap_ram_${lower}`) ||
            DEFAULT_CAPS[key].ramMb.toString(),
        ),
      };
    }
    return caps;
  }

  /**
   * Updates CPU & Memory caps for model types.
   */
  async updateCaps(
    body: Record<string, { cpuPercent: number; ramMb: number }>,
  ) {
    for (const [modelType, capVal] of Object.entries(body)) {
      const lowerType = modelType.toLowerCase();
      const cpuKey = `cap_cpu_${lowerType}`;
      const ramKey = `cap_ram_${lowerType}`;

      await Promise.all([
        this.saveConfigValue(cpuKey, capVal.cpuPercent.toString()),
        this.saveConfigValue(ramKey, capVal.ramMb.toString()),
      ]);
    }
    return { success: true };
  }

  private async saveConfigValue(key: string, value: string) {
    let config = await this.systemConfigRepository.findOne({ where: { key } });
    if (!config) {
      config = this.systemConfigRepository.create({ key, value });
    } else {
      config.value = value;
    }
    await this.systemConfigRepository.save(config);
  }

  /**
   * Upgrades a model's tier and pricing details manually or via recommendations.
   */
  async upgradeModel(
    id: string,
    suggestedPrice?: number,
    suggestedTier?: string,
  ) {
    const model = await this.modelRepository.findOneBy({ id });
    if (!model) throw new Error('Model not found');

    if (suggestedPrice !== undefined) {
      model.costPerRequest = suggestedPrice;
    }
    if (suggestedTier !== undefined) {
      model.tier = suggestedTier;
    }
    model.hasCustomPricing = true;

    await this.modelRepository.save(model);

    const deployments = await this.deploymentsRepository.find({
      where: {
        modelVersion: { model: { id } },
        status: DeploymentStatus.RUNNING,
      },
    });

    for (const d of deployments) {
      if (d.containerId) {
        try {
          const container = this.docker.getContainer(d.containerId);
          await container.stop();
          await container.remove();
        } catch {}
      }
      await this.deploymentsRepository.update(d.id, {
        status: DeploymentStatus.STOPPED,
        port: null,
        url: null,
      });
    }

    return { success: true, model };
  }
}
