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

/**
 * CRUD and lifecycle management for {@link Pipeline} definitions. Editing a
 * pipeline's steps/edges always demotes it back to `DRAFT` so it must be
 * re-validated before it can be run again.
 */
@Injectable()
export class PipelinesService {
  constructor(
    @InjectRepository(Pipeline)
    private readonly pipelineRepository: Repository<Pipeline>,
    @InjectRepository(PipelineEdge)
    private readonly edgeRepository: Repository<PipelineEdge>,
  ) {}

  /**
   * Creates a new, empty pipeline in `DRAFT` status.
   *
   * @param userId - The owning user's UUID.
   * @param dto - The pipeline's name/description.
   */
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

  /** Lists all pipelines owned by a user. */
  async listPipelines(userId: string): Promise<Pipeline[]> {
    return this.pipelineRepository.find({
      where: { user: { id: userId } },
      relations: ['steps'],
      order: { updatedAt: 'DESC' },
    });
  }

  /**
   * Fetches a single pipeline with its steps and model versions, enforcing
   * ownership.
   *
   * @throws {NotFoundException} If the pipeline does not exist.
   * @throws {ForbiddenException} If the actor does not own the pipeline.
   */
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

  /** Updates a pipeline's name/description. Does not affect its status. */
  async updatePipeline(
    pipelineId: string,
    actorId: string,
    dto: UpdatePipelineDto,
  ): Promise<Pipeline> {
    const pipeline = await this.getPipeline(pipelineId, actorId);
    if (dto.name !== undefined) pipeline.name = dto.name;
    if (dto.description !== undefined) pipeline.description = dto.description;
    if (dto.type !== undefined) pipeline.type = dto.type;
    return this.pipelineRepository.save(pipeline);
  }

  /** Deletes a pipeline and all its steps/edges/runs (cascades at the DB level). */
  async deletePipeline(pipelineId: string, actorId: string): Promise<void> {
    const pipeline = await this.getPipeline(pipelineId, actorId);
    await this.pipelineRepository.remove(pipeline);
  }

  /**
   * Validates a pipeline's structure (every step bound to a READY model
   * version, parallel stages unambiguously roled, and its shape matching its
   * declared `type`) and marks it `VALIDATED` so it can be run. Bumps `version`.
   *
   * @throws {BadRequestException} If the pipeline has no steps, an unbound
   * step, ambiguous parallel roles, or a structure that doesn't match its type.
   */
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

  /**
   * Every stage (steps sharing an `order`) with more than one step is a
   * parallel branch point — each of its steps needs a distinct, non-null
   * `role` so mapper rules and join steps can address `steps.<order>.<role>`
   * unambiguously.
   *
   * @throws {BadRequestException} If a multi-step stage has a missing or duplicate role.
   */
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

  /** Demotes a pipeline back to `DRAFT`. Called whenever its steps/edges change. */
  async demoteToDraft(pipelineId: string): Promise<void> {
    await this.pipelineRepository.update(
      { id: pipelineId },
      { status: PipelineStatus.DRAFT },
    );
  }
}
