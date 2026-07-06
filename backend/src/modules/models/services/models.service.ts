import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Model } from '../entities/model.entity';
import { ModelVersion } from '../entities/model-version.entity';
import { ModelVersionTestCase } from '../entities/model-version-test-case.entity';
import { ModelReview } from '../entities/model-review.entity';
import { ModelVersionReviewEvent } from '../entities/model-version-review-event.entity';
import { SystemConfig } from '../../wallets/entities/system-config.entity';
import { CreateReviewDto } from '../dto/create-review.dto';
import { InitiateUploadDto } from '../dto/initiate-upload.dto';
import { CompleteUploadDto } from '../dto/complete-upload.dto';
import { AbortUploadDto } from '../dto/abort-upload.dto';
import { VersionReviewAction } from '../enums/version-review-action.enum';
import { VersionStatus } from '../enums/version-status.enum';
import { ModelType } from '../enums/model-type.enum';
import { TaskType } from '../enums/task-type.enum';
import { Framework } from '../enums/framework.enum';
import { ModelsRepository } from '../repositories/models.repository';
import { ModelVersionsRepository } from '../repositories/model-versions.repository';
import { ModelsSearchService } from './models-search.service';
import { OrganizationsService } from '../../organizations';
import { TenantScopeService } from '../../../shared/security/tenant-scope.service';
import { ProviderLimitsService } from '../../provider-accounts';
import { MinioService } from '../../../shared/minio/minio.service';
import { OrgRole } from '../../../shared/enums/org-role.enum';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { OrgType } from '../../organizations';
import { DeploymentStatus } from '../../deployments';
import * as fs from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

import { ModelUploadService } from './model-upload.service';
import { ModelReviewService } from './model-review.service';
import { ModelTestCaseService } from './model-test-case.service';
import { ModelSettingsService } from './model-settings.service';
import { ModelAnalyticsService } from './model-analytics.service';

@Injectable()
export class ModelsService {
  constructor(
    public readonly modelsRepository: ModelsRepository,
    public readonly modelVersionsRepository: ModelVersionsRepository,
    public readonly modelsSearchService: ModelsSearchService,
    @Inject(forwardRef(() => OrganizationsService))
    public readonly organizationsService: OrganizationsService,
    public readonly tenantScopeService: TenantScopeService,
    public readonly providerLimitsService: ProviderLimitsService,
    public readonly minioService: MinioService,
    @InjectRepository(SystemConfig)
    public readonly systemConfigRepository: Repository<SystemConfig>,

    @Inject(forwardRef(() => ModelUploadService))
    private readonly modelUploadService: ModelUploadService,
    @Inject(forwardRef(() => ModelReviewService))
    private readonly modelReviewService: ModelReviewService,
    @Inject(forwardRef(() => ModelTestCaseService))
    private readonly modelTestCaseService: ModelTestCaseService,
    private readonly modelSettingsService: ModelSettingsService,
    @Inject(forwardRef(() => ModelAnalyticsService))
    private readonly modelAnalyticsService: ModelAnalyticsService,
  ) {}

  async assertProviderOrgAccess(
    orgId: string,
    userId: string,
    allowedRoles: OrgRole[] = [
      OrgRole.OWNER,
      OrgRole.MAINTAINER,
      OrgRole.CONTRIBUTOR,
    ],
  ): Promise<OrgRole> {
    const org = await this.organizationsService.orgRepository.findOne({
      where: { id: orgId },
    });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    if (org.type !== OrgType.PROVIDER && org.type !== OrgType.HYBRID) {
      throw new BadRequestException(
        'Only provider or hybrid organizations can publish models',
      );
    }

    const role = await this.organizationsService.getMemberRole(orgId, userId);
    if (!role || !allowedRoles.includes(role)) {
      throw new ForbiddenException(
        'You do not have permission to publish models for this organization',
      );
    }
    return role;
  }

