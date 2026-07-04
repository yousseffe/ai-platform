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
import { join, dirname } from 'path';

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
import { ModelReview } from '../entities/model-review.entity';
import { ApiKey } from '../../auth/entities/api-key.entity';
import { CreateReviewDto } from '../dto/create-review.dto';
import { InitiateUploadDto } from '../dto/initiate-upload.dto';
import { CompleteUploadDto } from '../dto/complete-upload.dto';
import { AbortUploadDto } from '../dto/abort-upload.dto';
import { VersionStatus } from '../enums/version-status.enum';
import { VersionReviewStatus } from '../enums/version-review-status.enum';
import { VersionReviewAction } from '../enums/version-review-action.enum';
import { SchemaDetectionStatus } from '../enums/schema-detection-status.enum';
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
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { ProviderLimitsService } from '../../provider-accounts/services/provider-limits.service';
import { TenantScopeService } from '../../../shared/security/tenant-scope.service';

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
    @InjectRepository(ModelReview)
    private readonly modelReviewRepository: Repository<ModelReview>,
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
    @Inject(forwardRef(() => OrganizationsService))
    private readonly organizationsService: OrganizationsService,
    private readonly providerLimitsService: ProviderLimitsService,
    private readonly tenantScopeService: TenantScopeService,
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
      actor: params.actorId ? { id: params.actorId } : null,
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
    await this.providerLimitsService.assertCanCreateModel(
      organizationId ? OwnerType.ORG : OwnerType.USER,
      organizationId ?? userId,
      type,
      isPublic,
    );
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
      rlsOrgId: organizationId ?? null,
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
      // Defense-in-depth: run the org-scoped listing under Postgres RLS (see
      // shared/migrations/enable-row-level-security.sql) in addition to the
      // WHERE clause below, so a future bug in this filter still can't leak
      // another organization's models.
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
   * Updates a model's response cache policy fields, leaving any field not
   * present in `updates` unchanged.
   *
   * @param modelId - The UUID of the model to update.
   * @param updates - Partial cache policy fields.
   * @throws {NotFoundException} If the model does not exist.
   */
  async updateCacheSettings(
    modelId: string,
    updates: {
      cacheEnabled?: boolean;
      cacheTtlSeconds?: number;
      cacheHitDiscountPercent?: number;
    },
  ): Promise<Model> {
    const model = await this.modelsRepository.findOne({
      where: { id: modelId },
    });
    if (!model) {
      throw new NotFoundException('Model not found');
    }

    if (updates.cacheEnabled !== undefined) {
      model.cacheEnabled = updates.cacheEnabled;
    }
    if (updates.cacheTtlSeconds !== undefined) {
      model.cacheTtlSeconds = updates.cacheTtlSeconds;
    }
    if (updates.cacheHitDiscountPercent !== undefined) {
      model.cacheHitDiscountPercent = updates.cacheHitDiscountPercent;
    }

    return this.modelsRepository.save(model);
  }

  /**
   * Updates a model's container network policy (outbound internet access).
   * Only takes effect on the next deployment — an already-RUNNING container
   * keeps whichever network it was started on.
   *
   * @param modelId - The UUID of the model to update.
   * @param allowEgress - Whether future deployments may reach the internet.
   * @throws {NotFoundException} If the model does not exist.
   */
  async updateNetworkSettings(
    modelId: string,
    allowEgress: boolean,
  ): Promise<Model> {
    const model = await this.modelsRepository.findOne({
      where: { id: modelId },
    });
    if (!model) {
      throw new NotFoundException('Model not found');
    }

    model.allowEgress = allowEgress;
    return this.modelsRepository.save(model);
  }

  /**
   * Updates a model's marketplace visibility flag.
   *
   * @param modelId - The UUID of the model to update.
   * @param isPublic - Whether the model should be listed in the public marketplace.
   * @throws {NotFoundException} If the model does not exist.
   */
  async updateVisibilitySettings(
    modelId: string,
    isPublic: boolean,
  ): Promise<Model> {
    const model = await this.modelsRepository.findOne({
      where: { id: modelId },
    });
    if (!model) {
      throw new NotFoundException('Model not found');
    }

    model.isPublic = isPublic;
    return this.modelsRepository.save(model);
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
  async initiateVersionUpload(
    modelId: string,
    dto: InitiateUploadDto,
    uploaderUserId?: string,
  ): Promise<any> {
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
      await this.assertProviderOrgAccess(
        model.organization.id,
        uploaderUserId,
        [OrgRole.OWNER, OrgRole.MAINTAINER, OrgRole.CONTRIBUTOR],
      );
    } else if (uploaderUserId && model.user?.id !== uploaderUserId) {
      throw new ForbiddenException('Only the model owner can upload versions');
    }

    const versionNumber = model.versions.length + 1;
    const ownerScope =
      model.organization?.slug ??
      (model.user?.email ? model.user.email.split('@')[0] : 'unknown');
    const sanitizedOwnerScope = ownerScope
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toLowerCase();
    const sanitizedName = model.name
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toLowerCase();

    const result: any = {
      versionNumber,
      model: {},
    };

    // Calculate chunks for model file
    const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB
    const chunkCount = Math.ceil(dto.modelSize / CHUNK_SIZE);
    if (chunkCount === 0) {
      throw new BadRequestException('modelSize must be greater than 0');
    }
    const modelObjectKey = `${sanitizedOwnerScope}/${sanitizedName}/v${versionNumber}/model-${dto.modelFilename}`;
    const uploadId = await this.minioService.initiateMultipartUpload(
      modelObjectKey,
      'application/octet-stream',
    );
    const urls: { partNumber: number; url: string }[] = [];

    for (let i = 1; i <= chunkCount; i++) {
      const url = await this.minioService.generatePresignedUrlForPut(
        modelObjectKey,
        uploadId,
        i,
      );
      urls.push({ partNumber: i, url });
    }

    result.model = {
      objectKey: modelObjectKey,
      uploadId,
      chunkSize: CHUNK_SIZE,
      urls,
    };

    if (dto.scalerFilename) {
      const objectKey = `${sanitizedOwnerScope}/${sanitizedName}/v${versionNumber}/scaler-${dto.scalerFilename}`;
      const url = await this.minioService.generatePresignedUrlForPut(objectKey);
      result.scaler = { objectKey, url };
    }

    if (dto.preprocessFilename) {
      const objectKey = `${sanitizedOwnerScope}/${sanitizedName}/v${versionNumber}/preprocess-${dto.preprocessFilename}`;
      const url = await this.minioService.generatePresignedUrlForPut(objectKey);
      result.preprocess = { objectKey, url };
    }

    if (dto.postprocessFilename) {
      const objectKey = `${sanitizedOwnerScope}/${sanitizedName}/v${versionNumber}/postprocess-${dto.postprocessFilename}`;
      const url = await this.minioService.generatePresignedUrlForPut(objectKey);
      result.postprocess = { objectKey, url };
    }

    return result;
  }

  async completeVersionUpload(
    modelId: string,
    dto: CompleteUploadDto,
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
      await this.providerLimitsService.assertCanCreateModelVersion(
        OwnerType.ORG,
        model.organization.id,
        model.id,
      );
    } else if (uploaderUserId && model.user?.id !== uploaderUserId) {
      throw new ForbiddenException('Only the model owner can upload versions');
    } else {
      await this.providerLimitsService.assertCanCreateModelVersion(
        OwnerType.USER,
        model.user.id,
        model.id,
      );
    }

    const versionNumber = model.versions.length + 1;
    let prevVersion: ModelVersion | null = null;
    if (model.versions.length > 0) {
      prevVersion = [...model.versions].sort(
        (a, b) => b.versionNumber - a.versionNumber,
      )[0];
    }

    // Complete the multipart upload
    const modelObjectKey = dto.model.objectKey;
    const uploadId = dto.model.uploadId;

    this.assertPartsAreContiguous(dto.model.parts);

    if (this.minioService.isFallbackActive()) {
      // Stitch file chunks locally
      const targetPath = join(
        process.cwd(),
        'uploads',
        'local-s3',
        'models',
        modelObjectKey,
      );
      const targetDir = dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const writeStream = fs.createWriteStream(targetPath);
      // Sort parts by part number
      const sortedParts = [...dto.model.parts].sort((a, b) => a.partNumber - b.partNumber);

      for (const part of sortedParts) {
        const partPath = `${targetPath}.part-${part.partNumber}`;
        if (!fs.existsSync(partPath)) {
          throw new BadRequestException(`Missing chunk part ${part.partNumber}`);
        }
        const chunkBuffer = fs.readFileSync(partPath);
        writeStream.write(chunkBuffer);
        // Clean up part file
        try {
          fs.unlinkSync(partPath);
        } catch (e) {
          console.warn(`Failed to delete part file: ${partPath}`, e);
        }
      }
      writeStream.end();
    } else {
      // Call Minio to complete the multipart upload
      const mappedParts = dto.model.parts.map(p => ({
        part: p.partNumber,
        etag: p.etag,
      }));
      await this.minioService.completeMultipartUpload(
        modelObjectKey,
        uploadId,
        mappedParts,
      );
    }

    const finalModelPath = modelObjectKey;
    const scalerPath = dto.scaler?.objectKey || prevVersion?.scalerFilePath || null;
    const preprocessPath = dto.preprocess?.objectKey || prevVersion?.preprocessFilePath || null;
    const postprocessPath = dto.postprocess?.objectKey || prevVersion?.postprocessFilePath || null;

    const parseJsonSafely = (val?: string): Record<string, any> | null => {
      if (!val) return null;
      try {
        return typeof val === 'string' ? JSON.parse(val) : val;
      } catch {
        return null;
      }
    };

    const examplePayload = dto.examplePayload || prevVersion?.examplePayload || null;
    const expectedResult = dto.expectedResult || prevVersion?.expectedResult || null;

    // Providing either field fresh always means "manually supplied this time".
    // Otherwise, if a value was inherited from the previous version, carry its
    // review status forward; if there's nothing at all, detection is deferred
    // to the build pipeline (B3/Part D).
    let schemaDetectionStatus: SchemaDetectionStatus;
    if (dto.examplePayload || dto.expectedResult) {
      schemaDetectionStatus = SchemaDetectionStatus.MANUAL;
    } else if (examplePayload || expectedResult) {
      schemaDetectionStatus =
        prevVersion?.schemaDetectionStatus ?? SchemaDetectionStatus.MANUAL;
    } else {
      schemaDetectionStatus = SchemaDetectionStatus.PENDING;
    }

    const modelVersion = this.modelVersionsRepository.create({
      model,
      uploadedBy: uploaderUserId ? { id: uploaderUserId } : null,
      versionNumber,
      status: VersionStatus.UPLOADED,
      reviewStatus: model.organization
        ? VersionReviewStatus.PENDING
        : VersionReviewStatus.NOT_REQUIRED,
      modelFilePath: finalModelPath,
      scalerFilePath: scalerPath,
      preprocessFilePath: preprocessPath,
      postprocessFilePath: postprocessPath,
      examplePayload,
      expectedResult,
      classLabels: parseJsonSafely(dto.classLabels) || prevVersion?.classLabels || null,
      schemaDetectionStatus,
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
          model: true,
          scaler: Boolean(dto.scaler?.objectKey),
          preprocess: Boolean(dto.preprocess?.objectKey),
          postprocess: Boolean(dto.postprocess?.objectKey),
        },
      },
    });

    if (!model.organization && dto.triggerBuild !== 'false') {
      await this.buildQueue.add('build-model', { versionId: savedVersion.id });
    }

    return savedVersion;
  }

  /**
   * Verifies that a collected set of multipart upload parts is exactly
   * contiguous from 1..N with no gaps or duplicates before allowing the
   * upload to be completed. Defense-in-depth alongside the client-side check.
   *
   * @param parts - The parts reported as uploaded by the client.
   * @throws {BadRequestException} If parts are missing, duplicated, or non-contiguous.
   */
  private assertPartsAreContiguous(parts: { partNumber: number }[]): void {
    if (!parts || parts.length === 0) {
      throw new BadRequestException('No uploaded parts were provided');
    }
    const sortedPartNumbers = [...parts]
      .map((p) => p.partNumber)
      .sort((a, b) => a - b);

    for (let i = 0; i < sortedPartNumbers.length; i++) {
      if (sortedPartNumbers[i] !== i + 1) {
        throw new BadRequestException(
          'Uploaded parts must be contiguous starting at 1, with no gaps or duplicates',
        );
      }
    }
  }

  /**
   * Aborts an in-progress multipart upload session, releasing any orphaned
   * storage-side state so it does not leak. Reuses the same ownership/access
   * checks as {@link initiateVersionUpload} and {@link completeVersionUpload}.
   *
   * @param modelId - The parent model UUID.
   * @param dto - The object key and upload session ID to abort.
   * @param requestingUserId - The authenticated caller's user UUID.
   * @throws {NotFoundException} If the model does not exist.
   * @throws {ForbiddenException} If the caller does not own the model/organization.
   */
  async abortVersionUpload(
    modelId: string,
    dto: AbortUploadDto,
    requestingUserId?: string,
  ): Promise<{ success: boolean }> {
    const model = await this.modelsRepository.findOne({
      where: { id: modelId },
      relations: ['versions', 'user', 'organization'],
    });
    if (!model) {
      throw new NotFoundException('Model not found');
    }
    if (model.organization) {
      if (!requestingUserId) {
        throw new ForbiddenException('Missing authenticated uploader');
      }
      await this.assertProviderOrgAccess(
        model.organization.id,
        requestingUserId,
        [OrgRole.OWNER, OrgRole.MAINTAINER, OrgRole.CONTRIBUTOR],
      );
    } else if (requestingUserId && model.user?.id !== requestingUserId) {
      throw new ForbiddenException('Only the model owner can abort uploads');
    }

    await this.minioService.abortMultipartUpload(dto.objectKey, dto.uploadId);
    return { success: true };
  }

  /**
   * Lets the provider review and, optionally, correct a schema that was
   * auto-detected during the build pipeline, marking it as confirmed.
   * Safe to call regardless of the version's current schema status.
   *
   * @param versionId - The model version's UUID.
   * @param actorId - The authenticated caller's user UUID.
   * @param examplePayload - Optional replacement sample request JSON.
   * @param expectedResult - Optional replacement sample response JSON.
   * @throws {NotFoundException} If the version does not exist.
   * @throws {ForbiddenException} If the caller does not own the model/organization.
   */
  async confirmSchemaDetection(
    versionId: string,
    actorId: string,
    examplePayload?: string,
    expectedResult?: string,
  ): Promise<ModelVersion> {
    const version = await this.modelVersionsRepository.findOne({
      where: { id: versionId },
      relations: ['model', 'model.organization', 'model.user'],
    });
    if (!version) {
      throw new NotFoundException('Model version not found');
    }
    const model = version.model;
    if (model.organization) {
      await this.assertProviderOrgAccess(model.organization.id, actorId, [
        OrgRole.OWNER,
        OrgRole.MAINTAINER,
        OrgRole.CONTRIBUTOR,
      ]);
    } else if (model.user?.id !== actorId) {
      throw new ForbiddenException('Only the model owner can confirm the schema');
    }

    if (examplePayload) {
      version.examplePayload = examplePayload;
    }
    if (expectedResult) {
      version.expectedResult = expectedResult;
    }
    version.schemaDetectionStatus = SchemaDetectionStatus.CONFIRMED;

    return this.modelVersionsRepository.save(version);
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
      await this.assertProviderOrgAccess(
        version.model.organization.id,
        actorId,
      );
    }

    const testCase = this.testCaseRepository.create({
      version,
      createdBy: { id: actorId },
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
      throw new BadRequestException(
        'Personal model versions do not need review',
      );
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
    classLabels?: string | Record<string, any>,
  ): Promise<ModelVersion> {
    const version = await this.modelVersionsRepository.findOne({
      where: { id: versionId },
    });

    if (!version) {
      throw new NotFoundException(`Model version ${versionId} not found.`);
    }

    const parseJsonSafely = (
      val?: string | Record<string, any>,
    ): Record<string, any> | null => {
      if (!val) return null;
      if (typeof val !== 'string') return val;
      try {
        return JSON.parse(val);
      } catch {
        return null;
      }
    };

    if (examplePayload) {
      version.examplePayload = examplePayload;
    }
    if (expectedResult) {
      version.expectedResult = expectedResult;
    }
    if (classLabels) {
      version.classLabels = parseJsonSafely(classLabels);
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
      ? (require('path').isAbsolute(storageDirEnv) ? storageDirEnv : join(process.cwd(), storageDirEnv))
      : join(process.cwd(), 'uploads', 'gguf-models');
    const ggufPath = join(ggufStorageDir, `${versionId}.gguf`);
    if (fs.existsSync(ggufPath)) {
      try {
        fs.unlinkSync(ggufPath);
      } catch (e: any) {
        console.warn(
          `Failed to delete local GGUF file ${ggufPath}: ${e.message || e}`,
        );
      }
    }

    // Delete temporary build directory if it was left behind
    const buildDir = join(process.cwd(), 'uploads', `build-${versionId}`);
    if (fs.existsSync(buildDir)) {
      try {
        fs.rmSync(buildDir, { recursive: true, force: true });
      } catch (e: any) {
        console.warn(
          `Failed to delete build directory ${buildDir}: ${e.message || e}`,
        );
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

  /**
   * Creates or updates a consumer review for a model.
   * Verifies that the consumer has generated at least one API key for this model.
   */
  async createOrUpdateReview(
    userId: string,
    modelId: string,
    dto: CreateReviewDto,
  ): Promise<ModelReview> {
    // 1. Verify that the user has generated at least one API key for this model
    const hasKey = await this.apiKeyRepository.exists({
      where: { user: { id: userId }, model: { id: modelId } },
    });
    if (!hasKey) {
      throw new ForbiddenException(
        'You must generate at least one API key for this model to leave a review.',
      );
    }

    // 2. Fetch the model
    const model = await this.modelsRepository.findOneBy({ id: modelId });
    if (!model) {
      throw new NotFoundException('Model not found');
    }

    // 3. Find or create review
    let review = await this.modelReviewRepository.findOne({
      where: { user: { id: userId }, model: { id: modelId } },
    });

    if (review) {
      review.rating = dto.rating;
      review.comment = dto.comment ?? null;
    } else {
      review = this.modelReviewRepository.create({
        rating: dto.rating,
        comment: dto.comment ?? null,
        user: { id: userId },
        model,
      });
    }

    const savedReview = await this.modelReviewRepository.save(review);

    // 4. Recalculate average rating & review count for the model
    await this.updateModelRatingStats(modelId);

    return savedReview;
  }

  /**
   * Deletes a review for a model.
   */
  async deleteReview(userId: string, modelId: string): Promise<void> {
    const review = await this.modelReviewRepository.findOne({
      where: { user: { id: userId }, model: { id: modelId } },
    });
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    await this.modelReviewRepository.remove(review);

    // Recalculate average rating & review count for the model
    await this.updateModelRatingStats(modelId);
  }

  /**
   * Retrieves all reviews for a specific model.
   */
  async getReviews(modelId: string): Promise<ModelReview[]> {
    return this.modelReviewRepository.find({
      where: { model: { id: modelId } },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Recalculates average rating and review count, updates the Model, and syncs to OpenSearch.
   */
  private async updateModelRatingStats(modelId: string): Promise<void> {
    const reviews = await this.modelReviewRepository.find({
      where: { model: { id: modelId } },
    });

    const count = reviews.length;
    const avg =
      count > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / count : 0.0;

    await this.modelsRepository.update(modelId, {
      averageRating: avg,
      reviewCount: count,
    });

    // Re-index model in OpenSearch
    const fullModel = await this.modelsRepository.findOne({
      where: { id: modelId },
      relations: ['organization', 'versions', 'versions.deployments', 'user'],
    });
    if (fullModel) {
      try {
        await this.modelsSearchService.indexModel(fullModel);
      } catch (err: any) {
        console.error(
          `Failed to index model ${modelId} after review update: ${err.message}`,
        );
      }
    }
  }
}
