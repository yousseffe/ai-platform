import {
  Controller,
  Post,
  Put,
  Patch,
  Body,
  UseGuards,
  Request,
  Get,
  Param,
  Delete,
  UseInterceptors,
  UploadedFiles,
  Res,
  Req,
  Query,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Response, Request as ExpressRequest } from 'express';
import { ModelsService } from '../services/models.service';
import { WorkspaceInterceptor } from '../../../shared/interceptors/workspace.interceptor';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { DeploymentStatus } from '../../deployments/enums/deployment-status.enum';
import { DeploymentsService } from '../../deployments/services/deployments.service';
import { InferenceCacheService } from '../../inference/services/inference-cache.service';
import { ModelLog } from '../entities/model-log.entity';
import { User } from '../../users/entities/user.entity';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CreateModelDto } from '../dto/create-model.dto';
import { UploadVersionDto } from '../dto/upload-version.dto';
import { InitiateUploadDto } from '../dto/initiate-upload.dto';
import { CompleteUploadDto } from '../dto/complete-upload.dto';
import { AbortUploadDto } from '../dto/abort-upload.dto';
import * as path from 'path';
import * as fs from 'fs';
import { CreateReviewDto } from '../dto/create-review.dto';
import { ModelType } from '../enums/model-type.enum';
import { TaskType } from '../enums/task-type.enum';
import { Framework } from '../enums/framework.enum';
import { Model } from '../entities/model.entity';
import { ModelVersion } from '../entities/model-version.entity';
import { ModelReview } from '../entities/model-review.entity';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { UpdateCacheSettingsDto } from '../dto/update-cache-settings.dto';
import { UpdateNetworkSettingsDto } from '../dto/update-network-settings.dto';
import { UpdateVisibilitySettingsDto } from '../dto/update-visibility-settings.dto';

interface RequestWithUser {
  user: {
    id: string;
    email: string;
    isAdmin?: boolean;
  };
  workspaceId?: string;
  workspaceType?: OwnerType;
}

@Controller('models')
export class ModelsController {
  private readonly logger = new Logger(ModelsController.name);

