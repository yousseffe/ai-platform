import { User } from "../user";
import { DeploymentStatus, VersionStatus, VersionReviewStatus, PredictionStatus, ModelType, Framework } from "../enums";

export interface Deployment {
  id: string;
  containerId?: string;
  url?: string;
  port?: number;
  status: DeploymentStatus;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ModelVersion {
  id: string;
  versionNumber: number;
  status: VersionStatus;
  reviewStatus?: VersionReviewStatus;
  uploadedBy?: User | null;
  reviewedBy?: User | null;
  reviewComment?: string | null;
  reviewedAt?: string | null;
  modelFilePath: string;
  scalerFilePath?: string;
  preprocessFilePath?: string;
  postprocessFilePath?: string;
  examplePayload?: string;
  expectedResult?: string;
  errorMessage?: string;
  buildProgress?: number;
  buildLogs?: string;
  deployments?: Deployment[];
  testCases?: ModelVersionTestCase[];
  createdAt: string;
  updatedAt: string;
}

export interface ModelVersionTestCase {
  id: string;
  name: string;
  payload: string;
  expectedResult?: string | null;
  notes?: string | null;
  createdBy?: User | null;
  createdAt: string;
}

export interface ModelVersionReviewEvent {
  id: string;
  action: string;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
  actor?: User | null;
  version?: Pick<ModelVersion, "id" | "versionNumber" | "status" | "reviewStatus"> | null;
  createdAt: string;
}

export interface Model {
  id: string;
  name: string;
  description?: string;
  user?: User;
  organization?: {
    id: string;
    name: string;
    slug: string;
    type: string;
    avatarUrl?: string | null;
  } | null;
  versions?: ModelVersion[];
  tier?: string;
  costPerRequest?: number;
  providerSharePercent?: number;
  hasCustomPricing?: boolean;
  totalEarnings?: number;
  uniqueUsersCount?: number;
  isPublic?: boolean;
  marketplaceVerified?: boolean;
  type?: ModelType;
  framework?: Framework;
  taskType?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HistoryItem {
  time: string;
  reqId: string;
  status: PredictionStatus;
  latency: string;
  outcome: string;
  payload: string;
  response: string;
  confidence?: string;
  memory?: string;
}

/**
 * A single model document returned from the OpenSearch search index.
 */
export interface SearchModelHit {
  id: string;
  name: string;
  description: string;
  type: string;
  taskType: string;
  framework: string;
  isPublic: boolean;
  marketplaceVerified?: boolean;
  organizationName?: string | null;
  publisherEmail: string;
  versionCount: number;
  hasLiveDeployment: boolean;
  createdAt: string;
}

/**
 * A single aggregation bucket returned by OpenSearch faceted search.
 */
export interface FacetBucket {
  key: string;
  doc_count: number;
}

/**
 * The full response shape returned by the backend search endpoint.
 */
export interface SearchResult {
  hits: SearchModelHit[];
  total: number;
  page: number;
  limit: number;
  facets: {
    types: FacetBucket[];
    frameworks: FacetBucket[];
    taskTypes: FacetBucket[];
  };
}

/**
 * Parameters accepted by the search service and action.
 */
export interface SearchParams {
  q?: string;
  type?: string;
  framework?: string;
  taskType?: string;
  page?: number;
  limit?: number;
}

export interface ModelLog {
  id: string;
  model: Model;
  apiKey: string | null;
  responseTimeMs: number;
  status: string;
  statusCode: number;
  createdAt: string;
}
