import {
  Controller,
  Post,
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
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ModelsService } from '../services/models.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { DeploymentsService } from '../../deployments/services/deployments.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Readable } from 'stream';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { CreateModelDto } from '../dto/create-model.dto';
import { UploadVersionDto } from '../dto/upload-version.dto';
import { CreateReviewDto } from '../dto/create-review.dto';
import { ModelType } from '../enums/model-type.enum';
import { TaskType } from '../enums/task-type.enum';
import { Framework } from '../enums/framework.enum';
import { Model } from '../entities/model.entity';
import { ModelVersion } from '../entities/model-version.entity';
import { ModelLog } from '../entities/model-log.entity';
import { ModelReview } from '../entities/model-review.entity';
import { ApiKey } from '../../auth/entities/api-key.entity';
import { User } from '../../users/entities/user.entity';
import { OrgApiKey } from '../../organizations/entities/org-api-key.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { Project } from '../../organizations/entities/project.entity';
import { ApiKeyOrJwtGuard } from '../../auth/guards/api-key-or-jwt.guard';
import { WorkspaceInterceptor } from '../../auth/guards/workspace.interceptor';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { OrgStatus } from '../../organizations/enums/org-status.enum';
import { OrgType } from '../../organizations/enums/org-type.enum';
import { DeploymentStatus } from '../../deployments/enums/deployment-status.enum';
import { ApiKeyType } from '../../auth/enums/api-key-type.enum';
import { SystemConfig } from '../../wallets/entities/system-config.entity';
import * as crypto from 'crypto';
import { InferenceClient } from '../services/inference-client.service';
import { ClientRequestMeta, PredictionActor } from '../interfaces/inference.interface';
import { extractClientMeta } from '../../../shared/utils/client-meta.util';

/**
 * Interface representing a NestJS request authenticated with a JWT payload.
 */
interface RequestWithUser {
  user: {
    id: string;
    email: string;
    isAdmin?: boolean;
  };
  workspaceId?: string;
  workspaceType?: OwnerType;
}

interface PredictionRequestContext {
  user: {
    id: string;
    email: string;
    apiKey?: string;
    apiKeyType?: ApiKeyType;
    orgApiKeyId?: string;
    orgApiKeyLabel?: string;
    orgApiKeyPrefix?: string;
    orgId?: string;
    projectId?: string;
  };
  workspaceId: string;
  workspaceType: OwnerType;
}

/**
 * Controller exposing REST endpoints for ML model catalog management,
 * version uploading, and proxying client prediction requests.
 */
@Controller('models')
export class ModelsController {
  private readonly logger = new Logger(ModelsController.name);

  constructor(
    private readonly modelsService: ModelsService,
    private readonly deploymentsService: DeploymentsService,
    private readonly httpService: HttpService,
    private readonly dataSource: DataSource,
    @InjectRepository(ModelLog)
    private readonly modelLogRepository: Repository<ModelLog>,
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
    @InjectRepository(OrgApiKey)
    private readonly orgApiKeyRepository: Repository<OrgApiKey>,
    private readonly inferenceClient: InferenceClient,
  ) {}

  /**
   * Registers a new model category registry inside the database.
   *
   * @param body - The create model specifications.
   * @param req - Authenticated user request context.
   * @returns A promise resolving to the created Model.
   */
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

  /**
   * Retrieves all models created by the authenticated user.
   *
   * @param req - Authenticated user request context.
   * @returns A promise resolving to an array of Models.
   */
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(WorkspaceInterceptor)
  @Get()
  async getModels(@Request() req: RequestWithUser): Promise<Model[]> {
    return this.modelsService.getModels(
      req.user.id,
      req.workspaceType === OwnerType.ORG ? req.workspaceId : undefined,
    );
  }

  /**
   * Retrieves all public models listing inside the marketplace catalog registry.
   *
   * @returns A promise resolving to an array of public Models.
   */
  @Get('marketplace')
  async getPublicModels(): Promise<Model[]> {
    return this.modelsService.getPublicModels();
  }

  /**
   * Retrieves a single public model by ID for guest users.
   *
   * @param id - The model UUID.
   * @returns A promise resolving to the public Model.
   */
  @Get('marketplace/:id')
  async getPublicModel(@Param('id') id: string): Promise<Model> {
    return this.modelsService.getPublicModel(id);
  }

