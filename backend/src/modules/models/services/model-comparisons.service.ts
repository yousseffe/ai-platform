import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Model } from '../entities/model.entity';
import {
  InferenceClient,
  InferenceStatus,
  PredictionActor,
} from '../../inference';
import { ModelLog } from '../entities/model-log.entity';
import { OrgType, OrganizationsService } from '../../organizations';
import { DeploymentStatus } from '../../deployments';
import { ModelComparisonSession } from '../entities/model-comparison-session.entity';
import { ModelComparisonResult } from '../entities/model-comparison-result.entity';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { extractClientMeta } from '../../../shared/utils/client-meta.util';
import { ModelType } from '../enums/model-type.enum';
import {
  ComparableModelResponseDto,
  ComparisonHistoryItemResponseDto,
  ComparisonResultResponseDto,
  ComparisonSessionResponseDto,
  ComparisonSummaryInsightsDto,
} from '../dto/model-comparisons-response.dto';

interface AuthenticatedWorkspaceContext {
  user: {
    id: string;
    email: string;
  };
  workspaceId?: string;
  workspaceType?: OwnerType;
  headers?: Record<string, unknown>;
  ip?: string;
  socket?: Record<string, unknown>;
}

interface ComparisonSettingsInput {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
  jsonMode?: boolean;
}

interface RunComparisonInput {
  modelIds: string[];
  prompt: string;
  requestBody?: Record<string, unknown>;
  settings?: ComparisonSettingsInput;
  title?: string;
}

@Injectable()
export class ModelComparisonsService {
  constructor(
    @InjectRepository(Model)
    private readonly modelRepository: Repository<Model>,
    @InjectRepository(ModelLog)
    private readonly modelLogRepository: Repository<ModelLog>,
    @InjectRepository(ModelComparisonSession)
    private readonly sessionRepository: Repository<ModelComparisonSession>,
    @InjectRepository(ModelComparisonResult)
    private readonly resultRepository: Repository<ModelComparisonResult>,
    private readonly inferenceClient: InferenceClient,
    private readonly organizationsService: OrganizationsService,
  ) {}

  async listComparableModels(query?: {
    q?: string;
    provider?: string;
    category?: string;
    modality?: string;
    status?: string;
    sort?: 'popularity' | 'price_asc' | 'price_desc' | 'rating';
  }): Promise<ComparableModelResponseDto[]> {
    const models = await this.modelRepository.find({
      where: { isPublic: true },
      relations: ['organization', 'user', 'versions', 'versions.deployments'],
      order: { createdAt: 'DESC' },
    });

    const popularityRows = await this.modelLogRepository
      .createQueryBuilder('log')
      .select('log.model_id', 'modelId')
      .addSelect('COUNT(log.id)', 'requestCount')
      .groupBy('log.model_id')
      .getRawMany<{ modelId: string; requestCount: string }>();

    const popularityMap = new Map(
      popularityRows.map((row) => [row.modelId, Number(row.requestCount) || 0]),
    );

    const normalizedQuery = query?.q?.trim().toLowerCase();
    const normalizedProvider = query?.provider?.trim().toLowerCase();
    const normalizedCategory = query?.category?.trim().toLowerCase();
    const normalizedModality = query?.modality?.trim().toLowerCase();
    const normalizedStatus = query?.status?.trim().toUpperCase();

    const comparable: ComparableModelResponseDto[] = models
      .map((model): ComparableModelResponseDto => {
        const providerName = this.resolveProviderName(model);
        const status: ComparableModelResponseDto['status'] =
          this.hasRunningDeployment(model) ? 'RUNNING' : 'INACTIVE';
        const versionLabel = this.resolveRunningVersionLabel(model);
        return {
          id: model.id,
          name: model.name,
          providerName,
          category: model.type ?? 'UNKNOWN',
          taskType: model.taskType ?? 'OTHER',
          framework: model.framework ?? 'CUSTOM',
          modality: this.deriveModality(model),
          priceCredits: this.toNumber(model.costPerRequest),
          status,
          popularity: popularityMap.get(model.id) ?? 0,
          averageRating: this.toNumber(model.averageRating),
          reviewCount: Number(model.reviewCount ?? 0),
          versionLabel,
        };
      })
      .filter((model) => {
        if (
          normalizedQuery &&
          ![
            model.name.toLowerCase(),
            model.providerName.toLowerCase(),
            model.category.toLowerCase(),
            model.taskType.toLowerCase(),
            model.framework.toLowerCase(),
          ].some((value) => value.includes(normalizedQuery))
        ) {
          return false;
        }

        if (
          normalizedProvider &&
          !model.providerName.toLowerCase().includes(normalizedProvider)
        ) {
          return false;
        }

        if (
          normalizedCategory &&
          model.category.toLowerCase() !== normalizedCategory
        ) {
          return false;
        }

        if (
          normalizedModality &&
          model.modality.toLowerCase() !== normalizedModality
        ) {
          return false;
        }

        if (normalizedStatus && model.status !== normalizedStatus) {
          return false;
        }

        return true;
      });

    comparable.sort((left, right) => {
      switch (query?.sort) {
        case 'price_asc':
          return left.priceCredits - right.priceCredits;
        case 'price_desc':
          return right.priceCredits - left.priceCredits;
        case 'rating':
          return (
            right.averageRating - left.averageRating ||
            right.popularity - left.popularity
          );
        case 'popularity':
        default:
          return (
            right.popularity - left.popularity ||
            left.priceCredits - right.priceCredits
          );
      }
    });

    return comparable;
  }

