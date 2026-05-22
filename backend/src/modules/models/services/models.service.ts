import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Model } from '../entities/model.entity';
import { ModelVersion } from '../entities/model-version.entity';
import { VersionStatus } from '../enums/version-status.enum';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

/**
 * Service managing model registration, listing, version uploads, and build queue dispatching.
 */
@Injectable()
export class ModelsService {
  constructor(
    @InjectRepository(Model)
    private modelsRepository: Repository<Model>,
    @InjectRepository(ModelVersion)
    private modelVersionsRepository: Repository<ModelVersion>,
    @InjectQueue('build-queue') private buildQueue: Queue,
  ) {}

  /**
   * Registers a new model name and description under a specific user account.
   *
   * @param name - The human-readable name of the model.
   * @param description - The description explaining what the model does.
   * @param userId - The UUID of the model owner.
   * @returns A promise resolving to the created Model entity.
   */
  async createModel(
    name: string,
    description: string,
    userId: string,
  ): Promise<Model> {
    const model = this.modelsRepository.create({
      name,
      description,
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
    if (!model) throw new NotFoundException('Model not found');
    return model;
  }

  /**
   * Uploads model artifact files (weights, scalers, and scripting hooks), registers
   * a new ModelVersion, and triggers a background build job.
   *
   * If a file is omitted, it defaults to the file from the previous version if available.
   *
   * @param modelId - The parent model UUID.
   * @param files - Uploaded Multer files containing artifacts.
   * @param examplePayload - A JSON string sample request payload.
   * @param expectedResult - A JSON string sample response output.
   * @returns A promise resolving to the created ModelVersion entity.
   * @throws {NotFoundException} If the parent model does not exist.
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
      relations: ['versions'],
    });
    if (!model) throw new NotFoundException('Model not found');

    const versionNumber = model.versions.length + 1;
    let prevVersion: ModelVersion | null = null;
    if (model.versions.length > 0) {
      prevVersion = [...model.versions].sort(
        (a, b) => b.versionNumber - a.versionNumber,
      )[0];
    }

    const modelVersion = this.modelVersionsRepository.create({
      model,
      versionNumber,
      status: VersionStatus.UPLOADED,
      modelFilePath:
        files.model?.[0]?.path || prevVersion?.modelFilePath || undefined,
      scalerFilePath:
        files.scaler?.[0]?.path || prevVersion?.scalerFilePath || undefined,
      preprocessFilePath:
        files.preprocess?.[0]?.path ||
        prevVersion?.preprocessFilePath ||
        undefined,
      postprocessFilePath:
        files.postprocess?.[0]?.path ||
        prevVersion?.postprocessFilePath ||
        undefined,
      examplePayload:
        examplePayload || prevVersion?.examplePayload || undefined,
      expectedResult:
        expectedResult || prevVersion?.expectedResult || undefined,
    });

    const savedVersion = await this.modelVersionsRepository.save(modelVersion);

    // Add to build queue
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
   * @returns A promise that resolves when the update is complete.
   */
  async updateVersionStatus(
    versionId: string,
    status: VersionStatus,
  ): Promise<void> {
    await this.modelVersionsRepository.update(versionId, { status });
  }
}
