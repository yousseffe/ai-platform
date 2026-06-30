import { smartFetch } from "@/lib/utils/smart-fetch";

/** Project entity as returned by the API. */
export interface Project {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** API key entity as returned (keyHash is never exposed). */
export interface OrgApiKey {
  id: string;
  projectId: string;
  orgId: string;
  model?: {
    id: string;
    name: string;
    type?: string;
    framework?: string;
  } | null;
  keyPrefix: string;
  label: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

/** Returned once at creation time — includes the full raw key. */
export interface CreatedApiKey extends OrgApiKey {
  /** Full raw key — only returned once at creation. Copy it immediately. */
  rawKey: string;
}

export interface ProjectApiKeyUsage {
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
    lastUsedAt: string | null;
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
}

export interface ProjectApiKeyLog {
  id: string;
  model?: {
    id: string;
    name: string;
  };
  apiKey: string | null;
  apiKeyLabel: string | null;
  apiKeyPrefix: string | null;
  creditsCharged: number;
  responseTimeMs: number;
  status: string;
  statusCode: number;
  createdAt: string;
}

export interface OrganizationUsageSummary {
  scope: "FULL" | "OPERATIONAL" | "LIMITED";
  totals: {
    requests: number;
    successfulRequests: number;
    failedRequests: number;
    creditsCharged: number;
    errorRate: number;
    lastUsedAt: string | null;
  };
  projects: Array<{
    id: string;
    name: string;
    requests: number;
    successfulRequests: number;
    failedRequests: number;
    creditsCharged: number;
    errorRate: number;
    lastUsedAt: string | null;
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
    lastUsedAt: string | null;
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
    lastUsedAt: string | null;
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
}

/**
 * Fetches all active projects for an organization.
 *
 * @param orgId - UUID of the organization.
 * @returns Array of Project entities.
 */
export async function listProjects(orgId: string): Promise<Project[]> {
  return smartFetch<Project[]>(`/organizations/${orgId}/projects`);
}

/**
 * Fetches organization-wide consumer usage analytics.
 *
 * @param orgId - UUID of the organization.
 * @returns Aggregated usage summary.
 */
export async function getOrganizationUsageSummary(
  orgId: string,
): Promise<OrganizationUsageSummary> {
  return smartFetch<OrganizationUsageSummary>(
    `/organizations/${orgId}/projects/usage/summary`,
  );
}

/**
 * Creates a new project under the organization.
 *
 * @param orgId - UUID of the organization.
 * @param name - Display name.
 * @param description - Optional description.
 * @returns The created Project entity.
 */
export async function createProject(
  orgId: string,
  name: string,
  description?: string,
): Promise<Project> {
  return smartFetch<Project>(`/organizations/${orgId}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description }),
  });
}

/**
 * Fetches a single project by ID.
 *
 * @param orgId - UUID of the organization.
 * @param projectId - UUID of the project.
 * @returns The Project entity.
 */
export async function getProject(
  orgId: string,
  projectId: string,
): Promise<Project> {
  return smartFetch<Project>(`/organizations/${orgId}/projects/${projectId}`);
}

/**
 * Soft-deletes a project and revokes all its API keys.
 *
 * @param orgId - UUID of the organization.
 * @param projectId - UUID of the project.
 * @returns Confirmation message.
 */
export async function deleteProject(
  orgId: string,
  projectId: string,
): Promise<{ message: string }> {
  return smartFetch<{ message: string }>(
    `/organizations/${orgId}/projects/${projectId}`,
    { method: "DELETE" },
  );
}

/**
 * Generates a new API key for a project.
 * The `rawKey` in the response is the full key — returned ONCE only.
 *
 * @param orgId - UUID of the organization.
 * @param projectId - UUID of the project.
 * @param label - Human-readable label.
 * @returns The created API key including the one-time rawKey.
 */
export async function createApiKey(
  orgId: string,
  projectId: string,
  label: string,
  modelId: string,
): Promise<CreatedApiKey> {
  return smartFetch<CreatedApiKey>(
    `/organizations/${orgId}/projects/${projectId}/api-keys`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, modelId }),
    },
  );
}

/**
 * Lists all active API keys for a project (masked prefix only, no raw key).
 *
 * @param orgId - UUID of the organization.
 * @param projectId - UUID of the project.
 * @returns Array of OrgApiKey entities.
 */
export async function listApiKeys(
  orgId: string,
  projectId: string,
): Promise<OrgApiKey[]> {
  return smartFetch<OrgApiKey[]>(
    `/organizations/${orgId}/projects/${projectId}/api-keys`,
  );
}

/**
 * Revokes an API key, preventing future use.
 *
 * @param orgId - UUID of the organization.
 * @param projectId - UUID of the project.
 * @param keyId - UUID of the API key.
 * @returns Confirmation message.
 */
export async function revokeApiKey(
  orgId: string,
  projectId: string,
  keyId: string,
): Promise<{ message: string }> {
  return smartFetch<{ message: string }>(
    `/organizations/${orgId}/projects/${projectId}/api-keys/${keyId}`,
    { method: "DELETE" },
  );
}

/**
 * Fetches usage analytics for project-scoped organization API keys.
 *
 * @param orgId - UUID of the organization.
 * @param projectId - UUID of the project.
 * @returns Aggregated usage grouped by API key and model.
 */
export async function getProjectApiKeyUsage(
  orgId: string,
  projectId: string,
): Promise<ProjectApiKeyUsage> {
  return smartFetch<ProjectApiKeyUsage>(
    `/organizations/${orgId}/projects/${projectId}/api-keys/usage`,
  );
}

/**
 * Fetches recent model calls made with this project's API keys.
 *
 * @param orgId - UUID of the organization.
 * @param projectId - UUID of the project.
 * @returns Recent model execution logs for the project.
 */
export async function listProjectApiKeyLogs(
  orgId: string,
  projectId: string,
): Promise<ProjectApiKeyLog[]> {
  return smartFetch<ProjectApiKeyLog[]>(
    `/organizations/${orgId}/projects/${projectId}/api-keys/logs`,
  );
}