  async runComparison(
    input: RunComparisonInput,
    req: AuthenticatedWorkspaceContext,
  ): Promise<ComparisonSessionResponseDto> {
    const workspace = await this.resolveWorkspace(req);
    const modelIds = Array.from(new Set(input.modelIds));

    if (modelIds.length < 2 || modelIds.length > 5) {
      throw new BadRequestException('Choose between 2 and 5 models to compare');
    }
    if (!input.prompt?.trim()) {
      throw new BadRequestException('Prompt is required');
    }

    const models = await this.modelRepository.find({
      where: modelIds.map((id) => ({ id, isPublic: true })),
      relations: ['organization', 'user', 'versions', 'versions.deployments'],
    });

    if (models.length !== modelIds.length) {
      throw new BadRequestException(
        'One or more selected models are unavailable for comparison',
      );
    }

    const payload = this.buildRequestPayload(
      input.prompt,
      input.requestBody,
      input.settings,
    );
    const session = await this.sessionRepository.save(
      this.sessionRepository.create({
        user: { id: req.user.id },
        organization: workspace.organization
          ? { id: workspace.organization.id }
          : null,
        workspaceType: workspace.workspaceType,
        title: input.title?.trim() || this.buildDefaultTitle(input.prompt),
        inputPrompt: input.prompt.trim(),
        requestPayload: payload,
        settings:
          (input.settings as Record<string, unknown> | undefined) ?? null,
        summaryInsights: null,
        status: 'RUNNING',
        modelCount: models.length,
        rerunOfSessionId: null,
      }),
    );

    const actor = this.buildActor(req, workspace.workspaceType);
    const clientMeta = extractClientMeta(
      req as unknown as Record<string, unknown> & {
        headers?: Record<string, unknown>;
        ip?: string;
        socket?: Record<string, unknown>;
      },
    );

    const resultEntities: ModelComparisonResult[] = [];
    for (const modelId of modelIds) {
      const model = models.find((entry) => entry.id === modelId);
      if (!model) {
        continue;
      }

      const result = await this.executeSingleComparison(
        session,
        model,
        payload,
        actor,
        clientMeta,
      );
      resultEntities.push(result);
    }

    const rankedResults = this.rankResults(resultEntities);
    const summaryInsights = this.buildSummaryInsights(rankedResults);

    await this.resultRepository.save(rankedResults);
    session.status = 'COMPLETED';
    session.summaryInsights = this.serializeSummaryInsights(summaryInsights);
    await this.sessionRepository.save(session);

    return this.getComparisonDetails(session.id, req);
  }

