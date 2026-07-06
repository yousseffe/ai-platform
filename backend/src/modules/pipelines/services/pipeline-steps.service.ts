import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PipelineStep } from '../entities/pipeline-step.entity';
import { PipelinePinPolicy } from '../enums/pipeline-pin-policy.enum';
import { ModelVersionsRepository, VersionStatus } from '../../models';
import { ModelVersion } from '../../models/entities/model-version.entity';
import { CreateStepDto } from '../dto/create-step.dto';
import { UpdateStepDto } from '../dto/update-step.dto';
import { PipelinesService } from './pipelines.service';

@Injectable()
export class PipelineStepsService {
  constructor(
    @InjectRepository(PipelineStep)
    private readonly stepRepository: Repository<PipelineStep>,
    private readonly modelVersionsRepository: ModelVersionsRepository,
    private readonly pipelinesService: PipelinesService,
  ) {}

  async addStep(
    pipelineId: string,
    actorId: string,
    dto: CreateStepDto,
  ): Promise<PipelineStep> {
    const pipeline = await this.pipelinesService.getPipeline(
      pipelineId,
      actorId,
    );
    const modelVersion = await this.resolveReadyVersion(dto.modelVersionId);

    const step = this.stepRepository.create({
      pipeline,
      order: dto.order,
      label: dto.label ?? null,
      role: dto.role ?? null,
      modelVersion,
      pinPolicy: dto.pinPolicy ?? PipelinePinPolicy.PINNED,
      timeoutMs: dto.timeoutMs ?? null,
      maxRetries: dto.maxRetries ?? 0,
    });
    const saved = await this.stepRepository.save(step);
    await this.pipelinesService.demoteToDraft(pipelineId);
    return saved;
  }

  async updateStep(
    pipelineId: string,
    stepId: string,
    actorId: string,
    dto: UpdateStepDto,
  ): Promise<PipelineStep> {
    await this.pipelinesService.getPipeline(pipelineId, actorId);
    const step = await this.stepRepository.findOne({
      where: { id: stepId, pipeline: { id: pipelineId } },
    });
    if (!step) {
      throw new NotFoundException('Pipeline step not found');
    }

    if (dto.order !== undefined) step.order = dto.order;
    if (dto.label !== undefined) step.label = dto.label;
    if (dto.role !== undefined) step.role = dto.role;
    if (dto.pinPolicy !== undefined) step.pinPolicy = dto.pinPolicy;
    if (dto.timeoutMs !== undefined) step.timeoutMs = dto.timeoutMs;
    if (dto.maxRetries !== undefined) step.maxRetries = dto.maxRetries;
    if (dto.modelVersionId !== undefined) {
      step.modelVersion = await this.resolveReadyVersion(dto.modelVersionId);
    }

    const saved = await this.stepRepository.save(step);
    await this.pipelinesService.demoteToDraft(pipelineId);
    return saved;
  }

  async removeStep(
    pipelineId: string,
    stepId: string,
    actorId: string,
  ): Promise<void> {
    await this.pipelinesService.getPipeline(pipelineId, actorId);
    const step = await this.stepRepository.findOne({
      where: { id: stepId, pipeline: { id: pipelineId } },
    });
    if (!step) {
      throw new NotFoundException('Pipeline step not found');
    }
    await this.stepRepository.remove(step);
    await this.pipelinesService.demoteToDraft(pipelineId);
  }

  private async resolveReadyVersion(versionId: string): Promise<ModelVersion> {
    const modelVersion = await this.modelVersionsRepository.findOne({
      where: { id: versionId },
      relations: ['model'],
    });
    if (!modelVersion) {
      throw new NotFoundException('Model version not found');
    }
    if (modelVersion.status !== VersionStatus.READY) {
      throw new BadRequestException(
        `Model version v${modelVersion.versionNumber} is not READY`,
      );
    }
    return modelVersion;
  }
}
