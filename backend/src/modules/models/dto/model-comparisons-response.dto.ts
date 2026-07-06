export class ComparableModelResponseDto {
  id!: string;
  name!: string;
  providerName!: string;
  category!: string;
  taskType!: string;
  framework!: string;
  modality!: string;
  priceCredits!: number;
  status!: 'RUNNING' | 'INACTIVE';
  popularity!: number;
  averageRating!: number;
  reviewCount!: number;
  versionLabel!: string | null;
}

export class ComparisonResultResponseDto {
  id!: string;
  modelId!: string | null;
  modelName!: string;
  providerName!: string | null;
  modelType!: string | null;
  taskType!: string | null;
  framework!: string | null;
  modality!: string | null;
  modelVersion!: string | null;
  responseOutput!: string | null;
  responseJson!: Record<string, unknown> | null;
  latencyMs!: number | null;
  costCredits!: number;
  inputTokens!: number | null;
  outputTokens!: number | null;
  totalTokens!: number | null;
  status!: string;
  statusCode!: number | null;
  errorMessage!: string | null;
  qualityScore!: number | null;
  valueScore!: number | null;
  resultRank!: number | null;
  createdAt!: Date;
}

export class ComparisonSummaryInsightsDto {
  fastestModelId!: string | null;
  fastestModelName!: string | null;
  cheapestModelId!: string | null;
  cheapestModelName!: string | null;
  bestValueModelId!: string | null;
  bestValueModelName!: string | null;
  lowestErrorModelId!: string | null;
  lowestErrorModelName!: string | null;
  recommendedModelId!: string | null;
  recommendedModelName!: string | null;
}

export class ComparisonSessionResponseDto {
  id!: string;
  title!: string | null;
  inputPrompt!: string;
  requestPayload!: Record<string, unknown>;
  settings!: Record<string, unknown> | null;
  status!: string;
  modelCount!: number;
  summaryInsights!: ComparisonSummaryInsightsDto | null;
  rerunOfSessionId!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
  results!: ComparisonResultResponseDto[];
}

export class ComparisonHistoryItemResponseDto {
  id!: string;
  title!: string | null;
  inputPrompt!: string;
  modelCount!: number;
  status!: string;
  createdAt!: Date;
  updatedAt!: Date;
  summaryInsights!: ComparisonSummaryInsightsDto | null;
  resultsCount!: number;
}