  async createModel(
    name: string,
    description: string,
    type: ModelType,
    taskType: TaskType,
    framework: Framework,
    userId: string,
    isPublic: boolean = false,
    organizationId?: string,
  ): Promise<Model> {
    if (organizationId) {
      await this.assertProviderOrgAccess(organizationId, userId);
    }
    await this.providerLimitsService.assertCanCreateModel(
      organizationId ? OwnerType.ORG : OwnerType.USER,
      organizationId ?? userId,
      type,
      isPublic,
    );

    const configKey = 'price_' + type.toLowerCase();
    const priceConfig = await this.systemConfigRepository.findOne({
      where: { key: configKey },
    });
    const defaultCost = priceConfig ? parseFloat(priceConfig.value) : 0.1;

    const shareConfig = await this.systemConfigRepository.findOne({
      where: { key: 'default_provider_share_percent' },
    });
    const defaultShare = shareConfig ? parseInt(shareConfig.value, 10) : 80;

    const model = this.modelsRepository.create({
      name,
      description,
      type,
      taskType,
      framework,
      user: { id: userId },
      organization: organizationId ? { id: organizationId } : null,
      rlsOrgId: organizationId ?? null,
      isPublic,
      marketplaceVerified: false,
      tier: type === ModelType.DIFFUSION ? 'LARGE' : 'SMALL',
      costPerRequest: defaultCost,
      providerSharePercent: defaultShare,
      hasCustomPricing: false,
    });
    const saved = await this.modelsRepository.save(model);

    const fullModel = await this.modelsRepository.findOne({
      where: { id: saved.id },
      relations: ['organization', 'versions', 'versions.deployments', 'user'],
    });
    if (fullModel) {
      await this.modelsSearchService.indexModel(fullModel);
      await this.recordReviewEvent({
        model: fullModel,
        actorId: userId,
        action: VersionReviewAction.MODEL_CREATED,
        message: organizationId
          ? 'Organization model registry created'
          : 'Personal model registry created',
        metadata: { organizationId: organizationId ?? null },
      });
    }

    return saved;
  }

  async getModels(userId: string, orgId?: string): Promise<Model[]> {
    if (orgId) {
      await this.assertProviderOrgAccess(orgId, userId, [
        OrgRole.OWNER,
        OrgRole.MAINTAINER,
        OrgRole.CONTRIBUTOR,
        OrgRole.VIEWER,
      ]);
      return this.tenantScopeService.runScoped(orgId, (manager) =>
        manager.getRepository(Model).find({
          where: { organization: { id: orgId } },
          relations: [
            'organization',
            'user',
            'versions',
            'versions.uploadedBy',
            'versions.reviewedBy',
            'versions.testCases',
            'versions.deployments',
          ],
          order: { createdAt: 'DESC' },
        }),
      );
    }

    return this.modelsRepository.find({
      where: { user: { id: userId } },
      relations: ['organization', 'versions', 'versions.deployments'],
    });
  }

  async getPublicModels(): Promise<Model[]> {
    return this.modelsRepository.find({
      where: { isPublic: true },
      relations: ['organization', 'versions', 'versions.deployments', 'user'],
    });
  }

  async getPublicModel(modelId: string): Promise<Model> {
    const model = await this.modelsRepository.findOne({
      where: { id: modelId, isPublic: true },
      relations: ['organization', 'versions', 'versions.deployments', 'user'],
    });
    if (!model) {
      throw new NotFoundException('Public model not found');
    }
    return model;
  }

  async getModel(modelId: string, actorId?: string): Promise<Model> {
    const model = await this.modelsRepository.findOne({
      where: { id: modelId },
      relations: [
        'organization',
        'versions',
        'versions.uploadedBy',
        'versions.reviewedBy',
        'versions.testCases',
        'versions.deployments',
        'user',
      ],
    });
    if (!model) {
      throw new NotFoundException('Model not found');
    }
    if (actorId && model.organization) {
      await this.assertProviderOrgAccess(model.organization.id, actorId, [
        OrgRole.OWNER,
        OrgRole.MAINTAINER,
        OrgRole.CONTRIBUTOR,
        OrgRole.VIEWER,
      ]);
    } else if (
      actorId &&
      !model.organization &&
      !model.isPublic &&
      model.user?.id !== actorId
    ) {
      throw new ForbiddenException('You cannot access this private model');
    }
    return model;
  }

  async getVersion(versionId: string): Promise<ModelVersion | null> {
    return this.modelVersionsRepository.findOne({
      where: { id: versionId },
      relations: ['model'],
    });
  }

  async updateVersionStatus(
    versionId: string,
    status: VersionStatus,
  ): Promise<void> {
    await this.modelVersionsRepository.update(versionId, { status });
  }

