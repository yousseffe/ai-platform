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
import { RedisService } from '../../../shared/redis/redis.service';

import { CreateModelDto } from '../dto/create-model.dto';
import { UploadVersionDto } from '../dto/upload-version.dto';
import { ModelType } from '../enums/model-type.enum';
import { TaskType } from '../enums/task-type.enum';
import { Framework } from '../enums/framework.enum';
import { Model } from '../entities/model.entity';
import { ModelVersion } from '../entities/model-version.entity';
import { ModelLog } from '../entities/model-log.entity';
import { detectInjection } from '../../../shared/security/injection-patterns';
import { User } from '../../users/entities/user.entity';
import { ApiKey } from '../../auth/entities/api-key.entity';
import { OrgApiKey } from '../../organizations/entities/org-api-key.entity';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { Transaction } from '../../wallets/entities/transaction.entity';
import { ApiKeyOrJwtGuard } from '../../auth/guards/api-key-or-jwt.guard';
import { WorkspaceInterceptor } from '../../auth/guards/workspace.interceptor';
import { WalletsService } from '../../wallets/services/wallets.service';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { WalletType } from '../../../shared/enums/wallet-type.enum';
import { TransactionType } from '../../wallets/enums/transaction-type.enum';
import { TransactionStatus } from '../../wallets/enums/transaction-status.enum';
import { Deployment } from '../../deployments/entities/deployment.entity';
import { DeploymentStatus } from '../../deployments/enums/deployment-status.enum';
import { VersionStatus } from '../enums/version-status.enum';
import { ApiKeyType } from '../../auth/enums/api-key-type.enum';
import { SystemConfig } from '../../wallets/entities/system-config.entity';
import * as crypto from 'crypto';

/**
 * Interface representing a NestJS request authenticated with a JWT payload.
 */
