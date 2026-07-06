import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Param,
  UseInterceptors,
  Res,
  Req,
  Query,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Response } from 'express';
import { ModelsService } from '../../models';
import {
  ProviderInsightsResponse,
  ProviderInsightsService,
} from '../services/provider-insights.service';
import { Model } from '../../models/entities/model.entity';
import { ApiKeyType } from '../../auth';
import { ApiKey } from '../../auth/entities/api-key.entity';
import { WorkspaceInterceptor } from '../../../shared/interceptors/workspace.interceptor';
import { ApiKeyOrJwtGuard } from '../../../shared/guards/api-key-or-jwt.guard';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { User } from '../../users/entities/user.entity';
import { OrgStatus, OrgType } from '../../organizations';
import { OrgApiKey } from '../../organizations/entities/org-api-key.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { Project } from '../../organizations/entities/project.entity';
import { SystemConfig } from '../../wallets/entities/system-config.entity';
import { FirewallService } from '../../firewall';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Readable } from 'stream';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InferenceStatus } from '../enums/inference-status.enum';
import { ModelLog } from '../entities/model-log.entity';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import * as crypto from 'crypto';
import { InferenceClient } from '../services/inference-client.service';
import {
  ClientRequestMeta,
  PredictionActor,
  RequestWithUser,
  PredictionRequestContext,
} from '../interfaces/inference.interface';
import { extractClientMeta } from '../../../shared/utils/client-meta.util';
import { detectInjection } from '../../../shared/security/injection-patterns';

@Controller('models')
export class InferenceController {
  constructor(
    private readonly modelsService: ModelsService,
    private readonly httpService: HttpService,
    private readonly dataSource: DataSource,
    @InjectRepository(ModelLog)
    private readonly modelLogRepository: Repository<ModelLog>,
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
    @InjectRepository(OrgApiKey)
    private readonly orgApiKeyRepository: Repository<OrgApiKey>,
    private readonly inferenceClient: InferenceClient,
    private readonly providerInsightsService: ProviderInsightsService,
    private readonly firewallService: FirewallService,
  ) {}

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

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(WorkspaceInterceptor)
  @Get('logs/provider')
  async getProviderLogs(@Request() req: RequestWithUser): Promise<ModelLog[]> {
    return this.modelLogRepository.find({
      where: { model: { user: { id: req.user.id } } },
      relations: ['model', 'model.organization'],
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(WorkspaceInterceptor)
  @Get('logs/provider/insights')
  async getProviderInsights(
    @Request() req: RequestWithUser,
    @Query('days') days?: string,
  ): Promise<ProviderInsightsResponse> {
    return this.providerInsightsService.getInsights(
      {
        userId: req.user.id,
        workspaceId: req.user.id,
        workspaceType: OwnerType.USER,
      },
      days ? parseInt(days, 10) : 30,
    );
  }

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
    const { url, deploymentId } =
      await this.inferenceClient.resolveDeploymentUrl(model);
    await this.respondWithPrediction(model, url, deploymentId, data, req, res);
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

    const model = await this.modelsService.getModel(
      id,
      req.user.orgApiKeyId ? undefined : req.user.id,
    );
    const { url, deploymentId } =
      await this.inferenceClient.resolveDeploymentUrl(model, versionNumber);
    await this.respondWithPrediction(model, url, deploymentId, data, req, res);
  }

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

  private buildActor(req: PredictionRequestContext): PredictionActor {
    return {
      userId: req.user.id,
      email: req.user.email,
      apiKey: req.user.apiKey,
      apiKeyType: req.user.apiKeyType,
      apiKeyId: req.user.apiKeyId,
      orgApiKeyId: req.user.orgApiKeyId,
      orgApiKeyLabel: req.user.orgApiKeyLabel,
      orgApiKeyPrefix: req.user.orgApiKeyPrefix,
      orgId: req.user.orgId,
      projectId: req.user.projectId,
      workspaceId: req.workspaceId ?? req.user.id,
      workspaceType: req.workspaceType ?? OwnerType.USER,
    };
  }

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

    await this.firewallService.assertRequestAllowed({
      modelId: model.id,
      orgId: model.organization?.id ?? req.user.orgId ?? null,
      ipAddress: clientMeta.ipAddress,
      injectionMatch: detectInjection(JSON.stringify(data ?? {})),
      userId: req.user?.id ?? null,
    });

    if (data.stream === true) {
      await this.streamPrediction(
        model,
        url,
        deploymentId,
        data,
        actor,
        clientMeta,
        res,
      );
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
    if (result.status === InferenceStatus.FAILED) {
      res
        .status(result.statusCode)
        .json({ error: `Prediction failed: ${result.errorMessage}` });
      return;
    }
    this.touchOrgApiKeyUsage(orgApiKey);
    res.setHeader('X-Cache', result.cacheHit ? 'HIT' : 'MISS');
    res.json(result.output);
  }

  private touchOrgApiKeyUsage(orgApiKey: OrgApiKey | null): void {
    if (!orgApiKey) {
      return;
    }
    this.orgApiKeyRepository
      .update(orgApiKey.id, { lastUsedAt: new Date() })
      .catch(() => undefined);
  }

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

      await this.inferenceClient.recordOutcome({
        model,
        actor,
        clientMeta,
        data,
        cost: prepared.cost,
        providerSharePercent: prepared.providerSharePercent,
        statusCode: 200,
        status: InferenceStatus.SUCCESS,
        responseTimeMs: Date.now() - startTime,
        errorMessage: null,
        responseSizeBytes: null,
      });

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      response.data.pipe(res);
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
        status: InferenceStatus.FAILED,
        responseTimeMs: Date.now() - startTime,
        errorMessage: message.slice(0, 1000),
        responseSizeBytes: null,
      });
      res.status(500).json({ error: `Prediction failed: ${message}` });
    }
  }
}