  async deleteVersion(versionId: string): Promise<void> {
    const version = await this.modelVersionsRepository.findOne({
      where: { id: versionId },
      relations: ['deployments'],
    });
    if (!version) {
      throw new NotFoundException('Model version not found');
    }

    const hasActiveDeployment = version.deployments?.some(
      (d) =>
        d.status === DeploymentStatus.STARTING ||
        d.status === DeploymentStatus.RUNNING,
    );
    if (hasActiveDeployment) {
      throw new BadRequestException(
        'Cannot delete version with active deployments',
      );
    }

    if (version.modelFilePath) {
      await this.minioService.deleteFile(version.modelFilePath);
    }
    if (version.scalerFilePath) {
      await this.minioService.deleteFile(version.scalerFilePath);
    }
    if (version.preprocessFilePath) {
      await this.minioService.deleteFile(version.preprocessFilePath);
    }
    if (version.postprocessFilePath) {
      await this.minioService.deleteFile(version.postprocessFilePath);
    }

    await this.modelVersionsRepository.remove(version);

    const storageDirEnv = process.env.GGUF_STORAGE_PATH;
    const ggufStorageDir = storageDirEnv
      ? join(process.cwd(), storageDirEnv)
      : join(process.cwd(), 'uploads', 'gguf');
    const ggufPath = join(ggufStorageDir, `${versionId}.gguf`);
    if (fs.existsSync(ggufPath)) {
      try {
        fs.unlinkSync(ggufPath);
      } catch (e: unknown) {
        console.warn(
          `Failed to delete local GGUF file ${ggufPath}: ${(e as Error).message || e}`,
        );
      }
    }

    const buildDir = join(process.cwd(), 'uploads', `build-${versionId}`);
    if (fs.existsSync(buildDir)) {
      try {
        fs.rmSync(buildDir, { recursive: true, force: true });
      } catch (e: unknown) {
        console.warn(
          `Failed to delete build directory ${buildDir}: ${(e as Error).message || e}`,
        );
      }
    }

    try {
      await execPromise(`docker rmi -f model-version-${versionId}`);
    } catch (e: unknown) {
      console.warn(
        `Failed to delete Docker image model-version-${versionId}: ${(e as Error).message || e}`,
      );
    }
  }

  async deleteModel(modelId: string): Promise<void> {
    const model = await this.modelsRepository.findOne({
      where: { id: modelId },
      relations: ['versions', 'versions.deployments'],
    });
    if (!model) {
      throw new NotFoundException('Model not found');
    }

    const hasActiveDeployment = model.versions.some((version) =>
      version.deployments?.some(
        (d) =>
          d.status === DeploymentStatus.STARTING ||
          d.status === DeploymentStatus.RUNNING,
      ),
    );
    if (hasActiveDeployment) {
      throw new BadRequestException(
        'Cannot delete model because a version has an active deployment',
      );
    }

    for (const version of model.versions) {
      await this.deleteVersion(version.id);
    }

    await this.modelsSearchService.deleteFromIndex(modelId);
    await this.modelsRepository.remove(model);
  }

  async deprecateVersion(versionId: string): Promise<ModelVersion> {
    const version = await this.modelVersionsRepository.findOne({
      where: { id: versionId },
    });
    if (!version) {
      throw new NotFoundException('Model version not found');
    }
    version.status = VersionStatus.DEPRECATED;
    await this.modelVersionsRepository.save(version);
    return version;
  }

  async undeprecateVersion(versionId: string): Promise<ModelVersion> {
    const version = await this.modelVersionsRepository.findOne({
      where: { id: versionId },
    });
    if (!version) {
      throw new NotFoundException('Model version not found');
    }
    version.status = VersionStatus.READY;
    await this.modelVersionsRepository.save(version);
    return version;
  }

  async getVersionArtifactPreview(
    versionId: string,
    actorId: string,
  ): Promise<{
    artifacts: Array<{
      kind: string;
      path: string | null;
      url: string | null;
      previewable: boolean;
    }>;
  }> {
    const version = await this.modelVersionsRepository.findOne({
      where: { id: versionId },
      relations: ['model', 'model.organization'],
    });
    if (!version) {
      throw new NotFoundException('Model version not found');
    }
    if (version.model.organization) {
      await this.assertProviderOrgAccess(
        version.model.organization.id,
        actorId,
        [
          OrgRole.OWNER,
          OrgRole.MAINTAINER,
          OrgRole.CONTRIBUTOR,
          OrgRole.VIEWER,
        ],
      );
    }

    const entries = [
      ['model', version.modelFilePath],
      ['scaler', version.scalerFilePath],
      ['preprocess.py', version.preprocessFilePath],
      ['postprocess.py', version.postprocessFilePath],
    ] as const;

    const artifacts = await Promise.all(
      entries.map(async ([kind, artifactPath]) => ({
        kind,
        path: artifactPath,
        url: artifactPath
          ? await this.minioService.getFileUrl(artifactPath)
          : null,
        previewable: Boolean(
          artifactPath &&
          (artifactPath.endsWith('.py') ||
            artifactPath.endsWith('.json') ||
            artifactPath.endsWith('.txt')),
        ),
      })),
    );

    return { artifacts };
  }

