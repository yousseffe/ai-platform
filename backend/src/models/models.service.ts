import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Model } from './model.entity';
import { ModelVersion, VersionStatus } from './model-version.entity';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { MinioService } from '../minio/minio.service';
import * as fs from 'fs';
import { ModelsRepository } from './models.repository';
import { ModelVersionsRepository } from './model-versions.repository';

@Injectable()
export class ModelsService {
  constructor(
    private modelsRepository: ModelsRepository,
    private modelVersionsRepository: ModelVersionsRepository,
    @InjectQueue('build-queue') private buildQueue: Queue,
    private minioService: MinioService,
  ) {}

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

  async getModels(userId: string): Promise<Model[]> {
    return this.modelsRepository.find({
      where: { user: { id: userId } },
      relations: ['versions', 'versions.deployments'],
    });
  }

  async getModel(modelId: string): Promise<Model> {
    const model = await this.modelsRepository.findOne({
      where: { id: modelId },
      relations: ['versions', 'versions.deployments'],
    });
    if (!model) throw new NotFoundException('Model not found');
    return model;
  }

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

    const uploadToMinio = async (file: Express.Multer.File | undefined, prefix: string): Promise<string | undefined> => {
      if (!file) return undefined;
      const objectName = `${modelId}/v${versionNumber}/${prefix}-${file.originalname}`;
      await this.minioService.uploadFile(objectName, file.path, file.mimetype);
      fs.unlinkSync(file.path);
      return objectName;
    };

    const modelObjName = await uploadToMinio(files.model?.[0], 'model');
    const scalerObjName = await uploadToMinio(files.scaler?.[0], 'scaler');
    const preprocessObjName = await uploadToMinio(files.preprocess?.[0], 'preprocess');
    const postprocessObjName = await uploadToMinio(files.postprocess?.[0], 'postprocess');

    const modelVersion = this.modelVersionsRepository.create({
      model,
      versionNumber,
      status: VersionStatus.UPLOADED,
      modelFilePath: modelObjName || prevVersion?.modelFilePath || undefined,
      scalerFilePath: scalerObjName || prevVersion?.scalerFilePath || undefined,
      preprocessFilePath: preprocessObjName || prevVersion?.preprocessFilePath || undefined,
      postprocessFilePath: postprocessObjName || prevVersion?.postprocessFilePath || undefined,
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

  async getVersion(versionId: string): Promise<ModelVersion | null> {
    return this.modelVersionsRepository.findOne({
      where: { id: versionId },
      relations: ['model'],
    });
  }

  async updateVersionStatus(versionId: string, status: VersionStatus) {
    await this.modelVersionsRepository.update(versionId, { status });
  }

  async deleteVersion(versionId: string): Promise<void> {
    const version = await this.modelVersionsRepository.findOne({
      where: { id: versionId },
      relations: ['deployments'],
    });
    if (!version) throw new NotFoundException('Model version not found');

    const hasActiveDeployment = version.deployments?.some(
      (d) => d.status === 'starting' || d.status === 'running'
    );
    if (hasActiveDeployment) {
      throw new BadRequestException('Cannot delete version with active deployments');
    }

    // Delete files from MinIO
    if (version.modelFilePath) await this.minioService.deleteFile(version.modelFilePath);
    if (version.scalerFilePath) await this.minioService.deleteFile(version.scalerFilePath);
    if (version.preprocessFilePath) await this.minioService.deleteFile(version.preprocessFilePath);
    if (version.postprocessFilePath) await this.minioService.deleteFile(version.postprocessFilePath);

    // Delete DB record
    await this.modelVersionsRepository.remove(version);
  }

  async deleteModel(modelId: string): Promise<void> {
    const model = await this.modelsRepository.findOne({
      where: { id: modelId },
      relations: ['versions', 'versions.deployments'],
    });
    if (!model) throw new NotFoundException('Model not found');

    const hasActiveDeployment = model.versions.some((version) =>
      version.deployments?.some(
        (d) => d.status === 'starting' || d.status === 'running'
      )
    );
    if (hasActiveDeployment) {
      throw new BadRequestException('Cannot delete model because a version has an active deployment');
    }

    // Delete all versions first
    for (const version of model.versions) {
      await this.deleteVersion(version.id);
    }

    // Delete model
    await this.modelsRepository.remove(model);
  }
}
