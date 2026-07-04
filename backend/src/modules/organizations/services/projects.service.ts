import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Project } from '../entities/project.entity';
import { OrgApiKey } from '../entities/org-api-key.entity';
import { ModelLog } from '../../models/entities/model-log.entity';
import { Model } from '../../models/entities/model.entity';
import { OrgRole } from '../../../shared/enums/org-role.enum';

/**
 * Service managing project workspaces and API key lifecycle within organizations.
 * API keys are hashed server-side — the raw value is returned once and never stored.
 */
@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(OrgApiKey)
    private readonly apiKeyRepository: Repository<OrgApiKey>,
    @InjectRepository(ModelLog)
    private readonly modelLogRepository: Repository<ModelLog>,
    @InjectRepository(Model)
    private readonly modelRepository: Repository<Model>,
  ) {}

  // ─── Projects ────────────────────────────────────────────────────────────

  /**
   * Creates a new project under the given organization.
   *
   * @param orgId - UUID of the parent organization.
   * @param name - Display name of the project.
   * @param description - Optional description.
   * @returns The newly created Project entity.
   * @throws {BadRequestException} If name is missing.
   */
  async createProject(
    orgId: string,
    name: string,
    description?: string,
  ): Promise<Project> {
    if (!name?.trim()) {
      throw new BadRequestException('Project name is required');
    }
    const project = this.projectRepository.create({
      orgId,
      name: name.trim(),
      description: description?.trim() ?? null,
      isActive: true,
    });
    return this.projectRepository.save(project);
  }

  /**
   * Lists all active projects for an organization.
   *
   * @param orgId - UUID of the organization.
   * @returns Array of active Project entities.
   */
  async listProjects(orgId: string): Promise<Project[]> {
    return this.projectRepository.find({
      where: { orgId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Retrieves a single project, verifying it belongs to the given org.
   *
   * @param orgId - UUID of the organization.
   * @param projectId - UUID of the project.
   * @returns The Project entity.
   * @throws {NotFoundException} If not found.
   */
  async getProject(orgId: string, projectId: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId, orgId, isActive: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  /**
   * Soft-deletes a project and revokes all its associated API keys.
   *
   * @param orgId - UUID of the organization.
   * @param projectId - UUID of the project to delete.
   * @returns Confirmation message.
   * @throws {NotFoundException} If project not found.
   */
  async deleteProject(
    orgId: string,
    projectId: string,
  ): Promise<{ message: string }> {
    const project = await this.getProject(orgId, projectId);
    await this.apiKeyRepository.update(
      { projectId: project.id, orgId },
      { isActive: false },
    );
    await this.projectRepository.update(project.id, { isActive: false });
    return { message: 'Project deleted successfully' };
  }

  // ─── API Keys ─────────────────────────────────────────────────────────────

  /**
   * Generates a new API key for a project.
   * The raw key is returned ONCE — only the SHA-256 hash and masked prefix are stored.
   *
   * @param orgId - UUID of the organization.
   * @param projectId - UUID of the project.
   * @param label - Human-readable label for this key.
   * @returns The OrgApiKey entity plus the one-time rawKey string.
   * @throws {NotFoundException} If the project does not exist.
   * @throws {BadRequestException} If label is missing.
   */
  async createApiKey(
    orgId: string,
    projectId: string,
    label: string,
    modelId: string,
  ): Promise<OrgApiKey & { rawKey: string }> {
    await this.getProject(orgId, projectId);
    if (!label?.trim()) {
      throw new BadRequestException('API key label is required');
    }
    if (!modelId?.trim()) {
      throw new BadRequestException(
        'A model must be selected for this API key',
      );
    }

    const model = await this.modelRepository.findOne({
      where: { id: modelId.trim() },
      relations: ['organization', 'user'],
    });

    if (!model) {
      throw new NotFoundException('Selected model not found');
    }

    const isSameOrgModel = model.organization?.id === orgId;
    if (!model.isPublic && !isSameOrgModel) {
      throw new ForbiddenException(
        'Project API keys can only be created for public marketplace models or models owned by the same organization',
      );
    }

    const rawKey = `sk_live_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = `${rawKey.slice(0, 14)}...${rawKey.slice(-4)}`;

    const apiKey = this.apiKeyRepository.create({
      projectId,
      orgId,
      model,
      keyHash,
      keyPrefix,
      label: label.trim(),
      isActive: true,
      lastUsedAt: null,
    });

    const saved = await this.apiKeyRepository.save(apiKey);
    return { ...saved, rawKey };
  }

  /**
   * Lists all active API keys for a specific project.
   * keyHash is never returned — only the masked prefix is exposed.
   *
   * @param orgId - UUID of the organization.
   * @param projectId - UUID of the project.
   * @returns Array of OrgApiKey entities.
   * @throws {NotFoundException} If the project does not exist.
   */
  async listApiKeys(orgId: string, projectId: string): Promise<OrgApiKey[]> {
    await this.getProject(orgId, projectId);
    return this.apiKeyRepository.find({
      where: { projectId, orgId, isActive: true },
      relations: ['model'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Revokes an API key by setting isActive to false.
   *
   * @param orgId - UUID of the organization.
   * @param projectId - UUID of the project.
   * @param keyId - UUID of the API key.
   * @returns Confirmation message.
   * @throws {NotFoundException} If key not found.
   * @throws {ForbiddenException} If key already revoked.
   */
  async revokeApiKey(
    orgId: string,
    projectId: string,
    keyId: string,
  ): Promise<{ message: string }> {
    const key = await this.apiKeyRepository.findOne({
      where: { id: keyId, projectId, orgId },
    });
    if (!key) throw new NotFoundException('API key not found');
    if (!key.isActive)
      throw new ForbiddenException('API key is already revoked');
    await this.apiKeyRepository.update(keyId, { isActive: false });
    return { message: 'API key revoked successfully' };
  }

  /**
   * Updates the rate limit and daily spend budget quota for a project API key.
   *
   * @param orgId - UUID of the organization.
   * @param projectId - UUID of the project.
   * @param keyId - UUID of the API key.
   * @param updates - Partial quota fields.
   * @throws {NotFoundException} If key not found.
   */
  async updateApiKeyQuota(
    orgId: string,
    projectId: string,
    keyId: string,
    updates: {
      maxRequestsPerMinute?: number | null;
      maxDailySpendCredits?: number | null;
    },
  ): Promise<OrgApiKey> {
    const key = await this.apiKeyRepository.findOne({
      where: { id: keyId, projectId, orgId },
    });
    if (!key) throw new NotFoundException('API key not found');

    if (updates.maxRequestsPerMinute !== undefined) {
      key.maxRequestsPerMinute = updates.maxRequestsPerMinute;
    }
    if (updates.maxDailySpendCredits !== undefined) {
      key.maxDailySpendCredits = updates.maxDailySpendCredits;
    }

    return this.apiKeyRepository.save(key);
  }

  /**
   * Resolves an organization UUID from a raw API key string.
   * Used by ApiKeyGuard to authenticate prediction API requests.
   * Updates lastUsedAt on successful resolution.
   *
   * @param rawKey - The full raw API key from the Authorization header.
   * @returns The resolved OrgApiKey entity including orgId, or null.
   */
  async resolveOrgFromApiKey(rawKey: string): Promise<OrgApiKey | null> {
    if (!rawKey?.startsWith('sk_live_')) return null;

    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const apiKey = await this.apiKeyRepository.findOne({
      where: { keyHash, isActive: true },
    });

    if (!apiKey) return null;

    // Fire-and-forget last used update
    this.apiKeyRepository
      .update(apiKey.id, { lastUsedAt: new Date() })
      .catch(() => undefined);

    return apiKey;
  }

  /**
   * Builds API key usage analytics for a project.
   */
  async getProjectApiKeyUsage(
    orgId: string,
    projectId: string,
  ): Promise<{
    totals: {
      requests: number;
      successfulRequests: number;
      failedRequests: number;
      creditsCharged: number;
    };
    apiKeys: Array<{
      id: string;
      label: string;
      keyPrefix: string;
      requests: number;
      successfulRequests: number;
      failedRequests: number;
      creditsCharged: number;
      lastUsedAt: Date | null;
    }>;
    models: Array<{
      id: string;
      name: string;
      type: string;
      framework: string;
      costPerRequest: number;
      requests: number;
      successfulRequests: number;
      failedRequests: number;
      creditsCharged: number;
      averageLatencyMs: number;
    }>;
  }> {
    await this.getProject(orgId, projectId);

    const keys = await this.apiKeyRepository.find({
      where: { orgId, projectId },
      order: { createdAt: 'DESC' },
    });

    const logs = await this.modelLogRepository.find({
      where: { orgId, projectId },
      relations: ['model', 'orgApiKey'],
      order: { createdAt: 'DESC' },
    });

    const apiKeyStats = new Map<
      string,
      {
        id: string;
        label: string;
        keyPrefix: string;
        requests: number;
        successfulRequests: number;
        failedRequests: number;
        creditsCharged: number;
        lastUsedAt: Date | null;
      }
    >();

    keys.forEach((key) => {
      apiKeyStats.set(key.id, {
        id: key.id,
        label: key.label,
        keyPrefix: key.keyPrefix,
        requests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        creditsCharged: 0,
        lastUsedAt: key.lastUsedAt,
      });
    });

    const modelStats = new Map<
      string,
      {
        id: string;
        name: string;
        type: string;
        framework: string;
        costPerRequest: number;
        requests: number;
        successfulRequests: number;
        failedRequests: number;
        creditsCharged: number;
        averageLatencyMs: number;
        totalLatencyMs: number;
      }
    >();

    let successfulRequests = 0;
    let failedRequests = 0;
    let creditsCharged = 0;

    logs.forEach((log) => {
      const cost = Number(log.creditsCharged ?? 0);
      creditsCharged += cost;

      if (log.status === 'SUCCESS') successfulRequests += 1;
      if (log.status === 'FAILED') failedRequests += 1;

      const keyId = log.orgApiKey?.id;
      if (keyId && apiKeyStats.has(keyId)) {
        const stat = apiKeyStats.get(keyId)!;
        stat.requests += 1;
        stat.creditsCharged += cost;
        if (log.status === 'SUCCESS') stat.successfulRequests += 1;
        if (log.status === 'FAILED') stat.failedRequests += 1;
        if (!stat.lastUsedAt || log.createdAt > stat.lastUsedAt) {
          stat.lastUsedAt = log.createdAt;
        }
      }

      if (log.model) {
        const current = modelStats.get(log.model.id) ?? {
          id: log.model.id,
          name: log.model.name,
          type: log.model.type,
          framework: log.model.framework,
          costPerRequest: Number(log.model.costPerRequest ?? 0),
          requests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          creditsCharged: 0,
          averageLatencyMs: 0,
          totalLatencyMs: 0,
        };
        current.requests += 1;
        if (log.status === 'SUCCESS') current.successfulRequests += 1;
        if (log.status === 'FAILED') current.failedRequests += 1;
        current.creditsCharged += cost;
        current.totalLatencyMs += Number(log.responseTimeMs ?? 0);
        modelStats.set(log.model.id, current);
      }
    });

    const models = [...modelStats.values()]
      .map((model) => ({
        ...model,
        averageLatencyMs: model.requests
          ? Math.round(model.totalLatencyMs / model.requests)
          : 0,
      }))
      .sort((a, b) => b.creditsCharged - a.creditsCharged)
      .map(({ totalLatencyMs, ...model }) => {
        void totalLatencyMs;
        return model;
      });

    return {
      totals: {
        requests: logs.length,
        successfulRequests,
        failedRequests,
        creditsCharged,
      },
      apiKeys: [...apiKeyStats.values()].sort(
        (a, b) => b.creditsCharged - a.creditsCharged,
      ),
      models,
    };
  }

  /**
   * Builds organization-wide consumer usage analytics from persisted model logs.
   *
   * @param orgId - UUID of the organization.
   * @param role - Requester's active organization role.
   * @returns Aggregated usage grouped by project, API key, model, day, and month.
   */
  async getOrganizationUsage(
    orgId: string,
    role: OrgRole,
  ): Promise<{
    scope: 'FULL' | 'OPERATIONAL' | 'LIMITED';
    totals: {
      requests: number;
      successfulRequests: number;
      failedRequests: number;
      creditsCharged: number;
      errorRate: number;
      lastUsedAt: Date | null;
    };
    projects: Array<{
      id: string;
      name: string;
      requests: number;
      successfulRequests: number;
      failedRequests: number;
      creditsCharged: number;
      errorRate: number;
      lastUsedAt: Date | null;
    }>;
    apiKeys: Array<{
      id: string;
      label: string;
      keyPrefix: string;
      projectId: string;
      projectName: string;
      requests: number;
      successfulRequests: number;
      failedRequests: number;
      creditsCharged: number;
      errorRate: number;
      lastUsedAt: Date | null;
    }>;
    models: Array<{
      id: string;
      name: string;
      type: string;
      framework: string;
      requests: number;
      successfulRequests: number;
      failedRequests: number;
      creditsCharged: number;
      errorRate: number;
      averageLatencyMs: number;
      lastUsedAt: Date | null;
    }>;
    daily: Array<{
      date: string;
      requests: number;
      creditsCharged: number;
      failedRequests: number;
    }>;
    monthly: Array<{
      month: string;
      requests: number;
      creditsCharged: number;
      failedRequests: number;
    }>;
  }> {
    const projects = await this.projectRepository.find({
      where: { orgId, isActive: true },
      order: { createdAt: 'DESC' },
    });
    const projectNames = new Map(
      projects.map((project) => [project.id, project.name]),
    );

    const keys = await this.apiKeyRepository.find({
      where: { orgId },
      order: { createdAt: 'DESC' },
    });

    const logs = await this.modelLogRepository.find({
      where: { orgId },
      relations: ['model', 'orgApiKey'],
      order: { createdAt: 'DESC' },
    });

    const canViewApiKeyBreakdown =
      role === OrgRole.OWNER || role === OrgRole.MAINTAINER;
    const scope =
      role === OrgRole.OWNER
        ? 'FULL'
        : role === OrgRole.MAINTAINER
          ? 'OPERATIONAL'
          : 'LIMITED';

    const projectsById = new Map<
      string,
      {
        id: string;
        name: string;
        requests: number;
        successfulRequests: number;
        failedRequests: number;
        creditsCharged: number;
        lastUsedAt: Date | null;
      }
    >();
    projects.forEach((project) => {
      projectsById.set(project.id, {
        id: project.id,
        name: project.name,
        requests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        creditsCharged: 0,
        lastUsedAt: null,
      });
    });

    const apiKeysById = new Map<
      string,
      {
        id: string;
        label: string;
        keyPrefix: string;
        projectId: string;
        projectName: string;
        requests: number;
        successfulRequests: number;
        failedRequests: number;
        creditsCharged: number;
        lastUsedAt: Date | null;
      }
    >();
    if (canViewApiKeyBreakdown) {
      keys.forEach((key) => {
        apiKeysById.set(key.id, {
          id: key.id,
          label: key.label,
          keyPrefix: key.keyPrefix,
          projectId: key.projectId,
          projectName: projectNames.get(key.projectId) ?? 'Unknown project',
          requests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          creditsCharged: 0,
          lastUsedAt: key.lastUsedAt,
        });
      });
    }

    const modelsById = new Map<
      string,
      {
        id: string;
        name: string;
        type: string;
        framework: string;
        requests: number;
        successfulRequests: number;
        failedRequests: number;
        creditsCharged: number;
        totalLatencyMs: number;
        lastUsedAt: Date | null;
      }
    >();
    const dailyByDate = new Map<
      string,
      {
        date: string;
        requests: number;
        creditsCharged: number;
        failedRequests: number;
      }
    >();
    const monthlyByDate = new Map<
      string,
      {
        month: string;
        requests: number;
        creditsCharged: number;
        failedRequests: number;
      }
    >();

    let successfulRequests = 0;
    let failedRequests = 0;
    let creditsCharged = 0;
    let lastUsedAt: Date | null = null;

    logs.forEach((log) => {
      const cost = Number(log.creditsCharged ?? 0);
      const isSuccess = log.status === 'SUCCESS';
      const isFailure = log.status === 'FAILED';
      creditsCharged += cost;
      if (isSuccess) successfulRequests += 1;
      if (isFailure) failedRequests += 1;
      if (!lastUsedAt || log.createdAt > lastUsedAt) {
        lastUsedAt = log.createdAt;
      }

      if (log.projectId) {
        const project = projectsById.get(log.projectId) ?? {
          id: log.projectId,
          name: projectNames.get(log.projectId) ?? 'Unknown project',
          requests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          creditsCharged: 0,
          lastUsedAt: null,
        };
        project.requests += 1;
        project.creditsCharged += cost;
        if (isSuccess) project.successfulRequests += 1;
        if (isFailure) project.failedRequests += 1;
        if (!project.lastUsedAt || log.createdAt > project.lastUsedAt) {
          project.lastUsedAt = log.createdAt;
        }
        projectsById.set(log.projectId, project);
      }

      const keyId = log.orgApiKey?.id;
      if (keyId && apiKeysById.has(keyId)) {
        const apiKey = apiKeysById.get(keyId)!;
        apiKey.requests += 1;
        apiKey.creditsCharged += cost;
        if (isSuccess) apiKey.successfulRequests += 1;
        if (isFailure) apiKey.failedRequests += 1;
        if (!apiKey.lastUsedAt || log.createdAt > apiKey.lastUsedAt) {
          apiKey.lastUsedAt = log.createdAt;
        }
      }

      if (log.model) {
        const model = modelsById.get(log.model.id) ?? {
          id: log.model.id,
          name: log.model.name,
          type: log.model.type,
          framework: log.model.framework,
          requests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          creditsCharged: 0,
          totalLatencyMs: 0,
          lastUsedAt: null,
        };
        model.requests += 1;
        model.creditsCharged += cost;
        model.totalLatencyMs += Number(log.responseTimeMs ?? 0);
        if (isSuccess) model.successfulRequests += 1;
        if (isFailure) model.failedRequests += 1;
        if (!model.lastUsedAt || log.createdAt > model.lastUsedAt) {
          model.lastUsedAt = log.createdAt;
        }
        modelsById.set(log.model.id, model);
      }

      const date = log.createdAt.toISOString().slice(0, 10);
      const day = dailyByDate.get(date) ?? {
        date,
        requests: 0,
        creditsCharged: 0,
        failedRequests: 0,
      };
      day.requests += 1;
      day.creditsCharged += cost;
      if (isFailure) day.failedRequests += 1;
      dailyByDate.set(date, day);

      const monthKey = log.createdAt.toISOString().slice(0, 7);
      const month = monthlyByDate.get(monthKey) ?? {
        month: monthKey,
        requests: 0,
        creditsCharged: 0,
        failedRequests: 0,
      };
      month.requests += 1;
      month.creditsCharged += cost;
      if (isFailure) month.failedRequests += 1;
      monthlyByDate.set(monthKey, month);
    });

    const withErrorRate = <
      T extends { requests: number; failedRequests: number },
    >(
      item: T,
    ) => ({
      ...item,
      errorRate: item.requests
        ? Math.round((item.failedRequests / item.requests) * 1000) / 10
        : 0,
    });

    const models = [...modelsById.values()]
      .map((model) =>
        withErrorRate({
          ...model,
          averageLatencyMs: model.requests
            ? Math.round(model.totalLatencyMs / model.requests)
            : 0,
        }),
      )
      .sort((a, b) => b.creditsCharged - a.creditsCharged)
      .map(({ totalLatencyMs, ...model }) => {
        void totalLatencyMs;
        return model;
      });

    return {
      scope,
      totals: withErrorRate({
        requests: logs.length,
        successfulRequests,
        failedRequests,
        creditsCharged,
        lastUsedAt,
      }),
      projects: [...projectsById.values()]
        .map(withErrorRate)
        .sort((a, b) => b.creditsCharged - a.creditsCharged),
      apiKeys: [...apiKeysById.values()]
        .map(withErrorRate)
        .sort((a, b) => b.creditsCharged - a.creditsCharged),
      models,
      daily: [...dailyByDate.values()].sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
      monthly: [...monthlyByDate.values()].sort((a, b) =>
        a.month.localeCompare(b.month),
      ),
    };
  }

  /**
   * Lists recent model calls made by this project API keys.
   */
  async listProjectApiKeyLogs(
    orgId: string,
    projectId: string,
    limit = 50,
  ): Promise<ModelLog[]> {
    await this.getProject(orgId, projectId);

    return this.modelLogRepository.find({
      where: { orgId, projectId },
      relations: ['model', 'orgApiKey'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
