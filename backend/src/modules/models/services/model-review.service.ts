import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Model } from '../entities/model.entity';
import { ModelVersion } from '../entities/model-version.entity';
import { ModelReview } from '../entities/model-review.entity';
import { ModelVersionReviewEvent } from '../entities/model-version-review-event.entity';
import { ApiKey } from '../../auth/entities/api-key.entity';
import { User } from '../../users/entities/user.entity';
import { CreateReviewDto } from '../dto/create-review.dto';
import { VersionReviewStatus } from '../enums/version-review-status.enum';
import { VersionReviewAction } from '../enums/version-review-action.enum';
import { VersionStatus } from '../enums/version-status.enum';
import { ModelsRepository } from '../repositories/models.repository';
import { ModelVersionsRepository } from '../repositories/model-versions.repository';
import { ModelsSearchService } from './models-search.service';
import { ModelsService } from './models.service';
import { OrgRole } from '../../../shared/enums/org-role.enum';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

@Injectable()
export class ModelReviewService {
  constructor(
    private readonly modelsRepository: ModelsRepository,
    private readonly modelVersionsRepository: ModelVersionsRepository,
    @InjectRepository(ModelReview)
    private readonly modelReviewRepository: Repository<ModelReview>,
    @InjectRepository(ModelVersionReviewEvent)
    private readonly reviewEventRepository: Repository<ModelVersionReviewEvent>,
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
    private readonly modelsSearchService: ModelsSearchService,
    @InjectQueue('build-queue') private readonly buildQueue: Queue,
    @Inject(forwardRef(() => ModelsService))
    private readonly modelsService: ModelsService,
  ) {}

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
    await this.modelsService.assertProviderOrgAccess(orgId, reviewerId, [
      OrgRole.OWNER,
      OrgRole.MAINTAINER,
    ]);

    version.reviewStatus =
      decision === 'approve'
        ? VersionReviewStatus.APPROVED
        : VersionReviewStatus.DECLINED;
    version.reviewedBy = { id: reviewerId } as User;
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
      await this.modelsService.assertProviderOrgAccess(
        model.organization.id,
        actorId,
        [
          OrgRole.OWNER,
          OrgRole.MAINTAINER,
          OrgRole.CONTRIBUTOR,
          OrgRole.VIEWER,
        ],
      );
    }
    return this.reviewEventRepository.find({
      where: { model: { id: modelId } },
      relations: ['actor', 'version'],
      order: { createdAt: 'DESC' },
    });
  }

  async createOrUpdateReview(
    userId: string,
    modelId: string,
    dto: CreateReviewDto,
  ): Promise<ModelReview> {
    const hasKey = await this.apiKeyRepository.exists({
      where: { user: { id: userId }, model: { id: modelId } },
    });
    if (!hasKey) {
      throw new ForbiddenException(
        'You must generate at least one API key for this model to leave a review.',
      );
    }

    const model = await this.modelsRepository.findOneBy({ id: modelId });
    if (!model) {
      throw new NotFoundException('Model not found');
    }

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
        user: { id: userId } as User,
        model,
      });
    }

    const savedReview = await this.modelReviewRepository.save(review);
    await this.updateModelRatingStats(modelId);

    return savedReview;
  }

  async deleteReview(userId: string, modelId: string): Promise<void> {
    const review = await this.modelReviewRepository.findOne({
      where: { user: { id: userId }, model: { id: modelId } },
    });
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    await this.modelReviewRepository.remove(review);
    await this.updateModelRatingStats(modelId);
  }

  async getReviews(modelId: string): Promise<ModelReview[]> {
    return this.modelReviewRepository.find({
      where: { model: { id: modelId } },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateModelRatingStats(modelId: string): Promise<void> {
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

    const fullModel = await this.modelsRepository.findOne({
      where: { id: modelId },
      relations: ['organization', 'versions', 'versions.deployments', 'user'],
    });
    if (fullModel) {
      try {
        await this.modelsSearchService.indexModel(fullModel);
      } catch (err: unknown) {
        console.error(
          `Failed to index model ${modelId} after review update: ${(err as Error).message}`,
        );
      }
    }
  }

  async recordReviewEvent(options: {
    model: Model;
    version?: ModelVersion | null;
    actorId?: string | null;
    action: VersionReviewAction;
    message?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<void> {
    const event = this.reviewEventRepository.create({
      model: options.model,
      version: options.version ?? null,
      actor: options.actorId ? ({ id: options.actorId } as User) : null,
      action: options.action,
      message: options.message ?? null,
      metadata: options.metadata || null,
    });
    await this.reviewEventRepository.save(event);
  }
}
