import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { ModelsRepository } from '../repositories/models.repository';
import { ModelVersionsRepository } from '../repositories/model-versions.repository';
import { ModelsService } from './models.service';
import { ModelLog } from '../entities/model-log.entity';
import { VersionReviewStatus } from '../enums/version-review-status.enum';
import { VersionStatus } from '../enums/version-status.enum';
import { DeploymentStatus } from '../../deployments/enums/deployment-status.enum';
import { OrgRole } from '../../../shared/enums/org-role.enum';

@Injectable()
export class ModelAnalyticsService {
  constructor(
    private readonly modelsRepository: ModelsRepository,
    private readonly modelVersionsRepository: ModelVersionsRepository,
    @Inject(forwardRef(() => ModelsService))
    private readonly modelsService: ModelsService,
  ) {}

  async getOrganizationModelAnalytics(orgId: string, actorId: string) {
    await this.modelsService.assertProviderOrgAccess(orgId, actorId, [
      OrgRole.OWNER,
      OrgRole.MAINTAINER,
    ]);

    const models = await this.modelsRepository.find({
      where: { organization: { id: orgId } },
      relations: [
        'user',
        'versions',
        'versions.uploadedBy',
        'versions.reviewedBy',
        'versions.testCases',
        'versions.deployments',
      ],
    });

    const versions = models.flatMap((model) =>
      (model.versions ?? []).map((version) => ({ model, version })),
    );
    const pendingReviews = versions.filter(
      ({ version }) => version.reviewStatus === VersionReviewStatus.PENDING,
    ).length;
    const approvedVersions = versions.filter(
      ({ version }) => version.reviewStatus === VersionReviewStatus.APPROVED,
    ).length;
    const declinedVersions = versions.filter(
      ({ version }) => version.reviewStatus === VersionReviewStatus.DECLINED,
    ).length;
    const readyVersions = versions.filter(
      ({ version }) => version.status === VersionStatus.READY,
    ).length;
    const runningDeployments = versions.reduce(
      (count, { version }) =>
        count +
        (version.deployments ?? []).filter(
          (deployment) => deployment.status === DeploymentStatus.RUNNING,
        ).length,
      0,
    );
    const totalEarnings = models.reduce(
      (sum, model) => sum + (Number(model.totalEarnings) || 0),
      0,
    );

    const byUploader = new Map<
      string,
      { name: string; models: number; versions: number }
    >();
    for (const model of models) {
      const creatorKey = model.user?.id ?? 'unknown';
      const creatorName = model.user?.email ?? 'Unknown';
      const current = byUploader.get(creatorKey) ?? {
        name: creatorName,
        models: 0,
        versions: 0,
      };
      current.models += 1;
      current.versions += model.versions?.length ?? 0;
      byUploader.set(creatorKey, current);
    }

    const modelLogs = await this.modelsRepository.manager
      .getRepository(ModelLog)
      .find({
        where: { model: { organization: { id: orgId } } },
        order: { createdAt: 'ASC' },
      });

    const earningsByMonthMap = new Map<string, number>();
    for (const log of modelLogs) {
      const month = log.createdAt.toISOString().slice(0, 7);
      const current = earningsByMonthMap.get(month) ?? 0;
      earningsByMonthMap.set(month, current + Number(log.creditsCharged ?? 0));
    }

    const earningsHistory: Array<{ name: string; Earnings: number }> = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      const monthName = d.toLocaleDateString('en-US', { month: 'short' });
      earningsHistory.push({
        name: monthName,
        Earnings: earningsByMonthMap.get(key) ?? 0,
      });
    }

    return {
      totals: {
        models: models.length,
        versions: versions.length,
        pendingReviews,
        approvedVersions,
        declinedVersions,
        readyVersions,
        runningDeployments,
        totalEarnings,
        marketplaceVerified: models.filter((model) => model.marketplaceVerified)
          .length,
      },
      byUploader: Array.from(byUploader.values()),
      recentVersions: versions
        .sort(
          (a, b) =>
            new Date(b.version.createdAt).getTime() -
            new Date(a.version.createdAt).getTime(),
        )
        .slice(0, 12)
        .map(({ model, version }) => ({
          modelId: model.id,
          modelName: model.name,
          versionId: version.id,
          versionNumber: version.versionNumber,
          status: version.status,
          reviewStatus: version.reviewStatus,
          uploadedBy: version.uploadedBy?.email ?? model.user?.email ?? null,
          reviewedBy: version.reviewedBy?.email ?? null,
          createdAt: version.createdAt,
        })),
      earningsHistory,
    };
  }
}