  /**
   * Retrieves prediction logs made by the authenticated user (Consumer).
   *
   * @param req - Authenticated user request context.
   * @returns A list of model execution logs.
   */
  @UseGuards(JwtAuthGuard)
  @Get('logs/consumer')
  async getConsumerLogs(@Request() req: RequestWithUser): Promise<ModelLog[]> {
    return this.modelLogRepository.find({
      where: { user: { id: req.user.id } },
      relations: ['model'],
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  /**
   * Retrieves summary usage statistics (call count and credits spent) per model for the consumer.
   *
   * @param req - Authenticated user request context.
   * @returns An array of stats per model.
   */
  @UseGuards(JwtAuthGuard)
  @Get('logs/consumer/stats')
  async getConsumerStats(@Request() req: RequestWithUser) {
    const stats = await this.modelLogRepository
      .createQueryBuilder('log')
      .innerJoinAndSelect('log.model', 'model')
      .select('model.id', 'modelId')
      .addSelect('model.name', 'modelName')
      .addSelect('model.type', 'modelType')
      .addSelect('model.framework', 'modelFramework')
      .addSelect('model.cost_per_request', 'costPerRequest')
      .addSelect('COUNT(log.id)', 'callCount')
      .addSelect(
        "SUM(CASE WHEN log.status = 'SUCCESS' THEN model.cost_per_request ELSE 0 END)",
        'totalSpent',
      )
      .where('log.user_id = :userId', { userId: req.user.id })
      .groupBy('model.id')
      .addGroupBy('model.name')
      .addGroupBy('model.type')
      .addGroupBy('model.framework')
      .addGroupBy('model.cost_per_request')
      .getRawMany();

    return stats.map((s) => ({
      modelId: s.modelId,
      modelName: s.modelName,
      modelType: s.modelType,
      modelFramework: s.modelFramework,
      costPerRequest: parseFloat(s.costPerRequest || '0'),
      callCount: parseInt(s.callCount || '0', 10),
      totalSpent: parseFloat(s.totalSpent || '0'),
    }));
  }

  /**
   * Retrieves recent prediction logs for the active publishing workspace.
   * Personal workspaces read user-owned models, while organization workspaces
   * read organization-owned models.
   *
   * @param req - Authenticated user request context.
   */
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(WorkspaceInterceptor)
  @Get('logs/provider')
  async getProviderLogs(@Request() req: RequestWithUser): Promise<ModelLog[]> {
    const where =
      req.workspaceType === OwnerType.ORG
        ? { model: { organization: { id: req.workspaceId } } }
        : { model: { user: { id: req.user.id } } };

    return this.modelLogRepository.find({
      where,
      relations: ['model', 'model.organization'],
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  /**
   * Fetches metadata for a specific model by ID.
   *
   * @param id - The model UUID.
   * @returns A promise resolving to the detailed Model.
   */
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

  /**
   * Retrieves or generates the sandbox trial API key for the authenticated user and model.
   *
   * @param id - Model UUID.
   * @param req - Authenticated user request envelope.
   * @returns Object containing the trial API key and trial call limits details.
   */
  @UseGuards(JwtAuthGuard)
  @Get(':id/playground-key')
  async getPlaygroundKey(
    @Param('id') id: string,
    @Req() req: Record<string, unknown> & { user: { id: string } },
  ) {
    const userId = req.user.id;
    const model = await this.modelsService.getModel(id, req.user.id);
    if (!model) {
      throw new NotFoundException('Model not found');
    }

    let apiKeyEntity = await this.apiKeyRepository.findOne({
      where: {
        user: { id: userId },
        model: { id },
        type: ApiKeyType.TRIAL,
        isActive: true,
      },
    });

    const limitConfig = await this.dataSource
      .getRepository(SystemConfig)
      .findOne({
        where: { key: 'playground_trial_limit' },
      });
    const limit = limitConfig ? parseInt(limitConfig.value, 10) : 50;

    if (!apiKeyEntity) {
      const user = await this.dataSource
        .getRepository(User)
        .findOneBy({ id: userId });
      const trialKey = 'ml_sk_trial_' + crypto.randomBytes(24).toString('hex');
      apiKeyEntity = this.apiKeyRepository.create({
        key: trialKey,
        user: user!,
        model,
        name: 'Playground Trial Key',
        type: ApiKeyType.TRIAL,
        isActive: true,
        callsCount: 0,
      });
      apiKeyEntity = await this.apiKeyRepository.save(apiKeyEntity);
    }

    return {
      key: apiKeyEntity.key,
      callsCount: apiKeyEntity.callsCount,
      limit,
    };
  }

  /**
   * Uploads model artifact files (weights, scalers, and custom pre/post processing hooks)
   * to MinIO and enqueues a packaging background task.
   *
   * @param id - The parent model UUID.
   * @param body - Version parameters including examplePayload and expectedResult.
   * @param files - Map of files uploaded via Multer.
   * @returns A promise resolving to the created ModelVersion.
   */
  @UseGuards(JwtAuthGuard)
  @Post(':id/versions')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'model', maxCount: 1 },
        { name: 'scaler', maxCount: 1 },
        { name: 'preprocess', maxCount: 1 },
        { name: 'postprocess', maxCount: 1 },
      ],
      {
        limits: { fileSize: 15 * 1024 * 1024 * 1024 }, // 15GB
        storage: diskStorage({
          destination: './uploads',
          filename: (req, file, cb) => {
            const uniqueSuffix =
              Date.now() + '-' + Math.round(Math.random() * 1e9);
            cb(
              null,
              file.fieldname + '-' + uniqueSuffix + extname(file.originalname),
            );
          },
        }),
      },
    ),
  )
  async uploadVersion(
    @Param('id') id: string,
    @Body() body: UploadVersionDto,
    @UploadedFiles()
    files: {
      model?: Express.Multer.File[];
      scaler?: Express.Multer.File[];
      preprocess?: Express.Multer.File[];
      postprocess?: Express.Multer.File[];
    },
    @Request() req: RequestWithUser,
  ): Promise<ModelVersion> {
    return this.modelsService.uploadVersion(
      id,
      files,
      body.examplePayload,
      body.expectedResult,
      body.triggerBuild,
      req.user.id,
      body.classLabels,
    );
  }

  /**
   * Maintainer pull-request style decision for an organization model version.
   */
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

  /**
   * Saves a reusable reviewer test case against a version.
   */
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

  /**
   * Lists saved reviewer test cases for a version.
   */
  @UseGuards(JwtAuthGuard)
  @Get('versions/:versionId/test-cases')
  async getVersionTestCases(
    @Param('versionId') versionId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.modelsService.getVersionTestCases(versionId, req.user.id);
  }

  /**
   * Returns signed artifact links for VS Code style review panels.
   */
  @UseGuards(JwtAuthGuard)
  @Get('versions/:versionId/artifacts')
  async getVersionArtifacts(
    @Param('versionId') versionId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.modelsService.getVersionArtifactPreview(versionId, req.user.id);
  }

  /**
   * Append-only model governance history.
   */
  @UseGuards(JwtAuthGuard)
  @Get(':id/history')
  async getModelHistory(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    return this.modelsService.getModelHistory(id, req.user.id);
  }

  /**
   * Provider organization analytics for decision making and member monitoring.
   */
  @UseGuards(JwtAuthGuard)
  @Get('organizations/:orgId/analytics')
  async getOrganizationModelAnalytics(
    @Param('orgId') orgId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.modelsService.getOrganizationModelAnalytics(orgId, req.user.id);
  }

  /**
   * Proxies a prediction request to the active container deployment, via the
   * shared {@link InferenceClient}. Supports streaming SSE response for LLM
   * GGUF models when requested.
   *
   * @param id - The model UUID.
   * @param data - Raw JSON payload representing inputs.
   * @param res - Express response object for SSE/streaming output.
   */
  @UseGuards(ApiKeyOrJwtGuard)
  @UseInterceptors(WorkspaceInterceptor)
  @Post(':id/predict')
  async predict(
    @Param('id') id: string,
    @Body() data: Record<string, unknown>,
    @Req()
    req: Record<string, unknown> & PredictionRequestContext,
    @Res() res: Response,
  ): Promise<void> {
    const model = await this.modelsService.getModel(
      id,
      req.user.orgApiKeyId ? undefined : req.user.id,
    );
    const { url, deploymentId } = await this.inferenceClient.resolveDeploymentUrl(model);
    await this.respondWithPrediction(model, url, deploymentId, data, req, res);
  }

  /**
   * Proxies a prediction request to a specific pinned model version's
   * deployment. See {@link predict} for the latest-version equivalent.
   */
  @UseGuards(ApiKeyOrJwtGuard)
  @UseInterceptors(WorkspaceInterceptor)
  @Post(':id/v:versionNum/predict')
  async predictVersion(
    @Param('id') id: string,
    @Param('versionNum') versionNum: string,
    @Body() data: Record<string, unknown>,
    @Req()
    req: Record<string, unknown> & PredictionRequestContext,
    @Res() res: Response,
  ): Promise<void> {
    const versionNumber = parseInt(versionNum, 10);
    if (isNaN(versionNumber)) {
      throw new BadRequestException('Invalid version number');
    }

    const model = await this.modelsService.getModel(
      id,
      req.user.orgApiKeyId ? undefined : req.user.id,
    );
    const { url, deploymentId } = await this.inferenceClient.resolveDeploymentUrl(
      model,
      versionNumber,
    );
    await this.respondWithPrediction(model, url, deploymentId, data, req, res);
  }

  /**
   * Validates that an organization API key is active, scoped to an active
   * project, and authorized to call the target model (a public marketplace
   * model, or one owned by the same organization, and not scoped to a
   * different model). No-op for JWT sessions and personal `ml_sk_*` keys.
   *
   * @param model - The model being predicted against.
   * @param req - The authenticated prediction request context.
   * @returns The validated {@link OrgApiKey}, or `null` if the caller isn't using one.
   */
  private async assertOrgApiKeyPredictionAccess(
    model: Model,
    req: PredictionRequestContext,
  ): Promise<OrgApiKey | null> {
    if (!req.user.orgApiKeyId) {
      return null;
    }

    const orgApiKey = await this.orgApiKeyRepository.findOne({
      where: {
        id: req.user.orgApiKeyId,
        orgId: req.user.orgId,
        projectId: req.user.projectId,
        isActive: true,
      },
      relations: ['model'],
    });

    if (!orgApiKey) {
      throw new ForbiddenException(
        'This organization API key is invalid or has been revoked',
      );
    }

    const organization = await this.dataSource
      .getRepository(Organization)
      .findOne({
        where: { id: orgApiKey.orgId },
      });

    if (!organization) {
      throw new ForbiddenException(
        'The organization attached to this API key no longer exists',
      );
    }

    if (organization.status !== OrgStatus.ACTIVE) {
      throw new ForbiddenException(
        'This organization is inactive and cannot use API keys',
      );
    }

    if (
      organization.type !== OrgType.CONSUMER &&
      organization.type !== OrgType.HYBRID
    ) {
      throw new ForbiddenException(
        'This organization API key can only be used from consumer-capable workspaces',
      );
    }

    const project = await this.dataSource.getRepository(Project).findOne({
      where: {
        id: orgApiKey.projectId,
        orgId: orgApiKey.orgId,
        isActive: true,
      },
    });

    if (!project) {
      throw new ForbiddenException(
        'The project attached to this API key is inactive or no longer exists',
      );
    }

    const isSameOrgModel = model.organization?.id === organization.id;
    if (!model.isPublic && !isSameOrgModel) {
      throw new ForbiddenException(
        'This organization API key can only call public marketplace models or models owned by the same organization',
      );
    }

    if (orgApiKey.model && orgApiKey.model.id !== model.id) {
      throw new ForbiddenException(
        `This organization API key is scoped to model "${orgApiKey.model.name}" only`,
      );
    }

    return orgApiKey;
  }

  /**
   * Builds the {@link PredictionActor} identity used for billing/logging from
   * the authenticated request context.
   */
  private buildActor(req: PredictionRequestContext): PredictionActor {
    return {
      userId: req.user.id,
      email: req.user.email,
      apiKey: req.user.apiKey,
      apiKeyType: req.user.apiKeyType,
      orgApiKeyId: req.user.orgApiKeyId,
      orgApiKeyLabel: req.user.orgApiKeyLabel,
      orgApiKeyPrefix: req.user.orgApiKeyPrefix,
      orgId: req.user.orgId,
      projectId: req.user.projectId,
      workspaceId: req.workspaceId,
      workspaceType: req.workspaceType,
    };
  }

  /**
   * Dispatches a resolved deployment call to either the streaming SSE path
   * (LLM `stream: true` requests) or the standard JSON
   * {@link InferenceClient.runInference} path. Validates organization API key
   * scoping first when the caller authenticated with one.
   */
  private async respondWithPrediction(
    model: Model,
    url: string,
    deploymentId: string,
    data: Record<string, unknown>,
    req: Record<string, unknown> & PredictionRequestContext,
    res: Response,
  ): Promise<void> {
    const orgApiKey = await this.assertOrgApiKeyPredictionAccess(model, req);
    const actor = this.buildActor(req);
    const clientMeta = extractClientMeta(req);

    if (data.stream === true) {
      await this.streamPrediction(model, url, deploymentId, data, actor, clientMeta, res);
      this.touchOrgApiKeyUsage(orgApiKey);
      return;
    }

    const result = await this.inferenceClient.runInference(
      model,
      url,
      deploymentId,
      data,
      actor,
      clientMeta,
    );
    if (result.status === 'FAILED') {
      res.status(result.statusCode).json({ error: `Prediction failed: ${result.errorMessage}` });
      return;
    }
    this.touchOrgApiKeyUsage(orgApiKey);
    res.json(result.output);
  }

  /** Fire-and-forget freshness update for a successfully used organization API key. */
  private touchOrgApiKeyUsage(orgApiKey: OrgApiKey | null): void {
    if (!orgApiKey) {
      return;
    }
    this.orgApiKeyRepository
      .update(orgApiKey.id, { lastUsedAt: new Date() })
      .catch(() => undefined);
  }

  /**
   * Pipes a streaming SSE prediction response directly to the client while
   * still charging and logging the call exactly like a non-streaming one.
   */
  private async streamPrediction(
    model: Model,
    url: string,
    deploymentId: string,
    data: Record<string, unknown>,
    actor: PredictionActor,
    clientMeta: ClientRequestMeta,
    res: Response,
  ): Promise<void> {
    const prepared = await this.inferenceClient.prepareCall(model, actor);
    const startTime = Date.now();

    try {
      await this.inferenceClient.markActive(deploymentId);

      const response = await firstValueFrom(
        this.httpService.post<Readable>(`${url}${prepared.endpoint}`, data, {
          headers: prepared.headers,
          responseType: 'stream',
        }),
      );

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      response.data.pipe(res);

      await this.inferenceClient.recordOutcome({
        model,
        actor,
        clientMeta,
        data,
        cost: prepared.cost,
        providerSharePercent: prepared.providerSharePercent,
        statusCode: 200,
        status: 'SUCCESS',
        responseTimeMs: Date.now() - startTime,
        errorMessage: null,
        responseSizeBytes: null,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      await this.inferenceClient.recordOutcome({
        model,
        actor,
        clientMeta,
        data,
        cost: prepared.cost,
        providerSharePercent: prepared.providerSharePercent,
        statusCode: 500,
        status: 'FAILED',
        responseTimeMs: Date.now() - startTime,
        errorMessage: message.slice(0, 1000),
        responseSizeBytes: null,
      });
      res.status(500).json({ error: `Prediction failed: ${message}` });
    }
  }

  /**
   * Deletes a specific model and all its versions.
   *
   * @param id - The model UUID to delete.
   * @returns Success confirmation.
   */
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteModel(
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.modelsService.deleteModel(id);
    return { success: true, message: 'Model deleted successfully' };
  }

  /**
   * Deletes a specific model version iteration.
   *
   * @param versionId - The model version UUID to delete.
   * @returns Success confirmation.
   */
  @UseGuards(JwtAuthGuard)
  @Delete('versions/:versionId')
  async deleteVersion(
    @Param('versionId') versionId: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.modelsService.deleteVersion(versionId);
    return { success: true, message: 'Model version deleted successfully' };
  }

  /**
   * Deprecates a model version, stopping its container if it is running.
   */
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

  /**
   * Undeprecates a model version, returning it to READY status.
   */
  @UseGuards(JwtAuthGuard)
  @Post('versions/:versionId/undeprecate')
  async undeprecateVersion(
    @Param('versionId') versionId: string,
  ): Promise<ModelVersion> {
    return this.modelsService.undeprecateVersion(versionId);
  }

  /**
   * Retrieves build/compilation logs for a specific model version iteration.
   */
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

  /**
   * Submits or updates a consumer rating and comment for a public model.
   * Only consumers who have generated at least one API key for this model can review.
   */
  @UseGuards(JwtAuthGuard)
  @Post(':id/reviews')
  async createOrUpdateReview(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: CreateReviewDto,
  ): Promise<ModelReview> {
    return this.modelsService.createOrUpdateReview(req.user.id, id, dto);
  }

  /**
   * Deletes a user's review for a model.
   */
  @UseGuards(JwtAuthGuard)
  @Delete(':id/reviews')
  async deleteReview(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    await this.modelsService.deleteReview(req.user.id, id);
    return { success: true };
  }

  /**
   * Retrieves all user reviews and ratings for a specific model.
   */
  @Get(':id/reviews')
  async getReviews(@Param('id') id: string): Promise<ModelReview[]> {
    return this.modelsService.getReviews(id);
  }
}
