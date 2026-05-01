import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Model } from './model.entity';
import { ModelVersion, VersionStatus } from './model-version.entity';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

@Injectable()
export class ModelsService {
  constructor(
    @InjectRepository(Model)
    private modelsRepository: Repository<Model>,
    @InjectRepository(ModelVersion)
    private modelVersionsRepository: Repository<ModelVersion>,
    @InjectQueue('build-queue') private buildQueue: Queue,
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
      prevVersion = [...model.versions].sort((a, b) => b.versionNumber - a.versionNumber)[0];
    }

    const modelVersion = this.modelVersionsRepository.create({
      model,
      versionNumber,
      status: VersionStatus.UPLOADED, 
      modelFilePath: files.model?.[0]?.path || prevVersion?.modelFilePath || undefined,
      scalerFilePath: files.scaler?.[0]?.path || prevVersion?.scalerFilePath || undefined,
      preprocessFilePath: files.preprocess?.[0]?.path || prevVersion?.preprocessFilePath || undefined,
      postprocessFilePath: files.postprocess?.[0]?.path || prevVersion?.postprocessFilePath || undefined,
      examplePayload: examplePayload || prevVersion?.examplePayload || undefined,
      expectedResult: expectedResult || prevVersion?.expectedResult || undefined,
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
}