  constructor(
    private readonly modelsService: ModelsService,
    private readonly deploymentsService: DeploymentsService,
    private readonly dataSource: DataSource,
    @InjectRepository(ModelLog)
    private readonly modelLogRepository: Repository<ModelLog>,
    private readonly inferenceCacheService: InferenceCacheService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(WorkspaceInterceptor)
  @Post()
  async createModel(
    @Body() body: CreateModelDto,
    @Request() req: RequestWithUser,
  ): Promise<Model> {
    return this.modelsService.createModel(
      body.name,
      body.description || '',
      body.type || ModelType.TABULAR,
      body.taskType || TaskType.OTHER,
      body.framework || Framework.CUSTOM,
      req.user.id,
      body.isPublic ?? false,
      req.workspaceType === OwnerType.ORG ? req.workspaceId : undefined,
    );
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(WorkspaceInterceptor)
  @Get()
  async getModels(@Request() req: RequestWithUser): Promise<Model[]> {
    return this.modelsService.getModels(
      req.user.id,
      req.workspaceType === OwnerType.ORG ? req.workspaceId : undefined,
    );
  }

  @Get('marketplace')
  async getPublicModels(): Promise<Model[]> {
    return this.modelsService.getPublicModels();
  }

  @Get('marketplace/:id')
  async getPublicModel(@Param('id') id: string): Promise<Model> {
    return this.modelsService.getPublicModel(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getModel(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<Model & { uniqueUsersCount?: number }> {
    const model = await this.modelsService.getModel(id, req.user.id);

    const result = await this.modelLogRepository
      .createQueryBuilder('log')
      .select('COUNT(DISTINCT log.user_id)', 'count')
      .where('log.model_id = :modelId', { modelId: id })
      .getRawOne();

    const count = result ? parseInt(result.count || '0', 10) : 0;

    return {
      ...model,
      uniqueUsersCount: count,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/versions/upload-initiate')
  async initiateUpload(
    @Param('id') id: string,
    @Body() body: InitiateUploadDto,
    @Request() req: RequestWithUser,
  ) {
    return this.modelsService.initiateVersionUpload(id, body, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/versions/upload-complete')
  async completeUpload(
    @Param('id') id: string,
    @Body() body: CompleteUploadDto,
    @Request() req: RequestWithUser,
  ): Promise<ModelVersion> {
    return this.modelsService.completeVersionUpload(id, body, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/versions/upload-abort')
  async abortUpload(
    @Param('id') id: string,
    @Body() body: AbortUploadDto,
    @Request() req: RequestWithUser,
  ): Promise<{ success: boolean }> {
    return this.modelsService.abortVersionUpload(id, body, req.user.id);
  }

  @Put('local-upload/*')
  async handleLocalUpload(@Req() req: ExpressRequest, @Res() res: Response) {
    const objectKey =
      req.params[0] ||
      req.path.replace(/^\/api\/v1\/models\/local-upload\//, '');
    const uploadId = req.query.uploadId as string;
    const partNumber = req.query.partNumber
      ? parseInt(req.query.partNumber as string, 10)
      : undefined;

    const targetPath = path.join(
      process.cwd(),
      'uploads',
      'local-s3',
      'models',
      objectKey,
    );

    const writePath = partNumber
      ? `${targetPath}.part-${partNumber}`
      : targetPath;

    const targetDir = path.dirname(writePath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const writeStream = fs.createWriteStream(writePath);
    req.pipe(writeStream);

    await new Promise((resolve, reject) => {
      writeStream.on('finish', () => resolve(true));
      writeStream.on('error', reject);
      req.on('error', reject);
    });

    res.setHeader('ETag', `local-mock-etag-${partNumber || 1}`);
    res.status(200).json({ success: true });
  }

  @UseGuards(JwtAuthGuard)
  @Post('versions/:versionId/review')
  async reviewVersion(
    @Param('versionId') versionId: string,
    @Body() body: { decision: 'approve' | 'decline'; comment?: string },
    @Request() req: RequestWithUser,
  ): Promise<ModelVersion> {
    if (body.decision !== 'approve' && body.decision !== 'decline') {
      throw new BadRequestException('decision must be approve or decline');
    }
    return this.modelsService.reviewVersion(
      versionId,
      req.user.id,
      body.decision,
      body.comment,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('versions/:versionId/test-cases')
  async addVersionTestCase(
    @Param('versionId') versionId: string,
    @Body()
    body: {
      name: string;
      payload: string;
      expectedResult?: string;
      notes?: string;
    },
    @Request() req: RequestWithUser,
  ) {
    return this.modelsService.addVersionTestCase(versionId, req.user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('versions/:versionId/test-cases')
  async getVersionTestCases(
    @Param('versionId') versionId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.modelsService.getVersionTestCases(versionId, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('versions/:versionId/artifacts')
  async getVersionArtifacts(
    @Param('versionId') versionId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.modelsService.getVersionArtifactPreview(versionId, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/history')
  async getModelHistory(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    return this.modelsService.getModelHistory(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/cache-settings')
  async updateCacheSettings(
    @Param('id') id: string,
    @Body() body: UpdateCacheSettingsDto,
    @Request() req: RequestWithUser,
  ): Promise<Model> {
    const model = await this.modelsService.getModel(id, req.user.id);
    if (!model) {
      throw new NotFoundException('Model not found');
    }
    if (
      !model.organization &&
      model.user?.id !== req.user.id &&
      !req.user.isAdmin
    ) {
      throw new ForbiddenException('You do not have access to this model');
    }

    return this.modelsService.updateCacheSettings(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/cache-stats')
  async getCacheStats(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    const model = await this.modelsService.getModel(id, req.user.id);
    if (!model) {
      throw new NotFoundException('Model not found');
    }
    if (
      !model.organization &&
      model.user?.id !== req.user.id &&
      !req.user.isAdmin
    ) {
      throw new ForbiddenException('You do not have access to this model');
    }

    return this.inferenceCacheService.getStats(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/network-settings')
  async updateNetworkSettings(
    @Param('id') id: string,
    @Body() body: UpdateNetworkSettingsDto,
    @Request() req: RequestWithUser,
  ): Promise<Model> {
    const model = await this.modelsService.getModel(id, req.user.id);
    if (!model) {
      throw new NotFoundException('Model not found');
    }
    if (
      !model.organization &&
      model.user?.id !== req.user.id &&
      !req.user.isAdmin
    ) {
      throw new ForbiddenException('You do not have access to this model');
    }

    return this.modelsService.updateNetworkSettings(id, body.allowEgress);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/visibility-settings')
  async updateVisibilitySettings(
    @Param('id') id: string,
    @Body() body: UpdateVisibilitySettingsDto,
    @Request() req: RequestWithUser,
  ): Promise<Model> {
    const model = await this.modelsService.getModel(id, req.user.id);
    if (!model) {
      throw new NotFoundException('Model not found');
    }
    if (
      !model.organization &&
      model.user?.id !== req.user.id &&
      !req.user.isAdmin
    ) {
      throw new ForbiddenException('You do not have access to this model');
    }

    return this.modelsService.updateVisibilitySettings(id, body.isPublic);
  }

  @UseGuards(JwtAuthGuard)
  @Get('organizations/:orgId/analytics')
  async getOrganizationModelAnalytics(
    @Param('orgId') orgId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.modelsService.getOrganizationModelAnalytics(orgId, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteModel(
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.modelsService.deleteModel(id);
    return { success: true, message: 'Model deleted successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('versions/:versionId')
  async deleteVersion(
    @Param('versionId') versionId: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.modelsService.deleteVersion(versionId);
    return { success: true, message: 'Model version deleted successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('versions/:versionId/deprecate')
  async deprecateVersion(
    @Param('versionId') versionId: string,
  ): Promise<ModelVersion> {
    const version = await this.dataSource.getRepository(ModelVersion).findOne({
      where: { id: versionId },
      relations: ['deployments'],
    });
    if (!version) {
      throw new NotFoundException('Model version not found');
    }
    const activeDeployment = version.deployments?.find(
      (d) =>
        d.status === DeploymentStatus.RUNNING ||
        d.status === DeploymentStatus.STARTING,
    );
    if (activeDeployment) {
      await this.deploymentsService.stopDeployment(activeDeployment.id);
    }
    return this.modelsService.deprecateVersion(versionId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('versions/:versionId/undeprecate')
  async undeprecateVersion(
    @Param('versionId') versionId: string,
  ): Promise<ModelVersion> {
    return this.modelsService.undeprecateVersion(versionId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/versions/:versionId/build-logs')
  async getBuildLogs(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Req() req: RequestWithUser,
  ): Promise<{ buildLogs: string | null }> {
    const model = await this.modelsService.getModel(id, req.user.id);
    if (!model) {
      throw new NotFoundException('Model not found');
    }

    if (
      !model.organization &&
      model.user?.id !== req.user.id &&
      !req.user.isAdmin
    ) {
      throw new ForbiddenException('You do not have access to this model');
    }

    const version = await this.dataSource.getRepository(ModelVersion).findOne({
      where: { id: versionId, model: { id } },
    });
    if (!version) {
      throw new NotFoundException('Model version not found');
    }

    return { buildLogs: version.buildLogs };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/reviews')
  async createOrUpdateReview(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: CreateReviewDto,
  ): Promise<ModelReview> {
    return this.modelsService.createOrUpdateReview(req.user.id, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/reviews')
  async deleteReview(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    await this.modelsService.deleteReview(req.user.id, id);
    return { success: true };
  }

  @Get(':id/reviews')
  async getReviews(@Param('id') id: string): Promise<ModelReview[]> {
    return this.modelsService.getReviews(id);
  }
}
