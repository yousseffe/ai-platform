import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PipelineStep } from '../entities/pipeline-step.entity';
import { PipelinePinPolicy } from '../enums/pipeline-pin-policy.enum';
import { ModelVersionsRepository } from '../../models/repositories/model-versions.repository';
import { ModelVersion } from '../../models/entities/model-version.entity';
import { VersionStatus } from '../../models/enums/version-status.enum';
import { CreateStepDto } from '../dto/create-step.dto';
import { UpdateStepDto } from '../dto/update-step.dto';
import { PipelinesService } from './pipelines.service';

/**
 * Manages the steps belonging to a pipeline. Any structural change demotes
 * the parent pipeline back to `DRAFT`, forcing re-validation before it can
 * be run again.
 */
@Injectable()
export class PipelineStepsService {
  constructor(
    @InjectRepository(PipelineStep)
    private readonly stepRepository: Repository<PipelineStep>,
    private readonly modelVersionsRepository: ModelVersionsRepository,
    private readonly pipelinesService: PipelinesService,
  ) {}

  /**
   * Adds a step to a pipeline, binding it to an existing READY model version.
   *
   * @throws {NotFoundException} If the referenced model version doesn't exist.
   * @throws {BadRequestException} If the model version isn't READY.
   */
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
      modelVersion,
      pinPolicy: dto.pinPolicy ?? PipelinePinPolicy.PINNED,
      timeoutMs: dto.timeoutMs ?? null,
      maxRetries: dto.maxRetries ?? 0,
    });
    const saved = await this.stepRepository.save(step);
    await this.pipelinesService.demoteToDraft(pipelineId);
    return saved;
  }

  /**
   * Edits an existing step.
   *
   * @throws {NotFoundException} If the step doesn't belong to the pipeline.
   */
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

  /** Removes a step from a pipeline (its edges cascade-delete with it). */
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
