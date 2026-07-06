import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pipeline } from '../entities/pipeline.entity';
import { PipelineEdge } from '../entities/pipeline-edge.entity';
import { PipelineStatus } from '../enums/pipeline-status.enum';
import { PipelineType } from '../enums/pipeline-type.enum';
import { CreatePipelineDto } from '../dto/create-pipeline.dto';
import { UpdatePipelineDto } from '../dto/update-pipeline.dto';
import { assertTypeMatchesStructure } from './pipeline-type-guard.util';

const DETAIL_RELATIONS = [
  'steps',
  'steps.modelVersion',
  'steps.modelVersion.model',
  'user',
];

@Injectable()
export class PipelinesService {
  constructor(
    @InjectRepository(Pipeline)
    private readonly pipelineRepository: Repository<Pipeline>,
    @InjectRepository(PipelineEdge)
    private readonly edgeRepository: Repository<PipelineEdge>,
  ) {}

  async createPipeline(
    userId: string,
    dto: CreatePipelineDto,
  ): Promise<Pipeline> {
    const pipeline = this.pipelineRepository.create({
      name: dto.name,
      description: dto.description ?? null,
      user: { id: userId } as Pipeline['user'],
      status: PipelineStatus.DRAFT,
      type: dto.type ?? PipelineType.SEQUENTIAL_CHAIN,
      version: 1,
    });
    return this.pipelineRepository.save(pipeline);
  }

  async listPipelines(userId: string): Promise<Pipeline[]> {
    return this.pipelineRepository.find({
      where: { user: { id: userId } },
      relations: ['steps'],
      order: { updatedAt: 'DESC' },
    });
  }

  async getPipeline(pipelineId: string, actorId: string): Promise<Pipeline> {
    const pipeline = await this.pipelineRepository.findOne({
      where: { id: pipelineId },
      relations: DETAIL_RELATIONS,
    });
    if (!pipeline) {
      throw new NotFoundException('Pipeline not found');
    }
    if (pipeline.user.id !== actorId) {
      throw new ForbiddenException('You do not have access to this pipeline');
    }
    return pipeline;
  }

  async getPublicPipelines(): Promise<Pipeline[]> {
    return this.pipelineRepository.find({
      where: { isPublic: true, status: PipelineStatus.VALIDATED },
      relations: DETAIL_RELATIONS,
      order: { updatedAt: 'DESC' },
    });
  }

  async getPublicPipeline(pipelineId: string): Promise<Pipeline> {
    const pipeline = await this.pipelineRepository.findOne({
      where: { id: pipelineId, isPublic: true },
      relations: DETAIL_RELATIONS,
    });
    if (!pipeline) {
      throw new NotFoundException('Pipeline not found');
    }
    return pipeline;
  }

  async updatePipeline(
    pipelineId: string,
    actorId: string,
    dto: UpdatePipelineDto,
  ): Promise<Pipeline> {
    const pipeline = await this.getPipeline(pipelineId, actorId);
    if (dto.name !== undefined) pipeline.name = dto.name;
    if (dto.description !== undefined) pipeline.description = dto.description;
    if (dto.type !== undefined) pipeline.type = dto.type;
    if (dto.isPublic !== undefined) pipeline.isPublic = dto.isPublic;
    return this.pipelineRepository.save(pipeline);
  }

  async deletePipeline(pipelineId: string, actorId: string): Promise<void> {
    const pipeline = await this.getPipeline(pipelineId, actorId);
    await this.pipelineRepository.remove(pipeline);
  }

  async validatePipeline(
    pipelineId: string,
    actorId: string,
  ): Promise<Pipeline> {
    const pipeline = await this.getPipeline(pipelineId, actorId);
    if (!pipeline.steps || pipeline.steps.length === 0) {
      throw new BadRequestException('Pipeline must have at least one step');
    }
    const unbound = pipeline.steps.find((s) => !s.modelVersion);
    if (unbound) {
      throw new BadRequestException(
        `Step ${unbound.order} has no bound model version`,
      );
    }
    this.assertStageRolesAreUnambiguous(pipeline.steps);
    const edges = await this.edgeRepository.find({
      where: { pipeline: { id: pipelineId } },
      relations: ['toStep'],
    });
    assertTypeMatchesStructure(pipeline, edges);
    pipeline.status = PipelineStatus.VALIDATED;
    pipeline.version += 1;
    return this.pipelineRepository.save(pipeline);
  }

  private assertStageRolesAreUnambiguous(steps: Pipeline['steps']): void {
    const byOrder = new Map<number, Pipeline['steps']>();
    for (const step of steps) {
      const bucket = byOrder.get(step.order) ?? [];
      bucket.push(step);
      byOrder.set(step.order, bucket);
    }

    for (const [order, stage] of byOrder) {
      if (stage.length <= 1) continue;
      const missing = stage.find((s) => !s.role);
      if (missing) {
        throw new BadRequestException(
          `Stage ${order} has ${stage.length} parallel steps but "${missing.label ?? missing.id}" has no role set`,
        );
      }
      const roles = stage.map((s) => s.role);
      if (new Set(roles).size !== roles.length) {
        throw new BadRequestException(
          `Stage ${order} has duplicate step roles — each parallel branch needs a unique role`,
        );
      }
    }
  }

  async demoteToDraft(pipelineId: string): Promise<void> {
    await this.pipelineRepository.update(
      { id: pipelineId },
      { status: PipelineStatus.DRAFT },
    );
  }
}
