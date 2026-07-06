import { User } from "../user";
import {
  DeploymentStatus,
  VersionStatus,
  VersionReviewStatus,
  SchemaDetectionStatus,
  PredictionStatus,
  ModelType,
  Framework,
} from "../enums";

export type FirewallMode = "MONITOR" | "ENFORCE";

export interface FirewallPolicy {
  id: string;
  scopeType: "MODEL" | "ORG";
  scopeId: string;
  enforcementMode: FirewallMode;
  ipAllowlist: string[] | null;
  ipDenylist: string[] | null;
  blockOnRiskScoreThreshold: number | null;
  blockOnInjection: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Deployment {
  id: string;
  containerId?: string;
  url?: string;
  port?: number;
  status: DeploymentStatus;
  errorMessage?: string;
  trafficWeight?: number;
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
  schemaDetectionStatus?: SchemaDetectionStatus;
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
  version?: Pick<
    ModelVersion,
    "id" | "versionNumber" | "status" | "reviewStatus"
  > | null;
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
  cacheEnabled?: boolean;
  cacheTtlSeconds?: number;
  cacheHitDiscountPercent?: number;
  allowEgress?: boolean;
  totalEarnings?: number;
  uniqueUsersCount?: number;
  isPublic?: boolean;
  marketplaceVerified?: boolean;
  type?: ModelType;
  framework?: Framework;
  taskType?: string;
  averageRating?: number;
  reviewCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ModelIntegrationSpec {
  model: {
    id: string;
    name: string;
    type: string;
    framework: string;
    taskType: string;
    description: string | null;
    isPublic: boolean;
    averageRating: number;
    reviewCount: number;
  };
  endpoint: {
    method: "POST";
    url: string;
    apiStyle: "openai-chat" | "json-predict";
  };
  authentication: {
    type: "bearer";
    headerFormat: string;
    keyPrefix: string;
    note: string;
  };
  request: {
    contentType: "application/json";
    example: unknown | null;
    exampleRaw: string | null;
  };
  response: {
    contentType: "application/json";
    example: unknown | null;
    exampleRaw: string | null;
  };
  classLabels: Record<string, unknown> | null;
  pricing: {
    billingUnit: string;
    currency: "CREDITS";
    inputCreditsPerMToken?: number;
    outputCreditsPerMToken?: number;
    creditsPerRequest?: number;
    note: string;
  };
  notes: string[];
  openapi: Record<string, unknown>;
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
  averageRating?: number;
  reviewCount?: number;
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
  creditsCharged?: number;
  responseTimeMs: number;
  status: string;
  statusCode: number;
  errorMessage?: string | null;
  createdAt: string;
}

export interface ProviderInsightsSummary {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  grossCredits: number;
  estimatedRevenueEgp: number;
  averageLatencyMs: number;
  successRate: number;
  averageRevenuePerRequestEgp: number;
  activeModels: number;
  activeTypes: number;
  activeTaskTypes: number;
}

export interface ProviderInsightsWindow {
  revenueEgp: number;
  requests: number;
  successRate: number;
}

export interface ProviderInsightsSeriesPoint {
  date: string;
  requests: number;
  successes: number;
  failures: number;
  grossCredits: number;
  revenueEgp: number;
  successRate: number;
}

export interface ProviderInsightsTopModel {
  modelId: string;
  modelName: string;
  type: string;
  taskType: string;
  framework: string;
  requests: number;
  successes: number;
  failures: number;
  grossCredits: number;
  revenueEgp: number;
  avgLatencyMs: number;
  successRate: number;
}

export interface ProviderInsightsBreakdown {
  requests: number;
  successes: number;
  failures: number;
  grossCredits: number;
  revenueEgp: number;
  successRate: number;
}

export interface ProviderInsights {
  generatedAt: string;
  periodDays: number;
  creditsPerEgp: number;
  summary: ProviderInsightsSummary;
  comparison: {
    current: ProviderInsightsWindow;
    previous: ProviderInsightsWindow;
    revenueDeltaPercent: number;
    requestsDeltaPercent: number;
    successRateDeltaPercent: number;
  };
  series: ProviderInsightsSeriesPoint[];
  topModels: ProviderInsightsTopModel[];
  typeBreakdown: Array<ProviderInsightsBreakdown & { type: string }>;
  taskBreakdown: Array<ProviderInsightsBreakdown & { taskType: string }>;
}

export interface ComparableModel {
  id: string;
  name: string;
  providerName: string;
  category: string;
  taskType: string;
  framework: string;
  modality: string;
  priceCredits: number;
  status: "RUNNING" | "INACTIVE";
  popularity: number;
  averageRating: number;
  reviewCount: number;
  versionLabel: string | null;
}

export interface ComparisonSettings {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
  jsonMode?: boolean;
}

export interface ModelComparisonResult {
  id: string;
  modelId: string | null;
  modelName: string;
  providerName: string | null;
  modelType: string | null;
  taskType: string | null;
  framework: string | null;
  modality: string | null;
  modelVersion: string | null;
  responseOutput: string | null;
  responseJson: Record<string, unknown> | null;
  latencyMs: number | null;
  costCredits: number;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  status: string;
  statusCode: number | null;
  errorMessage: string | null;
  qualityScore: number | null;
  valueScore: number | null;
  resultRank: number | null;
  createdAt: string;
}

export interface ModelComparisonSummaryInsights {
  fastestModelId: string | null;
  fastestModelName: string | null;
  cheapestModelId: string | null;
  cheapestModelName: string | null;
  bestValueModelId: string | null;
  bestValueModelName: string | null;
  lowestErrorModelId: string | null;
  lowestErrorModelName: string | null;
  recommendedModelId: string | null;
  recommendedModelName: string | null;
}

export interface ModelComparisonSession {
  id: string;
  title: string | null;
  inputPrompt: string;
  requestPayload: Record<string, unknown>;
  settings: Record<string, unknown> | null;
  status: string;
  modelCount: number;
  summaryInsights: ModelComparisonSummaryInsights | null;
  rerunOfSessionId: string | null;
  createdAt: string;
  updatedAt: string;
  results: ModelComparisonResult[];
}

export interface ModelComparisonHistoryItem {
  id: string;
  title: string | null;
  inputPrompt: string;
  modelCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  summaryInsights: ModelComparisonSummaryInsights | null;
  resultsCount: number;
}