interface RequestWithUser {
  user: {
    id: string;
    email: string;
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

/** Client request metadata captured per prediction for abuse/fraud analysis. */
interface ClientRequestMeta {
  ipAddress: string | null;
  userAgent: string | null;
  xForwardedFor: string | null;
}

/**
 * Safely extracts client network metadata from the raw Express request for
 * fraud/abuse analysis. Reads only headers/ip — never request bodies here.
 *
 * @param req - The raw request object.
 * @returns The extracted {@link ClientRequestMeta}.
 */
function extractClientMeta(req: Record<string, unknown>): ClientRequestMeta {
  const headers = (req.headers ?? {}) as Record<string, unknown>;
  const ua = headers['user-agent'];
  const xff = headers['x-forwarded-for'];
  const first = (v: unknown): string | null =>
    typeof v === 'string'
      ? v.slice(0, 255)
      : Array.isArray(v) && typeof v[0] === 'string'
        ? v[0].slice(0, 255)
        : null;
  return {
    ipAddress: typeof req.ip === 'string' ? req.ip : null,
    userAgent: first(ua),
    xForwardedFor: first(xff),
  };
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
    private readonly walletsService: WalletsService,
    private readonly dataSource: DataSource,
    @InjectRepository(ModelLog)
    private readonly modelLogRepository: Repository<ModelLog>,
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
    @InjectRepository(OrgApiKey)
    private readonly orgApiKeyRepository: Repository<OrgApiKey>,
    private readonly redisService: RedisService,
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
   * Retrieves prediction logs received on models owned by the authenticated user (Provider).
   *
   * @param req - Authenticated user request context.
   */
  @UseGuards(JwtAuthGuard)
  @Get('logs/provider')
  async getProviderLogs(@Request() req: RequestWithUser): Promise<ModelLog[]> {
    return this.modelLogRepository.find({
      where: { model: { user: { id: req.user.id } } },
      relations: ['model'],
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
   * Proxies a prediction request to the active container deployment.
   * Supports streaming SSE response for LLM GGUF models when requested.
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
    const model = await this.modelsService.getModel(id, req.user.id);
    let url: string;
    let deploymentId: string | null = null;
    try {
      const deployment = await this.dataSource
        .getRepository(Deployment)
        .findOne({
          where: {
            modelVersion: { model: { id } },
            status: DeploymentStatus.RUNNING,
          },
          order: { createdAt: 'DESC' },
          relations: ['modelVersion'],
        });
      if (!deployment || deployment.url === null) {
        throw new NotFoundException(
          'No active deployment found for this model',
        );
      }
      url = deployment.url;
      deploymentId = deployment.id;
    } catch (err: unknown) {
      if (err instanceof NotFoundException) {
        this.logger.log(
          `No active deployment found for model ${id}. Attempting auto-deployment...`,
        );
        // Find latest version
        const latestVersion =
          model.versions && model.versions.length
            ? [...model.versions].sort(
                (a, b) => b.versionNumber - a.versionNumber,
              )[0]
            : null;

        if (!latestVersion) {
          throw new NotFoundException(
            'No versions available for this model to deploy.',
          );
        }

        if (latestVersion.status !== VersionStatus.READY) {
          throw new BadRequestException(
            `Latest version v${latestVersion.versionNumber} is not ready (status: ${latestVersion.status}). Cannot deploy automatically.`,
          );
        }

        // Check if there is already a STARTING deployment
        let deployment = await this.dataSource
          .getRepository(Deployment)
          .findOne({
            where: {
              modelVersion: { id: latestVersion.id },
              status: DeploymentStatus.STARTING,
            },
            order: { createdAt: 'DESC' },
          });

        if (!deployment) {
          this.logger.log(
            `Triggering new auto-deployment for version ${latestVersion.id}...`,
          );
          deployment = await this.deploymentsService.deployVersion(
            latestVersion.id,
          );
        } else {
          this.logger.log(
            `Found already starting deployment ${deployment.id}. Waiting for it...`,
          );
        }

        // Wait for it to become RUNNING
        const isLlm = model.type === ModelType.LLM_GGUF;
        const waitTimeout = isLlm ? 300000 : 30000;
        url = await this.waitForDeployment(deployment.id, waitTimeout);
        deploymentId = deployment.id;
      } else {
        throw err;
      }
    }

    await this.handlePredictionProxy(
      model,
      url,
      deploymentId,
      data,
      req,
      res,
      extractClientMeta(req),
    );
  }

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

    const model = await this.modelsService.getModel(id);
    let url: string;
    let deploymentId: string | null = null;
    try {
      const deployment = await this.dataSource
        .getRepository(Deployment)
        .findOne({
          where: {
            modelVersion: {
              model: { id },
              versionNumber: versionNumber,
            },
            status: DeploymentStatus.RUNNING,
          },
          relations: ['modelVersion'],
        });
      if (!deployment || deployment.url === null) {
        throw new NotFoundException(
          `No active deployment found for version v${versionNumber}`,
        );
      }
      url = deployment.url;
      deploymentId = deployment.id;
    } catch (err: unknown) {
      if (err instanceof NotFoundException) {
        this.logger.log(
          `No active deployment found for model ${id} version v${versionNumber}. Attempting auto-deployment...`,
        );
        // Find specific version
        const targetVersion = model.versions?.find(
          (v) => v.versionNumber === versionNumber,
        );

        if (!targetVersion) {
          throw new NotFoundException(
            `Version v${versionNumber} is not found for this model.`,
          );
        }

        if (targetVersion.status !== VersionStatus.READY) {
          throw new BadRequestException(
            `Version v${targetVersion.versionNumber} is not ready (status: ${targetVersion.status}). Cannot deploy automatically.`,
          );
        }

        // Check if there is already a STARTING deployment
        let deployment = await this.dataSource
          .getRepository(Deployment)
          .findOne({
            where: {
              modelVersion: { id: targetVersion.id },
              status: DeploymentStatus.STARTING,
            },
            order: { createdAt: 'DESC' },
          });

        if (!deployment) {
          this.logger.log(
            `Triggering new auto-deployment for version ${targetVersion.id}...`,
          );
          deployment = await this.deploymentsService.deployVersion(
            targetVersion.id,
          );
        }

        // Wait for it to become RUNNING
        const isLlm = model.type === ModelType.LLM_GGUF;
        const waitTimeout = isLlm ? 300000 : 30000;
        url = await this.waitForDeployment(deployment.id, waitTimeout);
        deploymentId = deployment.id;
      } else {
        throw err;
      }
    }

    await this.handlePredictionProxy(
      model,
      url,
      deploymentId,
      data,
      req,
      res,
      extractClientMeta(req),
    );
  }

  private async handlePredictionProxy(
    model: Model,
    url: string,
    deploymentId: string | null,
    data: Record<string, unknown>,
    req: PredictionRequestContext,
    res: Response,
    clientMeta: ClientRequestMeta,
  ): Promise<void> {
    const isTrial = req.user?.apiKeyType === ApiKeyType.TRIAL;

    // Capture deterministic request fingerprints for fraud/abuse analysis.
    let requestSizeBytes: number | null = null;
    let payloadHash: string | null = null;
    let responseSizeBytes: number | null = null;
    let errorMessage: string | null = null;
    let injectionMatch: string | null = null;
    try {
      const serialized = JSON.stringify(data ?? {});
      requestSizeBytes = Buffer.byteLength(serialized);
      payloadHash = crypto.createHash('sha256').update(serialized).digest('hex');
      injectionMatch = detectInjection(serialized);
    } catch {
      /* non-serializable payload — leave fingerprints null */
    }

    let cost = 0;
    let providerSharePercent = model.providerSharePercent || 80;

    if (!isTrial) {
      if (!model.hasCustomPricing) {
        const configKey = 'price_' + model.type.toLowerCase();
        const priceConfig = await this.dataSource
          .getRepository(SystemConfig)
          .findOne({
            where: { key: configKey },
          });
        cost = priceConfig ? parseFloat(priceConfig.value) : 0.1;

        const shareConfig = await this.dataSource
          .getRepository(SystemConfig)
          .findOne({
            where: { key: 'default_provider_share_percent' },
          });
        providerSharePercent = shareConfig
          ? parseInt(shareConfig.value, 10)
          : 80;
      } else {
        cost =
          typeof model.costPerRequest === 'string'
            ? parseFloat(model.costPerRequest)
            : model.costPerRequest;
      }
    }

    if (cost > 0) {
      const balance = await this.walletsService.getBalance(
        req.workspaceId,
        req.workspaceType,
        WalletType.CONSUMER,
      );
      if (balance < cost) {
        throw new BadRequestException(
          'Insufficient credits to perform prediction',
        );
      }
    }

    // Retrieve active API key of the model owner to authorize NestJS proxy call to the container.
    // The container templates enforce checking the request headers for this API key.
    const modelOwnerApiKeyEntity = await this.apiKeyRepository.findOne({
      where: { user: { id: model.user.id }, type: ApiKeyType.LIVE, isActive: true },
    });
    const containerApiKey = modelOwnerApiKeyEntity?.key || '';

    const targetEndpoint =
      model.type === ModelType.LLM_GGUF ? '/v1/chat/completions' : '/predict';

    const startTime = Date.now();
    let statusCode = 200;
    let executionStatus = 'SUCCESS';

    const headers = {
      Authorization: `Bearer ${containerApiKey}`,
      'x-api-key': containerApiKey,
    };

    try {
      if (deploymentId) {
        await this.redisService.set(
          `model:last-active:${deploymentId}`,
          Date.now().toString(),
        );
      }

      if (data.stream === true) {
        const response = await firstValueFrom(
          this.httpService.post<Readable>(`${url}${targetEndpoint}`, data, {
            headers,
            responseType: 'stream',
          }),
        );

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        response.data.pipe(res);
      } else {
        const response = await firstValueFrom(
          this.httpService.post<unknown>(`${url}${targetEndpoint}`, data, {
            headers,
          }),
        );
        try {
          responseSizeBytes = Buffer.byteLength(JSON.stringify(response.data));
        } catch {
          /* leave response size null */
        }
        res.json(response.data);
      }
    } catch (err: unknown) {
      executionStatus = 'FAILED';
      statusCode = 500;
      const message = err instanceof Error ? err.message : String(err);
      errorMessage = message.slice(0, 1000);
      res.status(500).json({ error: `Prediction failed: ${message}` });
      return;
    } finally {
      const endTime = Date.now();
      const responseTimeMs = endTime - startTime;

      // Charge the user and write transaction logs if cost > 0 and request succeeded
      if (cost > 0 && executionStatus === 'SUCCESS') {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
          const callerUser = req.user.orgApiKeyId
            ? null
            : await queryRunner.manager.findOne(User, {
                where: { id: req.user.id },
              });
          const callerEmail =
            callerUser?.email ||
            req.user.orgApiKeyLabel ||
            req.user.email ||
            'Organization API Key';

          // 1. Deduct cost from consumer wallet
          await queryRunner.manager.query(
            `UPDATE wallets SET balance = balance - $1 WHERE owner_id = $2 AND owner_type = $3 AND wallet_type = $4`,
            [cost, req.workspaceId, req.workspaceType, WalletType.CONSUMER],
          );

          // Get consumer wallet ID to write transaction
          const consumerWallet = await queryRunner.manager.findOne(Wallet, {
            where: {
              ownerId: req.workspaceId,
              ownerType: req.workspaceType,
              walletType: WalletType.CONSUMER,
            },
          });

          if (consumerWallet) {
            const consumerTx = queryRunner.manager.create(Transaction, {
              walletId: consumerWallet.id,
              type: TransactionType.DEBIT,
              amount: cost,
              reference: `Inference debit for model: ${model.name}`,
              status: TransactionStatus.COMPLETED,
            });
            await queryRunner.manager.save(Transaction, consumerTx);
          }

          // Load system config for credits_per_egp
          let config = await queryRunner.manager.findOne(SystemConfig, {
            where: { key: 'credits_per_egp' },
          });
          if (!config) {
            config = await queryRunner.manager.findOne(SystemConfig, {
              where: { key: 'credits_per_usd' },
            });
          }
          const creditsPerEgp = config ? parseInt(config.value, 10) || 10 : 10;
          const costInEgp = cost / creditsPerEgp;

          // 2. Pay Provider (model owner) in EGP
          const providerShareEgp = costInEgp * (providerSharePercent / 100);

          // Update model's total earnings in database
          await queryRunner.manager.query(
            `UPDATE models SET total_earnings = total_earnings + $1 WHERE id = $2`,
            [providerShareEgp, model.id],
          );

          let providerWallet = await queryRunner.manager.findOne(Wallet, {
            where: {
              ownerId: model.user.id,
              ownerType: OwnerType.USER,
              walletType: WalletType.PROVIDER,
            },
          });

          if (!providerWallet) {
            providerWallet = queryRunner.manager.create(Wallet, {
              ownerId: model.user.id,
              ownerType: OwnerType.USER,
              walletType: WalletType.PROVIDER,
              balance: 0.0,
              currency: 'EGP',
            });
            providerWallet = await queryRunner.manager.save(
              Wallet,
              providerWallet,
            );
          }

          const currentProviderBalance =
            typeof providerWallet.balance === 'string'
              ? parseFloat(providerWallet.balance)
              : providerWallet.balance;
          providerWallet.balance = currentProviderBalance + providerShareEgp;
          await queryRunner.manager.save(Wallet, providerWallet);

          const providerTx = queryRunner.manager.create(Transaction, {
            walletId: providerWallet.id,
            type: TransactionType.CREDIT,
            amount: providerShareEgp,
            reference: `Inference credit share for model: ${model.name} by user ${callerEmail} (EGP ${providerShareEgp.toFixed(4)})`,
            status: TransactionStatus.COMPLETED,
          });
          await queryRunner.manager.save(Transaction, providerTx);

          // 3. Pay Platform Admin in EGP
          const platformShareEgp = costInEgp - providerShareEgp;
          if (platformShareEgp > 0) {
            const systemOwnerId = '00000000-0000-0000-0000-000000000000';

            // Check if system wallet exists, if not create
            let systemWallet = await queryRunner.manager.findOne(Wallet, {
              where: {
                ownerId: systemOwnerId,
                ownerType: OwnerType.USER,
                walletType: WalletType.PROVIDER,
              },
            });

            if (!systemWallet) {
              systemWallet = queryRunner.manager.create(Wallet, {
                walletType: WalletType.PROVIDER,
                ownerType: OwnerType.USER,
                ownerId: systemOwnerId,
                balance: 0.0,
                currency: 'EGP',
              });
              await queryRunner.manager.save(Wallet, systemWallet);
            }

            const currentSystemBalance =
              typeof systemWallet.balance === 'string'
                ? parseFloat(systemWallet.balance)
                : systemWallet.balance;
            systemWallet.balance = currentSystemBalance + platformShareEgp;
            await queryRunner.manager.save(Wallet, systemWallet);

            const platformTx = queryRunner.manager.create(Transaction, {
              walletId: systemWallet.id,
              type: TransactionType.CREDIT,
              amount: platformShareEgp,
              reference: `Platform commission for model: ${model.name} from call by user ${callerEmail} (EGP ${platformShareEgp.toFixed(4)})`,
              status: TransactionStatus.COMPLETED,
            });
            await queryRunner.manager.save(Transaction, platformTx);
          }

          await queryRunner.commitTransaction();
        } catch (error) {
          await queryRunner.rollbackTransaction();
          console.error('[Billing Error] Rollback transaction:', error);
        } finally {
          await queryRunner.release();
        }
      }

      // Save execution details to ModelLog
      try {
        const callerUser = req.user.orgApiKeyId
          ? null
          : await this.dataSource.getRepository(User).findOneBy({
              id: req.user.id,
            });
        const orgApiKey = req.user.orgApiKeyId
          ? await this.orgApiKeyRepository.findOneBy({
              id: req.user.orgApiKeyId,
            })
          : null;
        const logEntry = this.modelLogRepository.create({
          model,
          user: callerUser,
          apiKey: req.user.apiKey || req.user.orgApiKeyPrefix || 'JWT Session',
          orgApiKey,
          orgId: req.user.orgId ?? null,
          projectId: req.user.projectId ?? null,
          apiKeyLabel: req.user.orgApiKeyLabel ?? null,
          apiKeyPrefix: req.user.orgApiKeyPrefix ?? null,
          creditsCharged: executionStatus === 'SUCCESS' ? cost : 0,
          responseTimeMs,
          status: executionStatus,
          statusCode,
          ipAddress: clientMeta.ipAddress,
          userAgent: clientMeta.userAgent,
          xForwardedFor: clientMeta.xForwardedFor,
          requestSizeBytes,
          responseSizeBytes,
          payloadHash,
          errorMessage,
          injectionMatch,
        });
        await this.modelLogRepository.save(logEntry);
      } catch (logError) {
        console.error('Failed to save model execution log:', logError);
      }
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
    @Req() req: any,
  ): Promise<{ buildLogs: string | null }> {
    const model = await this.modelsService.getModel(id);
    if (!model) {
      throw new NotFoundException('Model not found');
    }
    // Check ownership
    if (model.user?.id !== req.user.id && !req.user.isAdmin) {
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
   * Helper method that polls deployment state until it becomes RUNNING or FAILED.
   * Used for on-demand cold starts when a model has no active containers.
   */
  private async waitForDeployment(
    deploymentId: string,
    timeoutMs = 30000,
  ): Promise<string> {
    const startTime = Date.now();
    const interval = 500; // check every 500ms

    while (Date.now() - startTime < timeoutMs) {
      const dep = await this.deploymentsService.getDeployment(deploymentId);
      if (dep) {
        if (dep.status === DeploymentStatus.RUNNING && dep.url) {
          // Allow 3 seconds for Uvicorn serving process to boot up inside the container
          await new Promise((resolve) => setTimeout(resolve, 3000));
          return dep.url;
        }
        if (dep.status === DeploymentStatus.FAILED) {
          throw new BadRequestException(
            `Auto-deployment failed: ${dep.errorMessage || 'Unknown error'}`,
          );
        }
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new BadRequestException(
      'Auto-deployment timed out. Please try again.',
    );
  }
}
