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
  ): Promise<OrgApiKey & { rawKey: string }> {
    await this.getProject(orgId, projectId);
    if (!label?.trim()) {
      throw new BadRequestException('API key label is required');
    }

    const rawKey = `sk_live_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = `${rawKey.slice(0, 14)}...${rawKey.slice(-4)}`;

    const apiKey = this.apiKeyRepository.create({
      projectId,
      orgId,
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
      .map(({ totalLatencyMs: _totalLatencyMs, ...model }) => model);

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
