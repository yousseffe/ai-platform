import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
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
  ): Promise<Model> {
    const model = this.modelsRepository.create({
      name,
      description,
      type,
      taskType,
      framework,
      user: { id: userId },
    });
    return this.modelsRepository.save(model);
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
   * Retrieves metadata and history for a specific model.
   *
   * @param modelId - The UUID of the model to fetch.
   * @returns A promise resolving to the Model entity.
   * @throws {NotFoundException} If the model does not exist.
   */
  async getModel(modelId: string): Promise<Model> {
    const model = await this.modelsRepository.findOne({
      where: { id: modelId },
      relations: ['versions', 'versions.deployments'],
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
      examplePayload: examplePayload || prevVersion?.examplePayload || null,
      expectedResult: expectedResult || prevVersion?.expectedResult || null,
    });

    const savedVersion = await this.modelVersionsRepository.save(modelVersion);

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

    // Delete model
    await this.modelsRepository.remove(model);
  }
}
