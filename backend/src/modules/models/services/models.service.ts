import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';

const execPromise = promisify(exec);
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import { Model } from '../entities/model.entity';
import { ModelVersion } from '../entities/model-version.entity';
import { ModelVersionTestCase } from '../entities/model-version-test-case.entity';
import { ModelVersionReviewEvent } from '../entities/model-version-review-event.entity';
import { VersionStatus } from '../enums/version-status.enum';
import { VersionReviewStatus } from '../enums/version-review-status.enum';
import { VersionReviewAction } from '../enums/version-review-action.enum';
import { ModelType } from '../enums/model-type.enum';
import { TaskType } from '../enums/task-type.enum';
import { Framework } from '../enums/framework.enum';
import { ModelsRepository } from '../repositories/models.repository';
import { ModelVersionsRepository } from '../repositories/model-versions.repository';
import { MinioService } from '../../../shared/minio/minio.service';
import { DeploymentStatus } from '../../deployments/enums/deployment-status.enum';
import { ModelsSearchService } from './models-search.service';
import { SystemConfig } from '../../wallets/entities/system-config.entity';
import { OrganizationsService } from '../../organizations/services/organizations.service';
import { OrgType } from '../../organizations/enums/org-type.enum';
import { OrgRole } from '../../../shared/enums/org-role.enum';

/**
 * Service managing model registration, listing, version uploads, MinIO storage sync,
 * deletion cascades, and build queue dispatching.
 */
@Injectable()
export class ModelsService {
  constructor(
    private readonly modelsRepository: ModelsRepository,
    private readonly modelVersionsRepository: ModelVersionsRepository,
    @InjectQueue('build-queue') private readonly buildQueue: Queue,
    private readonly minioService: MinioService,
    private readonly modelsSearchService: ModelsSearchService,
    @InjectRepository(SystemConfig)
    private readonly systemConfigRepository: Repository<SystemConfig>,
    @InjectRepository(ModelVersionTestCase)
    private readonly testCaseRepository: Repository<ModelVersionTestCase>,
    @InjectRepository(ModelVersionReviewEvent)
    private readonly reviewEventRepository: Repository<ModelVersionReviewEvent>,
    @Inject(forwardRef(() => OrganizationsService))
    private readonly organizationsService: OrganizationsService,
  ) {}