  async listHistory(
    req: AuthenticatedWorkspaceContext,
  ): Promise<ComparisonHistoryItemResponseDto[]> {
    const workspace = await this.resolveWorkspace(req);
    const sessions = await this.sessionRepository.find(
      workspace.organization
        ? {
            where: { organization: { id: workspace.organization.id } },
            relations: ['results'],
            order: { createdAt: 'DESC' },
            take: 30,
          }
        : {
            where: { user: { id: req.user.id }, organization: IsNull() },
            relations: ['results'],
            order: { createdAt: 'DESC' },
            take: 30,
          },
    );

    return sessions.map((session) => ({
      id: session.id,
      title: session.title,
      inputPrompt: session.inputPrompt,
      modelCount: session.modelCount,
      status: session.status,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      summaryInsights: this.mapSummaryInsights(session.summaryInsights),
      resultsCount: session.results?.length ?? 0,
    }));
  }

  async getComparisonDetails(
    sessionId: string,
    req: AuthenticatedWorkspaceContext,
  ): Promise<ComparisonSessionResponseDto> {
    const session = await this.assertSessionAccess(sessionId, req);
    const sortedResults = [...(session.results ?? [])].sort((left, right) => {
      if ((left.resultRank ?? 999) !== (right.resultRank ?? 999)) {
        return (left.resultRank ?? 999) - (right.resultRank ?? 999);
      }
      return left.modelName.localeCompare(right.modelName);
    });

    return {
      id: session.id,
      title: session.title,
      inputPrompt: session.inputPrompt,
      requestPayload: session.requestPayload,
      settings: session.settings,
      status: session.status,
      modelCount: session.modelCount,
      summaryInsights: this.mapSummaryInsights(session.summaryInsights),
      rerunOfSessionId: session.rerunOfSessionId,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      results: sortedResults.map((result) => this.serializeResult(result)),
    };
  }

  async updateComparison(
    sessionId: string,
    title: string,
    req: AuthenticatedWorkspaceContext,
  ): Promise<ComparisonSessionResponseDto> {
    const session = await this.assertSessionAccess(sessionId, req);
    await this.sessionRepository.update(session.id, {
      title: title.trim() || session.title,
    });
    return this.getComparisonDetails(session.id, req);
  }

  async rerunComparison(
    sessionId: string,
    req: AuthenticatedWorkspaceContext,
  ): Promise<ComparisonSessionResponseDto> {
    const session = await this.assertSessionAccess(sessionId, req);
    const resultModelIds = (session.results ?? [])
      .map((result) => result.model?.id)
      .filter((value): value is string => Boolean(value));

    return this.runComparison(
      {
        modelIds: resultModelIds,
        prompt: session.inputPrompt,
        requestBody: session.requestPayload,
        settings:
          (session.settings as ComparisonSettingsInput | undefined) ?? {},
        title: session.title ? `${session.title} (Rerun)` : 'Comparison Rerun',
      },
      req,
    ).then(async (rerun) => {
      await this.sessionRepository.update(rerun.id, {
        rerunOfSessionId: session.id,
      });
      return this.getComparisonDetails(rerun.id, req);
    });
  }

  async deleteComparison(
    sessionId: string,
    req: AuthenticatedWorkspaceContext,
  ): Promise<{ success: boolean }> {
    const session = await this.assertSessionAccess(sessionId, req);
    await this.sessionRepository.delete(session.id);
    return { success: true };
  }

