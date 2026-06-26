import {
  Injectable,
  NotFoundException,
  BadRequestException,
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
import { VersionStatus } from '../enums/version-status.enum';
import { ModelType } from '../enums/model-type.enum';
import { TaskType } from '../enums/task-type.enum';
import { Framework } from '../enums/framework.enum';
import { ModelsRepository } from '../repositories/models.repository';
import { ModelVersionsRepository } from '../repositories/model-versions.repository';
import { MinioService } from '../../../shared/minio/minio.service';
import { DeploymentStatus } from '../../deployments/enums/deployment-status.enum';
import { ModelsSearchService } from './models-search.service';
import { SystemConfig } from '../../wallets/entities/system-config.entity';

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
  ) {}

  /**
   * Registers a new model name and description under a specific user account.
   *
   * @param name - The human-readable name of the model.
   * @param description - The description explaining what the model does.
   * @param type - The model type (tabular, nlp, vision, etc.).
   * @param taskType - The task category (classification, regression, generation, etc.).
   * @param framework - The development framework (scikit-learn, pytorch, gguf, etc.).
   * @param userId - The UUID of the model owner.
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
  ): Promise<Model> {
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
      isPublic,
      tier: type === ModelType.DIFFUSION ? 'LARGE' : 'SMALL',
      costPerRequest: defaultCost,
      providerSharePercent: defaultShare,
      hasCustomPricing: false,
    });
    const saved = await this.modelsRepository.save(model);

    // Index in OpenSearch — load with relations so the document is complete
    const fullModel = await this.modelsRepository.findOne({
      where: { id: saved.id },
      relations: ['versions', 'versions.deployments', 'user'],
    });
    if (fullModel) {
      await this.modelsSearchService.indexModel(fullModel);
    }

    return saved;
  }

  /**
   * Retrieves all models registered by a user, including their versions and deployments.
   *
   * @param userId - The UUID of the owner.
   * @returns A promise resolving to an array of Model entities.
   */
  async getModels(userId: string): Promise<Model[]> {
    return this.modelsRepository.find({
      where: { user: { id: userId } },
      relations: ['versions', 'versions.deployments'],
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
      relations: ['versions', 'versions.deployments', 'user'],
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
      relations: ['versions', 'versions.deployments', 'user'],
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
  async getModel(modelId: string): Promise<Model> {
    const model = await this.modelsRepository.findOne({
      where: { id: modelId },
      relations: ['versions', 'versions.deployments', 'user'],
    });
    if (!model) {
      throw new NotFoundException('Model not found');
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
  ): Promise<ModelVersion> {
    const model = await this.modelsRepository.findOne({
      where: { id: modelId },
      relations: ['versions', 'user'],
    });
    if (!model) {
      throw new NotFoundException('Model not found');
    }

    const versionNumber = model.versions.length + 1;
    let prevVersion: ModelVersion | null = null;
    if (model.versions.length > 0) {
      prevVersion = [...model.versions].sort(
        (a, b) => b.versionNumber - a.versionNumber,
      )[0];
    }

    const publisher = model.user?.email
      ? model.user.email.split('@')[0]
      : 'unknown';
    const sanitizedPublisher = publisher
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
      const objectName = `${sanitizedPublisher}/${sanitizedName}/v${versionNumber}/${prefix}-${file.originalname}`;
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
      versionNumber,
      status: VersionStatus.UPLOADED,
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

    if (triggerBuild !== 'false') {
      // Dispatch job to build queue
      await this.buildQueue.add('build-model', { versionId: savedVersion.id });
    }

    return savedVersion;
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
      console.warn(`Failed to delete Docker image model-version-${versionId}: ${e.message || e}`);
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