  private async assertProviderOrgAccess(
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
      throw new ForbiddenException('Insufficient organization permissions');
    }
    return role;
  }

  private async recordReviewEvent(params: {
    model: Model;
    version?: ModelVersion | null;
    actorId?: string | null;
    action: VersionReviewAction;
    message?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<void> {
    const event = this.reviewEventRepository.create({
      model: params.model,
      version: params.version ?? null,
      actor: params.actorId ? ({ id: params.actorId } as any) : null,
      action: params.action,
      message: params.message ?? null,
      metadata: params.metadata ?? null,
    });
    await this.reviewEventRepository.save(event);
  }

  /**
   * Registers a new model name and description under a specific user account.
   *
   * @param name - The human-readable name of the model.
   * @param description - The description explaining what the model does.
   * @param type - The model type (tabular, nlp, vision, etc.).
   * @param taskType - The task category (classification, regression, generation, etc.).
   * @param framework - The development framework (scikit-learn, pytorch, gguf, etc.).
   * @param userId - The UUID of the authenticated member creating the model.
   * @param isPublic - Visibility flag for marketplace exposure.
   * @param organizationId - Optional organization workspace that should own the model.
   * @returns A promise resolving to the created Model entity.
   */
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
    // Retrieve global type price default
    const configKey = 'price_' + type.toLowerCase();
    const priceConfig = await this.systemConfigRepository.findOne({
      where: { key: configKey },
    });
    const defaultCost = priceConfig ? parseFloat(priceConfig.value) : 0.1;

    // Retrieve default provider share default
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
      isPublic,
      marketplaceVerified: false,
      tier: type === ModelType.DIFFUSION ? 'LARGE' : 'SMALL',
      costPerRequest: defaultCost,
      providerSharePercent: defaultShare,
      hasCustomPricing: false,
    });
    const saved = await this.modelsRepository.save(model);

    // Index in OpenSearch — load with relations so the document is complete
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

  /**
   * Retrieves all models registered by a user, including their versions and deployments.
   *
   * @param userId - The UUID of the owner.
   * @returns A promise resolving to an array of Model entities.
   */
  async getModels(userId: string, orgId?: string): Promise<Model[]> {
    if (orgId) {
      await this.assertProviderOrgAccess(orgId, userId, [
        OrgRole.OWNER,
        OrgRole.MAINTAINER,
        OrgRole.CONTRIBUTOR,
        OrgRole.VIEWER,
      ]);
      return this.modelsRepository.find({
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
      });
    }

    return this.modelsRepository.find({
      where: { user: { id: userId } },
      relations: ['organization', 'versions', 'versions.deployments'],
    });
  }

  /**
   * Retrieves all public models in the registry for the marketplace.
   * Includes their owner user and version history details.
   *
   * @returns A promise resolving to an array of public Model entities.
   */
  async getPublicModels(): Promise<Model[]> {
    return this.modelsRepository.find({
      where: { isPublic: true },
      relations: ['organization', 'versions', 'versions.deployments', 'user'],
    });
  }

  /**
   * Retrieves a single public model by ID.
   *
   * @param modelId - The UUID of the public model to fetch.
   * @returns A promise resolving to the Model entity.
   * @throws {NotFoundException} If the model does not exist or is not public.
   */
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

  /**
   * Retrieves metadata and history for a specific model.
   *
   * @param modelId - The UUID of the model to fetch.
   * @returns A promise resolving to the Model entity.
   * @throws {NotFoundException} If the model does not exist.
   */
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

  /**
   * Uploads model artifact files (weights, scalers, and scripting hooks) to MinIO,
   * registers a new ModelVersion, and triggers a background build job.
   *
   * If a file is omitted, it defaults to the file from the previous version if available.
   *
   * @param modelId - The parent model UUID.
   * @param files - Uploaded Multer files containing artifacts.
   * @param examplePayload - A JSON string sample request payload.
   * @param expectedResult - A JSON string sample response output.
   * @returns A promise resolving to the created ModelVersion entity.
   * @throws {NotFoundException} If the parent model does not exist.
   * @throws {BadRequestException} If required file is missing and no previous version exists.
   */
  async uploadVersion(
    modelId: string,
    files: {
      model?: Express.Multer.File[];
      scaler?: Express.Multer.File[];
      preprocess?: Express.Multer.File[];
      postprocess?: Express.Multer.File[];
    },
    examplePayload?: string,
    expectedResult?: string,
    triggerBuild?: string,
    uploaderUserId?: string,
  ): Promise<ModelVersion> {
    const model = await this.modelsRepository.findOne({
      where: { id: modelId },
      relations: ['versions', 'user', 'organization'],
    });
    if (!model) {
      throw new NotFoundException('Model not found');
    }
    if (model.organization) {
      if (!uploaderUserId) {
        throw new ForbiddenException('Missing authenticated uploader');
      }
      await this.assertProviderOrgAccess(model.organization.id, uploaderUserId, [
        OrgRole.OWNER,
        OrgRole.MAINTAINER,
        OrgRole.CONTRIBUTOR,
      ]);
    } else if (uploaderUserId && model.user?.id !== uploaderUserId) {
      throw new ForbiddenException('Only the model owner can upload versions');
    }

    const versionNumber = model.versions.length + 1;
    let prevVersion: ModelVersion | null = null;
    if (model.versions.length > 0) {
      prevVersion = [...model.versions].sort(
        (a, b) => b.versionNumber - a.versionNumber,
      )[0];
    }

    const ownerScope =
      model.organization?.slug ??
      (model.user?.email ? model.user.email.split('@')[0] : 'unknown');
    const sanitizedOwnerScope = ownerScope
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toLowerCase();
    const sanitizedName = model.name
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toLowerCase();

    // Auto-detect schema prior to uploading and deleting the local file if schemas are not fully provided
    let detectedExamplePayload: string | null = null;
    let detectedExpectedResult: string | null = null;

    if (files.model?.[0] && (!examplePayload || !expectedResult)) {
      try {
        const scriptPath = join(
          process.cwd(),
          'src',
          'shared',
          'utils',
          'detect_schema.py',
        );
        const command = `python "${scriptPath}" "${files.model[0].path}"`;
        const { stdout } = await execPromise(command);
        const result = JSON.parse(stdout) as Record<string, unknown>;
        if (result && !result.error) {
          if (typeof result.example_payload === 'string') {
            detectedExamplePayload = result.example_payload;
          }
          if (typeof result.expected_result === 'string') {
            detectedExpectedResult = result.expected_result;
          }
        }
      } catch (err: unknown) {
        console.warn(
          `Failed to auto-detect schema during upload: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    const uploadToMinio = async (
      file: Express.Multer.File | undefined,
      prefix: string,
    ): Promise<string | null> => {
      if (!file) {
        return null;
      }
      const objectName = `${sanitizedOwnerScope}/${sanitizedName}/v${versionNumber}/${prefix}-${file.originalname}`;
      await this.minioService.uploadFile(objectName, file.path, file.mimetype);
      try {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`Failed to cleanup temp upload file: ${message}`);
      }
      return objectName;
    };

    const modelObjName = await uploadToMinio(files.model?.[0], 'model');
    const scalerObjName = await uploadToMinio(files.scaler?.[0], 'scaler');
    const preprocessObjName = await uploadToMinio(
      files.preprocess?.[0],
      'preprocess',
    );
    const postprocessObjName = await uploadToMinio(
      files.postprocess?.[0],
      'postprocess',
    );

    const finalModelPath = modelObjName || prevVersion?.modelFilePath;
    if (!finalModelPath) {
      throw new BadRequestException(
        'Model weights file is required for the first version',
      );
    }

    const modelVersion = this.modelVersionsRepository.create({
      model,
      uploadedBy: uploaderUserId ? ({ id: uploaderUserId } as any) : null,
      versionNumber,
      status: model.organization ? VersionStatus.UPLOADED : VersionStatus.UPLOADED,
      reviewStatus: model.organization
        ? VersionReviewStatus.PENDING
        : VersionReviewStatus.NOT_REQUIRED,
      modelFilePath: finalModelPath,
      scalerFilePath: scalerObjName || prevVersion?.scalerFilePath || null,
      preprocessFilePath:
        preprocessObjName || prevVersion?.preprocessFilePath || null,
      postprocessFilePath:
        postprocessObjName || prevVersion?.postprocessFilePath || null,
      examplePayload:
        examplePayload ||
        detectedExamplePayload ||
        prevVersion?.examplePayload ||
        null,
      expectedResult:
        expectedResult ||
        detectedExpectedResult ||
        prevVersion?.expectedResult ||
        null,
    });

    const savedVersion = await this.modelVersionsRepository.save(modelVersion);

    await this.recordReviewEvent({
      model,
      version: savedVersion,
      actorId: uploaderUserId,
      action: VersionReviewAction.VERSION_SUBMITTED,
      message: model.organization
        ? `Version v${versionNumber} submitted for maintainer review`
        : `Version v${versionNumber} uploaded`,
      metadata: {
        reviewRequired: Boolean(model.organization),
        files: {
          model: Boolean(modelObjName),
          scaler: Boolean(scalerObjName),
          preprocess: Boolean(preprocessObjName),
          postprocess: Boolean(postprocessObjName),
        },
      },
    });

    if (!model.organization && triggerBuild !== 'false') {
      // Dispatch job to build queue
      await this.buildQueue.add('build-model', { versionId: savedVersion.id });
    }

    return savedVersion;
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
    const version = await this.modelVersionsRepository.findOne({
      where: { id: versionId },
      relations: ['model', 'model.organization'],
    });
    if (!version) {
      throw new NotFoundException('Model version not found');
    }
    if (version.model.organization) {
      await this.assertProviderOrgAccess(version.model.organization.id, actorId);
    }

    const testCase = this.testCaseRepository.create({
      version,
      createdBy: { id: actorId } as any,
      name: body.name,
      payload: body.payload,
      expectedResult: body.expectedResult ?? null,
      notes: body.notes ?? null,
    });
    const saved = await this.testCaseRepository.save(testCase);
    await this.recordReviewEvent({
      model: version.model,
      version,
      actorId,
      action: VersionReviewAction.TEST_CASE_ADDED,
      message: `Test case saved: ${body.name}`,
    });
    return saved;
  }

  async getVersionTestCases(
    versionId: string,
    actorId: string,
  ): Promise<ModelVersionTestCase[]> {
    const version = await this.modelVersionsRepository.findOne({
      where: { id: versionId },
      relations: ['model', 'model.organization'],
    });
    if (!version) {
      throw new NotFoundException('Model version not found');
    }
    if (version.model.organization) {
      await this.assertProviderOrgAccess(version.model.organization.id, actorId, [
        OrgRole.OWNER,
        OrgRole.MAINTAINER,
        OrgRole.CONTRIBUTOR,
        OrgRole.VIEWER,
      ]);
    }
    return this.testCaseRepository.find({
      where: { version: { id: versionId } },
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async reviewVersion(
    versionId: string,
    reviewerId: string,
    decision: 'approve' | 'decline',
    comment?: string,
  ): Promise<ModelVersion> {
    const version = await this.modelVersionsRepository.findOne({
      where: { id: versionId },
      relations: ['model', 'model.organization'],
    });
    if (!version) {
      throw new NotFoundException('Model version not found');
    }
    const orgId = version.model.organization?.id;
    if (!orgId) {
      throw new BadRequestException('Personal model versions do not need review');
    }
    await this.assertProviderOrgAccess(orgId, reviewerId, [
      OrgRole.OWNER,
      OrgRole.MAINTAINER,
    ]);

    version.reviewStatus =
      decision === 'approve'
        ? VersionReviewStatus.APPROVED
        : VersionReviewStatus.DECLINED;
    version.reviewedBy = { id: reviewerId } as any;
    version.reviewComment = comment ?? null;
    version.reviewedAt = new Date();

    if (decision === 'approve') {
      version.status = VersionStatus.BUILDING;
      version.model.marketplaceVerified = true;
      version.model.isPublic = true;
      await this.modelsRepository.save(version.model);
      await this.buildQueue.add('build-model', { versionId: version.id });
      const indexedModel = await this.modelsRepository.findOne({
        where: { id: version.model.id },
        relations: ['organization', 'user', 'versions', 'versions.deployments'],
      });
      if (indexedModel) {
        await this.modelsSearchService.indexModel(indexedModel);
      }
    }

    const saved = await this.modelVersionsRepository.save(version);
    await this.recordReviewEvent({
      model: version.model,
      version,
      actorId: reviewerId,
      action:
        decision === 'approve'
          ? VersionReviewAction.REVIEW_APPROVED
          : VersionReviewAction.REVIEW_DECLINED,
      message: comment ?? `Version ${decision}d by maintainer`,
    });
    if (decision === 'approve') {
      await this.recordReviewEvent({
        model: version.model,
        version,
        actorId: reviewerId,
        action: VersionReviewAction.BUILD_STARTED,
        message: 'Build started after maintainer approval',
      });
    }
    return saved;
  }

  async getModelHistory(
    modelId: string,
    actorId: string,
  ): Promise<ModelVersionReviewEvent[]> {
    const model = await this.modelsRepository.findOne({
      where: { id: modelId },
      relations: ['organization'],
    });
    if (!model) {
      throw new NotFoundException('Model not found');
    }
    if (model.organization) {
      await this.assertProviderOrgAccess(model.organization.id, actorId, [
        OrgRole.OWNER,
        OrgRole.MAINTAINER,
        OrgRole.CONTRIBUTOR,
        OrgRole.VIEWER,
      ]);
    }
    return this.reviewEventRepository.find({
      where: { model: { id: modelId } },
      relations: ['actor', 'version'],
      order: { createdAt: 'DESC' },
    });
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
      await this.assertProviderOrgAccess(version.model.organization.id, actorId, [
        OrgRole.OWNER,
        OrgRole.MAINTAINER,
        OrgRole.CONTRIBUTOR,
        OrgRole.VIEWER,
      ]);
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
        url: artifactPath ? await this.minioService.getFileUrl(artifactPath) : null,
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

  async getOrganizationModelAnalytics(orgId: string, actorId: string) {
    await this.assertProviderOrgAccess(orgId, actorId, [
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

    const byUploader = new Map<string, { name: string; models: number; versions: number }>();
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
    };
  }

  /**
   * Finalizes the schema configuration for a version and triggers the container building process.
   *
   * @param versionId - The model version UUID.
   * @param examplePayload - Optional updated request payload.
   * @param expectedResult - Optional updated response output.
   * @returns A promise resolving to the updated ModelVersion.
   * @throws {NotFoundException} If the version does not exist.
   */
  async startBuild(
    versionId: string,
    examplePayload?: string,
    expectedResult?: string,
  ): Promise<ModelVersion> {
    const version = await this.modelVersionsRepository.findOne({
      where: { id: versionId },
    });

    if (!version) {
      throw new NotFoundException(`Model version ${versionId} not found.`);
    }

    if (examplePayload) {
      version.examplePayload = examplePayload;
    }
    if (expectedResult) {
      version.expectedResult = expectedResult;
    }

    version.status = VersionStatus.BUILDING;
    const savedVersion = await this.modelVersionsRepository.save(version);

    // Dispatch job to build queue
    await this.buildQueue.add('build-model', { versionId: savedVersion.id });

    return savedVersion;
  }

  /**
   * Retrieves metadata for a specific model version, including parent model context.
   *
   * @param versionId - The version UUID.
   * @returns A promise resolving to the ModelVersion entity or null if not found.
   */
  async getVersion(versionId: string): Promise<ModelVersion | null> {
    return this.modelVersionsRepository.findOne({
      where: { id: versionId },
      relations: ['model'],
    });
  }

  /**
   * Updates the build or deployment status of a model version.
   *
   * @param versionId - The version UUID.
   * @param status - The new status value.
   */
  async updateVersionStatus(
    versionId: string,
    status: VersionStatus,
  ): Promise<void> {
    await this.modelVersionsRepository.update(versionId, { status });
  }

  /**
   * Deletes a specific model version from database and MinIO storage bucket.
   *
   * @param versionId - The model version UUID.
   * @throws {NotFoundException} If the model version is not found.
   * @throws {BadRequestException} If the version has any active deployments.
   */
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

    // Delete files from MinIO
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

    // Delete DB record
    await this.modelVersionsRepository.remove(version);

    // Delete local GGUF file if it exists
    const storageDirEnv = process.env.GGUF_STORAGE_PATH;
    const ggufStorageDir = storageDirEnv
      ? join(process.cwd(), storageDirEnv)
      : join(process.cwd(), 'uploads', 'gguf-models');
    const ggufPath = join(ggufStorageDir, `${versionId}.gguf`);
    if (fs.existsSync(ggufPath)) {
      try {
        fs.unlinkSync(ggufPath);
      } catch (e: any) {
        console.warn(`Failed to delete local GGUF file ${ggufPath}: ${e.message || e}`);
      }
    }

    // Delete Docker image
    try {
      await execPromise(`docker rmi -f model-version-${versionId}`);
    } catch (e: any) {
      console.warn(
        `Failed to delete Docker image model-version-${versionId}: ${e.message || e}`,
      );
    }
  }

  /**
   * Deletes a parent model and all of its versions/artifacts from storage.
   *
   * @param modelId - The model UUID.
   * @throws {NotFoundException} If the model is not found.
   * @throws {BadRequestException} If any version of the model is currently deployed.
   */
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

    // Delete all versions and their files first
    for (const version of model.versions) {
      await this.deleteVersion(version.id);
    }

    // Remove from OpenSearch before deleting DB record
    await this.modelsSearchService.deleteFromIndex(modelId);

    // Delete model
    await this.modelsRepository.remove(model);
  }

  /**
   * Updates model version status to DEPRECATED.
   */
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

  /**
   * Updates model version status to READY.
   */
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
}