  private async executeSingleComparison(
    session: ModelComparisonSession,
    model: Model,
    payload: Record<string, unknown>,
    actor: PredictionActor,
    clientMeta: ReturnType<typeof extractClientMeta>,
  ): Promise<ModelComparisonResult> {
    const versionLabel = this.resolveRunningVersionLabel(model);
    const providerName = this.resolveProviderName(model);
    const modality = this.deriveModality(model);

    try {
      const deployment = await this.inferenceClient.resolveDeploymentUrl(model);
      const result = await this.inferenceClient.runInference(
        model,
        deployment.url,
        deployment.deploymentId,
        payload,
        actor,
        clientMeta,
      );

      const tokens = this.extractTokens(payload, result.output);
      const outputText = this.normalizeOutputText(result.output);
      const qualityScore = this.computeQualityScore({
        success: result.status === InferenceStatus.SUCCESS,
        latencyMs: result.responseTimeMs,
        outputText,
      });
      const valueScore = this.computeValueScore(
        qualityScore,
        this.toNumber(result.cost),
      );

      return this.resultRepository.create({
        session: { id: session.id },
        model: { id: model.id },
        modelName: model.name,
        providerName,
        modelType: model.type ?? null,
        taskType: model.taskType ?? null,
        framework: model.framework ?? null,
        modality,
        modelVersion: versionLabel,
        responseOutput: outputText,
        responseJson: this.isRecord(result.output) ? result.output : null,
        latencyMs: result.responseTimeMs,
        costCredits: this.toNumber(result.cost),
        inputTokens: tokens.inputTokens,
        outputTokens: tokens.outputTokens,
        totalTokens: tokens.totalTokens,
        status: result.status,
        statusCode: result.statusCode,
        errorMessage: result.errorMessage,
        qualityScore,
        valueScore,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Comparison request failed';

      return this.resultRepository.create({
        session: { id: session.id },
        model: { id: model.id },
        modelName: model.name,
        providerName,
        modelType: model.type ?? null,
        taskType: model.taskType ?? null,
        framework: model.framework ?? null,
        modality,
        modelVersion: versionLabel,
        responseOutput: null,
        responseJson: null,
        latencyMs: null,
        costCredits: 0,
        inputTokens: this.estimatePromptTokens(payload),
        outputTokens: 0,
        totalTokens: this.estimatePromptTokens(payload),
        status: InferenceStatus.FAILED,
        statusCode: 500,
        errorMessage: message.slice(0, 1000),
        qualityScore: 0,
        valueScore: 0,
      });
    }
  }

  private rankResults(results: ModelComparisonResult[]) {
    const ranked = [...results].sort((left, right) => {
      const rightValue = this.toNumber(right.valueScore);
      const leftValue = this.toNumber(left.valueScore);
      if (rightValue !== leftValue) {
        return rightValue - leftValue;
      }

      const leftSuccess = left.status === InferenceStatus.SUCCESS ? 1 : 0;
      const rightSuccess = right.status === InferenceStatus.SUCCESS ? 1 : 0;
      if (rightSuccess !== leftSuccess) {
        return rightSuccess - leftSuccess;
      }

      return this.toNumber(left.latencyMs) - this.toNumber(right.latencyMs);
    });

    return ranked.map((result, index) => {
      result.resultRank = index + 1;
      return result;
    });
  }

  private buildSummaryInsights(
    results: ModelComparisonResult[],
  ): ComparisonSummaryInsightsDto {
    const successful = results.filter(
      (result) => result.status === InferenceStatus.SUCCESS,
    );
    const ranked = [...results].sort(
      (left, right) => (left.resultRank ?? 999) - (right.resultRank ?? 999),
    );

    const fastest = successful.reduce<ModelComparisonResult | null>(
      (best, current) => {
        if (!best) return current;
        return this.toNumber(current.latencyMs) < this.toNumber(best.latencyMs)
          ? current
          : best;
      },
      null,
    );

    const cheapest = successful.reduce<ModelComparisonResult | null>(
      (best, current) => {
        if (!best) return current;
        return this.toNumber(current.costCredits) <
          this.toNumber(best.costCredits)
          ? current
          : best;
      },
      null,
    );

    const lowestError = [...results].sort((left, right) => {
      const leftPenalty = left.status === InferenceStatus.SUCCESS ? 0 : 1;
      const rightPenalty = right.status === InferenceStatus.SUCCESS ? 0 : 1;
      if (leftPenalty !== rightPenalty) {
        return leftPenalty - rightPenalty;
      }
      return this.toNumber(left.latencyMs) - this.toNumber(right.latencyMs);
    })[0];

    return {
      fastestModelId: fastest?.model?.id ?? null,
      fastestModelName: fastest?.modelName ?? null,
      cheapestModelId: cheapest?.model?.id ?? null,
      cheapestModelName: cheapest?.modelName ?? null,
      bestValueModelId: ranked[0]?.model?.id ?? null,
      bestValueModelName: ranked[0]?.modelName ?? null,
      lowestErrorModelId: lowestError?.model?.id ?? null,
      lowestErrorModelName: lowestError?.modelName ?? null,
      recommendedModelId: ranked[0]?.model?.id ?? null,
      recommendedModelName: ranked[0]?.modelName ?? null,
    };
  }

  private serializeResult(
    result: ModelComparisonResult,
  ): ComparisonResultResponseDto {
    return {
      id: result.id,
      modelId: result.model?.id ?? null,
      modelName: result.modelName,
      providerName: result.providerName,
      modelType: result.modelType,
      taskType: result.taskType,
      framework: result.framework,
      modality: result.modality,
      modelVersion: result.modelVersion,
      responseOutput: result.responseOutput,
      responseJson: result.responseJson,
      latencyMs: result.latencyMs,
      costCredits: this.toNumber(result.costCredits),
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      totalTokens: result.totalTokens,
      status: result.status,
      statusCode: result.statusCode,
      errorMessage: result.errorMessage,
      qualityScore: result.qualityScore
        ? this.toNumber(result.qualityScore)
        : null,
      valueScore: result.valueScore ? this.toNumber(result.valueScore) : null,
      resultRank: result.resultRank,
      createdAt: result.createdAt,
    };
  }

  private serializeSummaryInsights(
    summaryInsights: ComparisonSummaryInsightsDto,
  ): Record<string, unknown> {
    return {
      fastestModelId: summaryInsights.fastestModelId,
      fastestModelName: summaryInsights.fastestModelName,
      cheapestModelId: summaryInsights.cheapestModelId,
      cheapestModelName: summaryInsights.cheapestModelName,
      bestValueModelId: summaryInsights.bestValueModelId,
      bestValueModelName: summaryInsights.bestValueModelName,
      lowestErrorModelId: summaryInsights.lowestErrorModelId,
      lowestErrorModelName: summaryInsights.lowestErrorModelName,
      recommendedModelId: summaryInsights.recommendedModelId,
      recommendedModelName: summaryInsights.recommendedModelName,
    };
  }

  private mapSummaryInsights(
    summaryInsights: Record<string, unknown> | null,
  ): ComparisonSummaryInsightsDto | null {
    if (!summaryInsights) {
      return null;
    }

    return {
      fastestModelId: this.asNullableString(summaryInsights.fastestModelId),
      fastestModelName: this.asNullableString(summaryInsights.fastestModelName),
      cheapestModelId: this.asNullableString(summaryInsights.cheapestModelId),
      cheapestModelName: this.asNullableString(
        summaryInsights.cheapestModelName,
      ),
      bestValueModelId: this.asNullableString(summaryInsights.bestValueModelId),
      bestValueModelName: this.asNullableString(
        summaryInsights.bestValueModelName,
      ),
      lowestErrorModelId: this.asNullableString(
        summaryInsights.lowestErrorModelId,
      ),
      lowestErrorModelName: this.asNullableString(
        summaryInsights.lowestErrorModelName,
      ),
      recommendedModelId: this.asNullableString(
        summaryInsights.recommendedModelId,
      ),
      recommendedModelName: this.asNullableString(
        summaryInsights.recommendedModelName,
      ),
    };
  }

  private asNullableString(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
  }

  private buildRequestPayload(
    prompt: string,
    requestBody?: Record<string, unknown>,
    settings?: ComparisonSettingsInput,
  ) {
    const basePayload = {
      prompt,
      input: prompt,
      text: prompt,
      messages: [{ role: 'user', content: prompt }],
      temperature: settings?.temperature ?? 0.7,
      max_tokens: settings?.maxTokens ?? 512,
      top_p: settings?.topP ?? 1,
      stream: settings?.stream ?? false,
    } as Record<string, unknown>;

    if (settings?.jsonMode) {
      basePayload.response_format = { type: 'json_object' };
    }

    return {
      ...basePayload,
      ...(requestBody ?? {}),
    };
  }

  private normalizeOutputText(output: unknown) {
    if (output == null) {
      return null;
    }

    if (typeof output === 'string') {
      return output;
    }

    if (typeof output === 'object') {
      const maybeObject = output as Record<string, unknown>;
      const directText =
        this.extractNestedString(maybeObject, [
          ['output'],
          ['text'],
          ['response'],
          ['message'],
          ['choices', '0', 'message', 'content'],
          ['choices', '0', 'text'],
        ]) ?? null;

      if (directText) {
        return directText;
      }
    }

    try {
      return JSON.stringify(output, null, 2);
    } catch {
      return null;
    }
  }

  private extractTokens(payload: Record<string, unknown>, output: unknown) {
    const defaultInputTokens = this.estimatePromptTokens(payload);
    const usage =
      output && typeof output === 'object'
        ? ((output as Record<string, unknown>).usage as
            | Record<string, unknown>
            | undefined)
        : undefined;

    const inputTokens = this.toInteger(
      usage?.prompt_tokens ?? usage?.input_tokens ?? defaultInputTokens,
    );
    const outputTokens = this.toInteger(
      usage?.completion_tokens ??
        usage?.output_tokens ??
        this.estimateOutputTokens(output),
    );

    return {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
    };
  }

  private estimatePromptTokens(payload: Record<string, unknown>) {
    const prompt =
      typeof payload.prompt === 'string'
        ? payload.prompt
        : JSON.stringify(payload);
    return this.toInteger(Math.ceil(prompt.length / 4));
  }

  private estimateOutputTokens(output: unknown) {
    const text = this.normalizeOutputText(output) ?? '';
    return this.toInteger(Math.ceil(text.length / 4));
  }

  private computeQualityScore(input: {
    success: boolean;
    latencyMs: number | null;
    outputText: string | null;
  }) {
    if (!input.success) {
      return 0;
    }

    const lengthFactor = Math.min(
      (input.outputText?.trim().length ?? 0) / 18,
      30,
    );
    const latencyPenalty = Math.min((input.latencyMs ?? 0) / 150, 22);
    return this.toFixedNumber(55 + lengthFactor - latencyPenalty);
  }

  private computeValueScore(qualityScore: number, costCredits: number) {
    if (costCredits <= 0) {
      return this.toFixedNumber(qualityScore + 15);
    }

    return this.toFixedNumber(qualityScore / Math.max(costCredits, 0.05));
  }

  private extractNestedString(
    object: Record<string, unknown>,
    paths: string[][],
  ): string | null {
    for (const path of paths) {
      let current: unknown = object;
      for (const segment of path) {
        if (Array.isArray(current)) {
          current = current[Number(segment)];
          continue;
        }
        if (current && typeof current === 'object') {
          current = (current as Record<string, unknown>)[segment];
          continue;
        }
        current = undefined;
        break;
      }
      if (typeof current === 'string' && current.trim()) {
        return current;
      }
    }
    return null;
  }

  private async resolveWorkspace(req: AuthenticatedWorkspaceContext) {
    const workspaceType = req.workspaceType ?? OwnerType.USER;
    if (workspaceType !== OwnerType.ORG || !req.workspaceId) {
      return {
        workspaceType: OwnerType.USER,
        organization: null,
      };
    }

    const organization = await this.organizationsService.orgRepository.findOne({
      where: { id: req.workspaceId },
    });
    if (!organization) {
      throw new NotFoundException('Workspace organization not found');
    }
    const role = await this.organizationsService.getMemberRole(
      organization.id,
      req.user.id,
    );
    if (!role) {
      throw new ForbiddenException(
        'You are not a member of this organization workspace',
      );
    }
    if (
      organization.type !== OrgType.CONSUMER &&
      organization.type !== OrgType.HYBRID
    ) {
      throw new ForbiddenException(
        'Model comparison is available only in consumer-capable workspaces',
      );
    }
    return {
      workspaceType: OwnerType.ORG,
      organization,
    };
  }

  private buildActor(
    req: AuthenticatedWorkspaceContext,
    workspaceType: OwnerType,
  ): PredictionActor {
    return {
      userId: req.user.id,
      email: req.user.email,
      workspaceId: req.workspaceId ?? req.user.id,
      workspaceType,
    };
  }

  private async assertSessionAccess(
    sessionId: string,
    req: AuthenticatedWorkspaceContext,
  ) {
    const workspace = await this.resolveWorkspace(req);
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['user', 'organization', 'results', 'results.model'],
    });

    if (!session) {
      throw new NotFoundException('Comparison session not found');
    }

    if (workspace.organization) {
      if (session.organization?.id !== workspace.organization.id) {
        throw new ForbiddenException(
          'You do not have access to this comparison session',
        );
      }
      return session;
    }

    if (session.user.id !== req.user.id || session.organization) {
      throw new ForbiddenException(
        'You do not have access to this comparison session',
      );
    }

    return session;
  }