  async initiateVersionUpload(
    modelId: string,
    dto: InitiateUploadDto,
    uploaderUserId?: string,
  ): Promise<Record<string, unknown>> {
    return this.modelUploadService.initiateVersionUpload(
      modelId,
      dto,
      uploaderUserId,
    );
  }

  async completeVersionUpload(
    modelId: string,
    dto: CompleteUploadDto,
    uploaderUserId?: string,
  ): Promise<ModelVersion> {
    return this.modelUploadService.completeVersionUpload(
      modelId,
      dto,
      uploaderUserId,
    );
  }

  async abortVersionUpload(
    modelId: string,
    dto: AbortUploadDto,
    requestingUserId?: string,
  ): Promise<{ success: boolean }> {
    return this.modelUploadService.abortVersionUpload(
      modelId,
      dto,
      requestingUserId,
    );
  }

  async confirmSchemaDetection(
    versionId: string,
    actorId: string,
    examplePayload?: string,
    expectedResult?: string,
  ): Promise<ModelVersion> {
    return this.modelUploadService.confirmSchemaDetection(
      versionId,
      actorId,
      examplePayload,
      expectedResult,
    );
  }

  async startBuild(
    versionId: string,
    examplePayload?: string,
    expectedResult?: string,
    classLabels?: string | Record<string, unknown>,
  ): Promise<ModelVersion> {
    return this.modelUploadService.startBuild(
      versionId,
      examplePayload,
      expectedResult,
      classLabels,
    );
  }

  async addVersionTestCase(
    versionId: string,
    actorId: string,
    body: {
      name: string;
      payload: string;
      expectedResult?: string;
      notes?: string;
    },
  ): Promise<ModelVersionTestCase> {
    return this.modelTestCaseService.addVersionTestCase(
      versionId,
      actorId,
      body,
    );
  }

  async getVersionTestCases(
    versionId: string,
    actorId: string,
  ): Promise<ModelVersionTestCase[]> {
    return this.modelTestCaseService.getVersionTestCases(versionId, actorId);
  }

  async reviewVersion(
    versionId: string,
    reviewerId: string,
    decision: 'approve' | 'decline',
    comment?: string,
  ): Promise<ModelVersion> {
    return this.modelReviewService.reviewVersion(
      versionId,
      reviewerId,
      decision,
      comment,
    );
  }

  async getModelHistory(
    modelId: string,
    actorId: string,
  ): Promise<ModelVersionReviewEvent[]> {
    return this.modelReviewService.getModelHistory(modelId, actorId);
  }

  async createOrUpdateReview(
    userId: string,
    modelId: string,
    dto: CreateReviewDto,
  ): Promise<ModelReview> {
    return this.modelReviewService.createOrUpdateReview(userId, modelId, dto);
  }

  async deleteReview(userId: string, modelId: string): Promise<void> {
    return this.modelReviewService.deleteReview(userId, modelId);
  }

  async getReviews(modelId: string): Promise<ModelReview[]> {
    return this.modelReviewService.getReviews(modelId);
  }

  async updateCacheSettings(
    modelId: string,
    updates: {
      cacheEnabled?: boolean;
      cacheTtlSeconds?: number;
      cacheHitDiscountPercent?: number;
    },
  ): Promise<Model> {
    return this.modelSettingsService.updateCacheSettings(modelId, updates);
  }

  async updateNetworkSettings(
    modelId: string,
    allowEgress: boolean,
  ): Promise<Model> {
    return this.modelSettingsService.updateNetworkSettings(
      modelId,
      allowEgress,
    );
  }

  async updateVisibilitySettings(
    modelId: string,
    isPublic: boolean,
  ): Promise<Model> {
    return this.modelSettingsService.updateVisibilitySettings(
      modelId,
      isPublic,
    );
  }

  async getOrganizationModelAnalytics(orgId: string, actorId: string) {
    return this.modelAnalyticsService.getOrganizationModelAnalytics(
      orgId,
      actorId,
    );
  }

  async recordReviewEvent(options: {
    model: Model;
    version?: ModelVersion | null;
    actorId?: string | null;
    action: VersionReviewAction;
    message?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<void> {
    return this.modelReviewService.recordReviewEvent(options);
  }
}
