import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKeyOrJwtGuard } from '../../auth/guards/api-key-or-jwt.guard';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { ModelVersion } from '../../models/entities/model-version.entity';
import { ModelVersionReviewEvent } from '../../models/entities/model-version-review-event.entity';
import { ModelReview } from '../../models/entities/model-review.entity';

/**
 * Read-only model governance surface consumed by the `admin_get_model_versions`
 * and `admin_get_model_reviews` MCP tools. Surfaces the version/review-approval
 * history and individual consumer reviews that the dashboard only ever shows
 * as an aggregate rating — there is no existing admin endpoint for either today.
 */
@Controller('admin-mcp')
@UseGuards(ApiKeyOrJwtGuard, AdminGuard)
export class ModelGovernanceMcpController {
  constructor(
    @InjectRepository(ModelVersion)
    private readonly modelVersionRepository: Repository<ModelVersion>,
    @InjectRepository(ModelVersionReviewEvent)
    private readonly reviewEventRepository: Repository<ModelVersionReviewEvent>,
    @InjectRepository(ModelReview)
    private readonly modelReviewRepository: Repository<ModelReview>,
  ) {}

  /**
   * Lists a model's version history alongside its governance review events
   * (submissions, approvals, declines, build events).
   *
   * @param id - Model UUID.
   * @returns Version history and review event timeline.
   */
  @Get('models/:id/versions')
  async getModelVersions(@Param('id', ParseUUIDPipe) id: string) {
    const [versions, events] = await Promise.all([
      this.modelVersionRepository.find({
        where: { model: { id } },
        relations: ['uploadedBy', 'reviewedBy'],
        order: { versionNumber: 'DESC' },
      }),
      this.reviewEventRepository.find({
        where: { model: { id } },
        relations: ['actor', 'version'],
        order: { createdAt: 'DESC' },
        take: 50,
      }),
    ]);

    return {
      versions: versions.map((v) => ({
        id: v.id,
        versionNumber: v.versionNumber,
        status: v.status,
        reviewStatus: v.reviewStatus,
        uploadedBy: v.uploadedBy?.email ?? null,
        reviewedBy: v.reviewedBy?.email ?? null,
        reviewComment: v.reviewComment,
        reviewedAt: v.reviewedAt,
        buildProgress: v.buildProgress,
        errorMessage: v.errorMessage,
        createdAt: v.createdAt,
      })),
      events: events.map((e) => ({
        id: e.id,
        action: e.action,
        versionNumber: e.version?.versionNumber ?? null,
        actor: e.actor?.email ?? null,
        message: e.message,
        createdAt: e.createdAt,
      })),
    };
  }

  /**
   * Lists the individual consumer review records for a model (not just the
   * aggregate rating already shown elsewhere).
   *
   * @param id - Model UUID.
   * @returns Individual review records.
   */
  @Get('models/:id/reviews')
  async getModelReviews(@Param('id', ParseUUIDPipe) id: string) {
    const reviews = await this.modelReviewRepository.find({
      where: { model: { id } },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      reviewer: r.user?.email ?? 'Unknown',
      createdAt: r.createdAt,
    }));
  }
}