  private resolveProviderName(model: Model) {
    return (
      model.organization?.name ?? model.user?.email ?? 'Marketplace Provider'
    );
  }

  private deriveModality(model: Model) {
    if (model.type === ModelType.VISION || model.type === ModelType.DIFFUSION) {
      return 'image';
    }
    if (model.type === ModelType.AUDIO) {
      return 'audio';
    }
    return 'text';
  }

  private hasRunningDeployment(model: Model) {
    return (model.versions ?? []).some((version) =>
      (version.deployments ?? []).some(
        (deployment) => deployment.status === DeploymentStatus.RUNNING,
      ),
    );
  }

  private resolveRunningVersionLabel(model: Model) {
    const runningVersion = (model.versions ?? []).find((version) =>
      (version.deployments ?? []).some(
        (deployment) => deployment.status === DeploymentStatus.RUNNING,
      ),
    );

    if (runningVersion) {
      return `v${runningVersion.versionNumber}`;
    }

    const lastVersion = [...(model.versions ?? [])].sort(
      (left, right) => right.versionNumber - left.versionNumber,
    )[0];

    return lastVersion ? `v${lastVersion.versionNumber}` : null;
  }

  private buildDefaultTitle(prompt: string) {
    const trimmed = prompt.trim();
    const preview =
      trimmed.length > 38 ? `${trimmed.slice(0, 35)}...` : trimmed;
    return `Comparison - ${preview}`;
  }

  private toNumber(value: unknown) {
    const numeric = typeof value === 'number' ? value : Number(value ?? 0);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  private toInteger(value: unknown) {
    return Math.max(0, Math.round(this.toNumber(value)));
  }

  private toFixedNumber(value: number) {
    return Math.max(0, Number(value.toFixed(2)));
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }
}
